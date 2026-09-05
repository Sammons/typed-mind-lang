import assert from 'node:assert/strict';
import { join } from 'node:path';
import { it } from 'node:test';
import { ClassNode } from '../ast/class-node.ts';
import { computeLinks } from '../pipeline/link-index.ts';
import { parseSignatureText } from '../pipeline/parse-signature-text.ts';
import { TypedMindParser } from '../pipeline/typed-mind-parser.ts';
import { CheckContext } from './check-context.ts';
import { checkInheritanceChains } from './check-cycles.ts';
import { checkDtoFieldTypes } from './check-dto-fields.ts';
import { checkGenericDeclarations } from './check-generic-declarations.ts';
import { checkOrphans } from './check-orphans.ts';
import { checkReferenceLegality } from './check-reference-legality.ts';

const inspect = async (source: string) => {
  const parser = await TypedMindParser.create({ wasmPath: join(import.meta.dirname, '../../grammar/grammar.wasm') });
  const outcome = parser.parse(source);
  assert.deepEqual(outcome.diagnostics, [], source);
  const context = new CheckContext({ entities: outcome.entities, links: computeLinks(outcome.entities), parseDiagnostics: [] });
  checkGenericDeclarations(context);
  checkDtoFieldTypes(context);
  checkOrphans(context);
  checkInheritanceChains(context);
  checkReferenceLegality(context);
  return context;
};
const orphans = (context: CheckContext) =>
  context.findings
    .filter((finding) => finding.code === 'checker/orphaned-entity')
    .map((finding) => finding.message)
    .sort();
const genericErrors = (context: CheckContext) => context.findings.filter((finding) => finding.code !== 'checker/orphaned-entity');

it('G.4 entity and nested callback binders shadow global types without consuming them', async () => {
  const context = await inspect(
    'T %\nU %\nConstraint %\nDefault %\nLeaf %\ndto Box {\n typeParameter: "T extends Constraint = Default"\n fields: {\n value: { type: "T" }\n callback: { type: "<U>(value: T, other: U) => Leaf" }\n }\n}\n',
  );
  assert.deepEqual(genericErrors(context), []);
  assert.deepEqual(orphans(context), ["Orphaned entity 'Box'", "Orphaned entity 'T'", "Orphaned entity 'U'"]);
  assert.deepEqual(context.links.referencedBy('T'), []);
  assert.deepEqual(context.links.referencedBy('U'), []);
  assert.deepEqual(
    context.links.referencedBy('Constraint').map((reference) => reference.from),
    ['Box'],
  );
  const removed = await inspect('Constraint %\nDefault %\nBox<T> %\n');
  assert.deepEqual(orphans(removed), ["Orphaned entity 'Box'", "Orphaned entity 'Constraint'", "Orphaned entity 'Default'"]);
});

it('G.4 generic arity resolves actual declarations and every omitted slot needs a default', async () => {
  const context = await inspect(
    'dto Pair {\n typeParameter: "T"\n typeParameter: "U = string"\n}\nUsage %\n - good: Pair<string>\n - full: Pair<string, number>\n - missing: Pair\n - extra: Pair<string, number, boolean>\n - builtin: Map<string, number>\n',
  );
  assert.deepEqual(
    genericErrors(context).map((finding) => finding.code),
    ['checker/generic-arity', 'checker/generic-arity'],
  );
  const nonTrailing = await inspect(
    'dto Mixed {\n typeParameter: "T = string"\n typeParameter: "U"\n}\nUsage %\n - missing: Mixed<string>\n',
  );
  assert.deepEqual(
    genericErrors(nonTrailing).map((finding) => finding.code),
    ['checker/generic-arity'],
  );
});

it('G.4 function declaration parameters are authoritative and full signature facts must agree', async () => {
  const context = await inspect(
    'T %\nConstraint %\nOther %\nfunction choose {\n typeParameter: "T extends Constraint"\n signature: "choose<T extends Other>(value: T) => T"\n}\n',
  );
  assert.deepEqual(
    genericErrors(context).map((finding) => finding.code),
    ['checker/conflicting-signature-type-parameters'],
  );
  assert.deepEqual(orphans(context), ["Orphaned entity 'Other'", "Orphaned entity 'T'", "Orphaned entity 'choose'"]);
  const agreement = await inspect(
    'Constraint %\nfunction choose {\n typeParameter: "T extends Constraint"\n signature: "choose<T extends Constraint>(value: T) => T"\n}\n',
  );
  assert.deepEqual(genericErrors(agreement), []);
  assert.equal(agreement.links.referencedBy('Constraint').length, 1);
});

it('G.4 instantiated heritage retains base roles, consumes arguments and checks DTO inheritance cycles', async () => {
  const context = await inspect('T %\nLeaf %\nBase<T> %\nContract<T> %\nChild<T> <: Base<T>, Contract<Leaf>\n');
  assert.deepEqual(genericErrors(context), []);
  assert.deepEqual(orphans(context), ["Orphaned entity 'Child'", "Orphaned entity 'T'"]);
  const cycle = await inspect('dto A {\n extends: "B"\n}\ndto B {\n extends: "A"\n}\n');
  assert.deepEqual(
    genericErrors(cycle).map((finding) => finding.code),
    ['checker/circular-inheritance'],
  );
  const illegal = await inspect('work :: work() => void\ndto A {\n extends: "work"\n}\n');
  assert.deepEqual(
    genericErrors(illegal).map((finding) => finding.code),
    ['checker/reference-to-illegal'],
  );
});

it('G.4 duplicate binders, unknown constraints and retained opaque bounds have explicit findings', async () => {
  const context = await inspect('dto A {\n typeParameter: "T extends Missing"\n typeParameter: "T = { field: Secret }"\n}\nSecret %\n');
  assert.deepEqual(
    genericErrors(context).map((finding) => finding.code),
    ['checker/duplicate-type-parameter', 'checker/generic-unknown-type', 'checker/unsupported-generic-type'],
  );
  assert.ok(orphans(context).includes("Orphaned entity 'Secret'"));
  const callable = await inspect('Input %\nOutput %\ndto A {\n typeParameter: "T extends (value: Input) => Output"\n}\n');
  assert.deepEqual(genericErrors(callable), []);
  assert.deepEqual(orphans(callable), ["Orphaned entity 'A'"]);
});

it('G.4 a local parameter colliding with an enum or Function remains local data', async () => {
  const context = await inspect(
    'T = enum [yes]\nFunction :: Function() => void\nBox<T, Function> %\n - mode: T | "no"\n - payload: Function\n',
  );
  assert.deepEqual(genericErrors(context), []);
  assert.deepEqual(orphans(context), ["Orphaned entity 'Box'", "Orphaned entity 'Function'", "Orphaned entity 'T'"]);
});

it('G.4 local heritage bases are rejected without borrowing global declarations', async () => {
  const context = await inspect('T %\nChild<T> <: T\n');
  assert.deepEqual(
    genericErrors(context).map((finding) => finding.code),
    ['checker/type-parameter-heritage-base'],
  );
  assert.deepEqual(orphans(context), ["Orphaned entity 'Child'", "Orphaned entity 'T'"]);
  assert.deepEqual(context.links.referencedBy('T'), []);
});

it('G.4 qualification and external heritage retain exact base identity without invented arity', async () => {
  const context = await inspect(
    'Owner @ owner.ts:\n -> [Owner.Base]\nOwner.Base<T> %\nLeaf %\nChild <: Owner.Base<Leaf>\nExternal ^ "library"\n -> [Contract]\nOther <: External.Contract<Leaf, Leaf>\n',
  );
  assert.deepEqual(genericErrors(context), []);
  assert.deepEqual(
    context.links.referencedBy('Owner.Base').map((reference) => reference.from),
    ['Owner', 'Child'],
  );
  assert.equal(context.links.referencedBy('Leaf').length, 2);
});

it('G.4/B3 typed nongeneric methods and constructors check types and bind local generics', async () => {
  const base = await inspect('T %\nU %\nInput %\nOutput %\nrun :: run() => void\nwork :: work() => void\n');
  const span = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };
  const typed = new ClassNode({
    name: 'Store',
    span,
    raw: '',
    sourceForm: 'longform',
    implements: [],
    members: {
      methods: [
        { name: 'run', signature: parseSignatureText('run<T>(input: T, callback: <U>(value: U) => Output) => Input'), span },
        { name: 'bad', signature: parseSignatureText('bad(value: Missing) => work'), span },
        { name: 'wrong', signature: parseSignatureText('Other.method(value: T) => U'), span },
      ],
      constructors: [{ signature: parseSignatureText('(input: Input)', { allowMissingReturnType: true }), span }],
    },
  });
  const entities = [...base.entities, typed];
  const context = new CheckContext({ entities, links: computeLinks(entities), parseDiagnostics: [] });
  checkGenericDeclarations(context);
  checkOrphans(context);
  assert.deepEqual(
    genericErrors(context).map((finding) => finding.code),
    ['checker/generic-unknown-type', 'checker/generic-non-data-type'],
  );
  assert.deepEqual(context.links.referencedBy('T'), []);
  assert.deepEqual(context.links.referencedBy('U'), []);
  assert.deepEqual(
    context.links.referencedBy('Input').map((reference) => reference.from),
    ['Store'],
  );
  assert.deepEqual(
    context.links.referencedBy('Output').map((reference) => reference.from),
    ['Store'],
  );
  assert.deepEqual(orphans(context), ["Orphaned entity 'Store'", "Orphaned entity 'T'", "Orphaned entity 'U'", "Orphaned entity 'run'"]);
});
