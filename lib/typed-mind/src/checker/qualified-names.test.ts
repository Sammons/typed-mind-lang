import assert from 'node:assert/strict';
import { join } from 'node:path';
import { before, it } from 'node:test';
import { DtoNode } from '../ast/dto-node.ts';
import { QualifiedNameResolver } from '../ast/qualified-name-resolver.ts';
import { SyntaxEmitter } from '../emitter/syntax-emitter.ts';
import { computeLinks } from '../pipeline/link-index.ts';
import { parseTypeExprText } from '../pipeline/type-expr-from-text.ts';
import { TypedMindParser } from '../pipeline/typed-mind-parser.ts';
import { AstValidator } from './ast-validator.ts';
import { CheckContext } from './check-context.ts';
import { checkOrphans } from './check-orphans.ts';

let parser: TypedMindParser;
before(async () => {
  parser = await TypedMindParser.create({ wasmPath: join(import.meta.dirname, '../../grammar/grammar.wasm') });
});
const parse = (source: string) => {
  const outcome = parser.parse(source);
  assert.deepEqual(outcome.diagnostics, [], source);
  return outcome;
};
const namesFor = (source: string) => {
  const outcome = parse(source);
  const byName = new Map(outcome.entities.map((entity) => [entity.name, entity]));
  return { outcome, byName, names: new QualifiedNameResolver(byName) };
};
const findingsFor = (source: string) => {
  const outcome = parse(source);
  return new AstValidator({ skipOrphanCheck: true }).validate(outcome, computeLinks(outcome.entities)).findings;
};

it('TM13 Q1: qualified names parse in every head and reference slot', () => {
  const source = [
    'File @ file.ts:',
    '  -> [File.run, File.Result, File.Service]',
    'File.run :: run(input: File.Result) => File.Result',
    '  <- File.Result',
    '  -> File.Result',
    'File.Result %',
    '  - nested: File.Box<File.Result>',
    'File.Service <:',
    '  => [run]',
    'File.Box %',
    '  - value: string',
    'File.Alias = string',
    'File.Config ! config.ts : File.Result',
    'File.Asset ~ "asset"',
    'File.Component & "component"',
    'File.Parameter $string "value"',
    'suppress File.Result checker/orphaned-entity "test"',
  ].join('\n');
  const outcome = parse(source);
  assert.ok(outcome.entities.some((entity) => entity.name === 'File.run'));
  assert.equal(outcome.suppressions[0]?.target, 'File.Result');
});

it('TM13 Q1: dotted generic readonly and source namespace trees retain meaning', () => {
  const source =
    'File @ file.ts:\nFile.Box %\n  - scalar: File.Result\n  - generic: File.Result<string>\n  - array: readonly File.Result[]\n  - namespace: ts.CompilerOptions\n';
  const outcome = parse(source);
  const dto = outcome.entities.find((entity) => entity instanceof DtoNode);
  assert.ok(dto instanceof DtoNode);
  assert.deepEqual(
    dto.fields.map((field) => field.typeExpr.kind),
    ['named', 'generic', 'array', 'named'],
  );
  for (const type of ['File.Result', 'File.Result<string>', 'readonly File.Result[]', 'ts.CompilerOptions']) {
    const parsed = parseTypeExprText(type);
    assert.equal(parsed.remainder, '');
    assert.notEqual(parsed.typeExpr.kind, 'opaque');
  }
});

it('TM13 Q1: qualified syntax preserves path property and legacy corpus precedence', () => {
  const source =
    'file File {\n  path: api.ts\n  exports: [File.Result]\n}\ndto File.Result {\n  fields: {\n    value: { type: "string" }\n  }\n}';
  const first = parse(source);
  const emitter = new SyntaxEmitter();
  const short = emitter.emitShortform(first);
  const second = parse(short);
  const third = parse(emitter.emitLongform(second));
  assert.deepEqual(
    first.entities.map((e) => [e.kind, e.name]),
    third.entities.map((e) => [e.kind, e.name]),
  );
  assert.match(short, /File @ api\.ts:/);
});

it('TM13 Q2: qualified ownership resolves exports methods and schema fields', () => {
  const { names } = namesFor(
    'File @ file.ts:\n  -> [Exported]\nExported %\nFile.Private %\nService <:\n  => [run]\nConfig ! config.ts : Shape\nShape %\n  - run: string\n',
  );
  assert.equal(names.target('File.Exported')?.name, 'Exported');
  assert.equal(names.target('File.Private')?.name, 'File.Private');
  assert.equal(names.resolve('Service.run').kind, 'member');
  assert.equal(names.resolve('Config.run').kind, 'member');
});

it('TM13 Q2: forged owner absent member and wrong kind remain errors', () => {
  const findings = findingsFor(
    'File @ file.ts:\nBox %\n  - owner: Missing.Type\n  - member: File.NoSuchType\nFile.run :: () => void\nBox2 %\n  - kind: File.run\n',
  );
  assert.equal(findings.filter((f) => f.code === 'checker/qualified-name-unresolved').length, 2);
  assert.ok(findings.some((f) => f.code === 'checker/dto-field-non-data-type'));
});

it('TM13 Q2: qualified class method resolves longest entity prefix', () => {
  const { names } = namesFor('File @ file.ts:\nFile.Service <:\n  => [run]\n');
  const result = names.resolve('File.Service.run');
  assert.equal(result.kind, 'member');
  assert.equal(names.target('File.Service.run')?.name, 'File.Service');
});

it('TM13 Q: private qualified declarations establish ownership without exports', () => {
  const { outcome, names } = namesFor(
    'Left @ left.ts:\nRight @ right.ts:\nLeft.Private %\nRight.Private %\nLeft.run :: (x: Left.Private) => Right.Private\n  <- Left.Private\n  -> Right.Private\n',
  );
  assert.equal(names.target('Left.Private')?.name, 'Left.Private');
  assert.equal(names.target('Right.Private')?.name, 'Right.Private');
  const context = new CheckContext({ entities: outcome.entities, links: computeLinks(outcome.entities), parseDiagnostics: [] });
  checkOrphans(context);
  assert.equal(
    context.findings.some((f) => f.message.includes("entity 'Left.Private'")),
    false,
  );
  assert.equal(
    context.findings.some((f) => f.message.includes("entity 'Right.Private'")),
    false,
  );
});

it('TM13 Q: exact qualified hits cannot bypass missing owner or member validation', () => {
  const findings = findingsFor('Missing.Value %\nValue %\nValue.Nested %\nFile @ file.ts:\n  -> [NoSuchEntity]\n');
  assert.equal(findings.filter((f) => f.code === 'checker/qualified-name-unresolved').length, 2);
  assert.ok(findings.some((f) => f.code === 'checker/undefined-export'));
});

it('TM13 Q: cross-file imports cannot expose a private qualified declaration', () => {
  const privateSource = 'Left @ left.ts:\nLeft.Private %\nRight @ right.ts:\n  <- [Left.Private]\n';
  assert.equal(findingsFor(privateSource).filter((f) => f.code === 'checker/qualified-name-unresolved').length, 1);
  const publicSource = privateSource.replace('Left @ left.ts:\n', 'Left @ left.ts:\n  -> [Left.Private]\n');
  assert.equal(findingsFor(publicSource).filter((f) => f.code === 'checker/qualified-name-unresolved').length, 0);
});

it('TM13 Q: explicit dependency namespaces validate exports', () => {
  const source = 'TypeScript ^ "typescript"\n  -> [CompilerOptions]\nConfig %\n  - value: TypeScript.CompilerOptions\n';
  assert.deepEqual(
    findingsFor(source).map((finding) => finding.code),
    ['checker/no-entry-point'],
  );
  assert.ok(findingsFor(source.replace('CompilerOptions]\n', 'Other]\n')).some((f) => f.code === 'checker/qualified-name-unresolved'));
  assert.ok(
    findingsFor(source.replace('TypeScript.CompilerOptions', 'ts.CompilerOptions')).some(
      (f) => f.code === 'checker/qualified-name-unresolved',
    ),
  );
});

it('TM13 Q: qualified navigation links and checker targets agree', () => {
  const { outcome, names } = namesFor(
    'File @ file.ts:\nFile.Service <:\n  => [run]\nFile.handler :: () => void\nCaller :: () => void\n  ~> [File.Service.run, File.handler]\n',
  );
  const links = computeLinks(outcome.entities);
  for (const target of ['File.Service.run', 'File.handler']) {
    const entity = names.target(target);
    assert.ok(entity);
    assert.ok(links.referencedBy(entity.name).some((ref) => ref.from === 'Caller'));
  }
});

it('TM13 Q: nested method imports enforce the qualified class exposure', () => {
  const { names } = namesFor('File @ file.ts:\nFile.Service <:\n  => [run]\n');
  const result = names.resolve('File.Service.run', { importingFile: 'Other' });
  assert.equal(result.kind, 'unresolved');
  if (result.kind === 'unresolved') assert.equal(result.reason, 'private-member');
  assert.equal(names.resolve('File.Service.run', { importingFile: 'File' }).kind, 'member');
});

it('TM13 Q: an explicit qualified entity wins over a same-spelling ClassFile method', () => {
  const { names } = namesFor('File #: file.ts\n  => [default]\nFile.default :: () => void\n');
  const result = names.resolve('File.default');
  assert.equal(result.kind, 'entity');
  assert.equal(names.target('File.default')?.name, 'File.default');
});

it('TM13 Q: suffix and full export spellings share a checked declaration target', () => {
  for (const exported of ['Private', 'File.Private']) {
    const source = `File @ file.ts:\n  -> [${exported}]\nFile.Private %\nOther @ other.ts:\n  <- [File.Private]\n`;
    const { names, outcome } = namesFor(source);
    const result = names.resolveExport('File', exported);
    assert.equal(result.kind, 'entity');
    if (result.kind === 'entity') assert.equal(result.entity.name, 'File.Private');
    assert.equal(
      findingsFor(source).some((f) => ['checker/undefined-export', 'checker/qualified-name-unresolved'].includes(f.code)),
      false,
    );
    assert.deepEqual(
      computeLinks(outcome.entities)
        .referencedBy('File.Private')
        .map((ref) => ref.from),
      ['File', 'Other'],
    );
  }
});

it('TM13 Q: qualified export aliases preserve inheritance cycle diagnostics', () => {
  const source = 'File @ file.ts:\n  -> [Base, Child]\nBase <: File.Child\nChild <: File.Base\n';
  const findings = findingsFor(source);
  assert.equal(
    findings.some((finding) => finding.code === 'checker/unknown-base-class'),
    false,
  );
  assert.equal(findings.filter((finding) => finding.code === 'checker/circular-inheritance').length, 1);
});

it('TM13 Q: cross-owner exports cannot publish a private declaration', () => {
  const source = 'Left @ left.ts:\nLeft.Private %\nRight @ right.ts:\n  -> [Left.Private]\n';
  assert.equal(findingsFor(source).filter((f) => f.code === 'checker/qualified-name-unresolved').length, 1);
});

it('TM13 Q: rejected private imports neither create links nor hide orphans', () => {
  const { outcome } = namesFor('File @ file.ts:\nFile.Private %\nOther @ other.ts:\n  <- [File.Private]\n');
  const links = computeLinks(outcome.entities);
  assert.deepEqual(links.referencedBy('File.Private'), []);
  const context = new CheckContext({ entities: outcome.entities, links, parseDiagnostics: [] });
  checkOrphans(context);
  assert.ok(context.findings.some((finding) => finding.code === 'checker/orphaned-entity' && finding.message.includes('File.Private')));
});

it('TM13 Q: suffix exports count real imports as file consumption', () => {
  const { outcome } = namesFor('File @ file.ts:\n  -> [Private]\nFile.Private %\nOther @ other.ts:\n  <- [File.Private]\n');
  const context = new CheckContext({ entities: outcome.entities, links: computeLinks(outcome.entities), parseDiagnostics: [] });
  checkOrphans(context);
  assert.equal(
    context.findings.some((finding) => finding.code === 'checker/orphaned-file' && finding.message.includes("'File'")),
    false,
  );
});

it('TM13 Q: verified ClassFile methods are callable without accepting bare ClassFile calls', () => {
  const source = 'Service #: service.ts\n  => [run]\nCaller :: () => void\n  ~> [Service.run]\n';
  assert.equal(
    findingsFor(source).some((finding) => finding.code === 'checker/reference-to-illegal'),
    false,
  );
  assert.ok(findingsFor(source.replace('Service.run]', 'Service]')).some((finding) => finding.code === 'checker/reference-to-illegal'));
  assert.ok(findingsFor(source.replace('Service.run]', 'Service.missing]')).some((finding) => finding.code === 'checker/unknown-method'));
});

it('TM13 Q: an exact nested declaration cannot use a shorter export owner to recurse', () => {
  const source = 'File @ file.ts:\n  -> [File.Missing.Member]\nFile.Missing.Member %\n';
  const { names } = namesFor(source);
  const result = names.resolve('File.Missing.Member');
  assert.equal(result.kind, 'unresolved');
  if (result.kind === 'unresolved') {
    assert.equal(result.ownerName, 'File.Missing');
    assert.equal(result.reason, 'missing-owner');
  }
  assert.ok(findingsFor(source).some((finding) => finding.code === 'checker/qualified-name-unresolved'));
});
