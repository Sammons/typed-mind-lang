// Ladder rung: sammons/slat-harness (RFC-TM-9 §8 X-LADDER-2).
//
// Fixtures 67, 68, 69 — originally three adjudicated gaps left UNFIXED,
// each PINNED with a positive assertion that the defect was still present
// (harness convention, q3-language-adoption.test.ts:153) so the day someone
// fixed it this suite would fail loudly and the expectation would be
// re-baselined deliberately rather than drifting.
//
// 67 and 69 have now been re-baselined: the pins fired exactly as designed
// (three assertions failed the moment the fix landed) and are replaced below
// by fail-before/pass-after regressions asserting the FIXED behavior. The
// fix is a single shape rule in the extractor plus one checker-table
// widening:
//
//   - `convertInterface` (typescript-to-typedmind-converter.ts) routes an
//     interface whose RESOLVED HERITAGE CHAIN carries >=1 `ts.MethodSignature`
//     to `convertInterfaceToClass` (a ClassNode with `methods: [...]`); a
//     property-only interface still converts to a DTO. This closes 69: the
//     method survives instead of being silently dropped, because
//     `ClassNode.methods` is the language's only method surface
//     (check-method-calls.ts:36).
//   - `VALID_REFERENCES.extends`/`.implements` (valid-references.ts) now
//     accept a DTO target. This closes 67: a class implementing a
//     data-shaped interface is a legal source shape, and the interface is
//     correctly a DTO, so the pair had to become satisfiable on the checker
//     side. Both slots widen because shortform collapses them into one `<:`
//     list (emit-shortform.ts `inheritanceSuffix`).
//
// RFC-TM-13 G now closes68 with declared parameters and lexical binding;
// its controls retain the exact source declarations and remove a binding
// to restore the original undefined-field diagnostic.
//
// The PR #162 review added two more suites, both enforcing the same standard
// fixture 69's header sets — nothing this converter drops may drop silently:
//
//   - 69b (`69b-interface-heritage-shape`): the shape decision walks the
//     heritage chain. A child extending a method-bearing parent takes the
//     Class lane and keeps its `<: Parent` edge, rather than emitting a
//     fieldless DTO with the inherited contract unreachable. Mixed
//     interfaces warn about every dropped property.
//   - 69c (`69c-interface-unresolved-heritage`): a parent the program cannot
//     resolve falls back to the own-member rule AND warns, so the fallback is
//     conservative but never silent.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ClassNode, DtoNode, printHeritage, SyntaxEmitter, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');

const convert = (fixture: string) => {
  const fixtureDir = join(reprosDir, fixture);
  const analyzer = new TypeScriptAnalyzer(fixtureDir);
  const analysis = analyzer.analyzeFromEntrypoint(join(fixtureDir, 'src', 'index.ts'));
  const converter = new TypeScriptToTypedMindConverter();
  return converter.convert(analysis);
};

const diagnose = async (entities: readonly unknown[]) => {
  const emitter = new SyntaxEmitter();
  const longform = emitter.emitLongform({
    entities: entities as never,
    imports: [],
    suppressions: [],
    diagnostics: [],
  });
  const tm = await TypedMind.create();
  return tm.check(longform).diagnostics;
};

describe('slat-harness rung, FIXED GAP 67: a class may implement a data-shaped interface', () => {
  it('the converter puts the target in the implements slot, NOT extends (the extractor is correct)', () => {
    const result = convert('67-implements-data-interface');
    assert.equal(result.success, true);
    const noopSpan = result.entities.find((e) => e.name === 'NoopSpan') as { extends?: string; implements?: readonly string[] } | undefined;
    assert.notEqual(noopSpan, undefined, 'NoopSpan must be extracted');
    assert.equal(noopSpan?.extends, undefined, 'the extractor must not misuse the extends slot');
    assert.deepEqual(noopSpan?.implements, ['Span']);
  });

  it('Span stays classified DTO because it is data-shaped (property-only, zero methods)', () => {
    const result = convert('67-implements-data-interface');
    const span = result.entities.find((e) => e.name === 'Span');
    // This is the load-bearing half of the fix's shape rule: the NEW Class
    // lane is for METHOD-BEARING interfaces only. `Span` has two properties
    // and no methods, so it must NOT be swept into the Class lane — doing so
    // would strip its fields (ClassNode has no field surface at all) and
    // trade gap 67 for silent data loss.
    assert.equal(span?.kind, 'DTO');
  });

  it('FIXED — the checker accepts implements-to-DTO (was: Cannot use implements to reference DTO)', async () => {
    const result = convert('67-implements-data-interface');
    const diagnostics = await diagnose(result.entities);
    // The exact finding the gap pin used to assert was PRESENT.
    const illegalImplements = diagnostics.filter((d) => /Cannot use '(implements|extends)' to reference DTO 'Span'/.test(d.message));
    assert.deepEqual(
      illegalImplements,
      [],
      `implementing a data-shaped interface must now resolve; got: ${JSON.stringify(diagnostics.map((d) => d.message))}`,
    );
  });

  it('FIXED — the whole fixture checks clean end to end', async () => {
    const result = convert('67-implements-data-interface');
    const diagnostics = await diagnose(result.entities);
    assert.deepEqual(
      diagnostics.map((d) => d.message),
      [],
      'fixture 67 must produce zero diagnostics',
    );
  });

  it('the widening does NOT open the inherit slots to a non-data kind (Function stays illegal)', async () => {
    // Guards the blast radius of the VALID_REFERENCES change: `to` gained
    // exactly 'DTO', the second of the two kinds a TS interface converts to.
    // A Function target must still be rejected, or the widening would have
    // deleted the rule instead of correcting it.
    const source = ['Widget <: helper', '  => [run]', '', 'helper :: helper() => void', ''].join('\n');
    const typedMind = await TypedMind.create();
    const findings = typedMind.check(source).diagnostics;
    const illegal = findings.find((d) => /Cannot use 'extends' to reference Function 'helper'/.test(d.message));
    assert.notEqual(illegal, undefined, `extends-to-Function must stay illegal; got: ${JSON.stringify(findings.map((d) => d.message))}`);
  });
});

describe('slat-harness rung, FIXED GAP 68: generic interface and alias parameters bind their fields', () => {
  it('G.5 retains the interface binding and removing it restores only the undefined field type', async () => {
    const result = convert('68-generic-type-parameters');
    assert.deepEqual(await diagnose(result.entities), []);
    const envelope = result.entities.find((entity) => entity.name === 'HalEnvelope');
    assert.ok(envelope instanceof DtoNode);
    assert.deepEqual(
      envelope.typeParameters?.map((parameter) => parameter.name),
      ['T'],
    );
    const removed = result.entities.map((entity) =>
      entity === envelope ? new DtoNode({ ...envelope, typeParameters: undefined }) : entity,
    );
    assert.deepEqual(
      (await diagnose(removed)).map(({ code, message }) => ({ code, message })),
      [{ code: 'checker/dto-field-unknown-type', message: "DTO 'HalEnvelope' field 'data' references undefined type 'T'" }],
    );
  });

  it('G.5 preserves both type-alias bindings without synthesizing global A or B entities', async () => {
    const result = convert('68-generic-type-parameters');
    const pair = result.entities.find((entity) => entity.name === 'Pair');
    assert.ok(pair instanceof DtoNode);
    assert.deepEqual(
      pair.typeParameters?.map((parameter) => parameter.name),
      ['A', 'B'],
    );
    assert.deepEqual(await diagnose(result.entities), []);
    assert.equal(
      result.entities.some((entity) => ['A', 'B'].includes(entity.name)),
      false,
    );
  });
});

describe('slat-harness rung, FIXED GAP 69: a method-bearing interface extracts as a Class and its methods survive', () => {
  it('FIXED — Repository is a Class carrying its method (was: a DTO with the method dropped)', () => {
    const result = convert('69-interface-method-dropped');
    assert.equal(result.success, true);
    const repository = result.entities.find((e) => e.name === 'Repository') as
      | { kind?: string; methods?: readonly string[]; implements?: readonly string[]; extends?: string }
      | undefined;
    assert.notEqual(repository, undefined, 'Repository must be extracted');
    assert.equal(repository?.kind, 'Class');
    // The exact member the gap pin used to assert was MISSING.
    assert.deepEqual(repository?.methods, ['save'], 'the `save` method must survive extraction');
    // An interface has no TS `implements` clause and this one extends
    // nothing, so both inherit slots stay empty.
    assert.deepEqual(repository?.implements, []);
    assert.equal(repository?.extends, undefined);
  });

  it('the emitted .tmd carries the typed method, so the contract is visible in the DSL', () => {
    const result = convert('69-interface-method-dropped');
    assert.match(result.tmdContent, /class Repository \{\n {2}type: Class\n {2}method: "save\(row: string\) => void"\n\}/);
  });

  it('FIXED — and the fixture still checks clean, now for the right reason', async () => {
    const result = convert('69-interface-method-dropped');
    const diagnostics = await diagnose(result.entities);
    // This assertion is textually identical to the old gap pin, but its
    // MEANING inverted. Before: clean because the method vanished with zero
    // diagnostic (silent data loss — "the severe one"). Now: clean because
    // the method is modeled on the only entity kind that can hold it. The
    // assertion above is what distinguishes the two, which is why both are
    // kept.
    assert.deepEqual(
      diagnostics.map((d) => d.message),
      [],
      'fixture 69 must produce zero diagnostics',
    );
  });

  it('a PROPERTY-ONLY interface is untouched by the shape rule and stays a DTO', () => {
    // The negative half of the classification, asserted on the fixture whose
    // interface has zero methods. Without this, a regression that swept every
    // interface into the Class lane would still pass the checks above.
    const result = convert('67-implements-data-interface');
    const span = result.entities.find((e) => e.name === 'Span') as { kind?: string; fields?: readonly { name: string }[] } | undefined;
    assert.equal(span?.kind, 'DTO');
    assert.deepEqual(
      (span?.fields ?? []).map((f) => f.name),
      ['name', 'ended'],
    );
  });

  it('the dropped property is ANNOUNCED, not silent (PR #162 review blocker 1)', () => {
    // `Repository` is mixed: `id: string` plus `save(row): void`. The Class
    // lane has no field surface, so `id` is dropped — and fixture 69's own
    // header names silent loss as the most severe finding on this rung, so
    // the fix must not reintroduce it pointed the other way.
    const result = convert('69-interface-method-dropped');
    const propertyLoss = result.warnings.filter((warning) => /Interface 'Repository'/.test(warning.message));
    assert.equal(propertyLoss.length, 1, `expected exactly one property-loss warning; got ${JSON.stringify(result.warnings)}`);
    assert.equal(
      propertyLoss[0]?.message,
      "Interface 'Repository' declares methods, so it converts to a Class; a Class has no field surface, so 1 property is dropped: id",
    );
    assert.match(propertyLoss[0]?.suggestion ?? '', /property-only interface/);
  });

  it('a PURE-METHOD interface loses nothing, so it warns about nothing', () => {
    // The negative half of blocker 1: the warning must be tied to actual
    // dropped properties, not fired on every Class-lane conversion.
    const result = convert('69b-interface-heritage-shape');
    const spurious = result.warnings.filter((warning) => /'(HasMethod|ChildOfMethodIface)'/.test(warning.message));
    assert.deepEqual(spurious, [], 'an interface with no properties must produce no property-loss warning');
  });

  it('a Class-kind interface is kept out of a Function input slot (input/output accept DTO only)', () => {
    // check-function-graph.ts requires `target.kind === 'DTO'` exactly, so
    // routing the now-Class `Repository` into `persist`'s `input` would emit
    // checker/input-not-dto + checker/reference-to-illegal. `isDTOLikeType`
    // excludes it, the same disclosed-loss trade D-LEG-1 already made for a
    // real `class` declaration: the type stays visible in the signature text,
    // only the machine-checked edge is dropped.
    const result = convert('69-interface-method-dropped');
    const persist = result.entities.find((e) => e.name === 'persist') as { input?: string; signature?: string } | undefined;
    assert.equal(persist?.input, undefined, 'a Class-kind target must not reach the input slot');
    assert.match(persist?.signature ?? '', /Repository/, 'the type stays visible in the signature text');
  });
});

// PR #162 review blocker 2 — the shape decision reads the RESOLVED HERITAGE
// CHAIN, not own members. Before this, `interface Child extends HasMethod {}`
// took the DTO lane and emitted a fieldless `Child %` with no `<: HasMethod`
// edge and no diagnostic: the inherited method contract was unreachable
// through the child, which is gap 69's own symptom one level up.
describe('slat-harness rung, 69b: the interface shape decision walks the heritage chain', () => {
  it('a child declaring NOTHING but extending a method-bearing parent takes the Class lane', () => {
    const result = convert('69b-interface-heritage-shape');
    assert.equal(result.success, true);
    const child = result.entities.find((e) => e.name === 'ChildOfMethodIface') as
      | { kind?: string; extends?: string; methods?: readonly string[] }
      | undefined;
    assert.notEqual(child, undefined, 'ChildOfMethodIface must be extracted');
    assert.equal(child?.kind, 'Class', 'an inherited method contract makes the child Class-like');
    // The edge itself is the other half of the blocker: the DTO lane reads
    // `iface.extends` nowhere, so on that lane the parent link vanished too.
    assert.equal(child?.extends, 'HasMethod', 'the inheritance edge must survive');
  });

  it('the parent is still its own Class carrying its method (control)', () => {
    const result = convert('69b-interface-heritage-shape');
    const parent = result.entities.find((e) => e.name === 'HasMethod') as { kind?: string; methods?: readonly string[] } | undefined;
    assert.equal(parent?.kind, 'Class');
    assert.deepEqual(parent?.methods, ['doIt']);
  });

  it('a child with OWN properties extending a method-bearing parent is Class-lane AND warns about the loss', () => {
    const result = convert('69b-interface-heritage-shape');
    const child = result.entities.find((e) => e.name === 'ChildWithOwnProps') as { kind?: string; extends?: string } | undefined;
    assert.equal(child?.kind, 'Class');
    assert.equal(child?.extends, 'HasMethod');
    const warning = result.warnings.find((w) => /Interface 'ChildWithOwnProps'/.test(w.message));
    assert.notEqual(warning, undefined, `expected a property-loss warning; got ${JSON.stringify(result.warnings)}`);
    // "inherits" not "declares": this interface's own declaration contains no
    // method, so a message claiming otherwise sends the reader hunting for a
    // member that is not there.
    assert.equal(
      warning?.message,
      "Interface 'ChildWithOwnProps' inherits methods from an interface it extends, so it converts to a Class; " +
        'a Class has no field surface, so 1 property is dropped: label',
    );
  });

  it('a property-only chain is untouched — both parent and child stay DTOs with their fields', () => {
    // The negative half. Without this, a regression that swept every
    // interface carrying a heritage clause onto the Class lane would still
    // pass every assertion above.
    const result = convert('69b-interface-heritage-shape');
    const parent = result.entities.find((e) => e.name === 'PropertyOnlyParent') as
      | { kind?: string; fields?: readonly { name: string }[] }
      | undefined;
    const child = result.entities.find((e) => e.name === 'ChildOfPropertyOnly') as
      | { kind?: string; fields?: readonly { name: string }[] }
      | undefined;
    assert.equal(parent?.kind, 'DTO');
    assert.deepEqual(
      (parent?.fields ?? []).map((f) => f.name),
      ['size'],
    );
    assert.equal(child?.kind, 'DTO');
    assert.deepEqual(
      (child?.fields ?? []).map((f) => f.name),
      ['color'],
    );
  });

  it('the whole heritage fixture checks clean', async () => {
    const result = convert('69b-interface-heritage-shape');
    const diagnostics = await diagnose(result.entities);
    assert.deepEqual(
      diagnostics.map((d) => d.message),
      [],
    );
  });
});

describe('slat-harness rung, 69c: an unresolvable parent falls back to own members AND warns', () => {
  it('G.5 retains the unresolved DTO base and reports exactly its missing declaration', async () => {
    const result = convert('69c-interface-unresolved-heritage');
    assert.deepEqual(
      (await diagnose(result.entities)).map(({ code, message }) => ({ code, message })),
      [{ code: 'checker/unknown-base-class', message: "DTO 'ExtendsUnknown' extends 'ExternalShape' which does not exist" }],
    );
  });

  it('the interface still converts, on the own-member rule', () => {
    // Conservative by design: an unresolvable parent must never flip a
    // property-only interface onto the Class lane, because that would strip
    // its fields on a guess. `ExtendsUnknown` has a property and no own
    // method, so it stays a DTO and keeps `id`.
    const result = convert('69c-interface-unresolved-heritage');
    assert.equal(result.success, true);
    const entity = result.entities.find((e) => e.name === 'ExtendsUnknown') as
      | { kind?: string; fields?: readonly { name: string }[] }
      | undefined;
    assert.equal(entity?.kind, 'DTO');
    assert.deepEqual(
      (entity?.fields ?? []).map((f) => f.name),
      ['id'],
    );
  });

  it('and the un-inspectable heritage is announced rather than assumed', () => {
    const result = convert('69c-interface-unresolved-heritage');
    const warning = result.warnings.find((w) => /could not be resolved in this program/.test(w.message));
    assert.notEqual(warning, undefined, `expected an unresolved-heritage warning; got ${JSON.stringify(result.warnings)}`);
    assert.equal(
      warning?.message,
      "Interface 'ExtendsUnknown' extends 'ExternalShape', which could not be resolved in this program, " +
        "so its members could not be inspected; 'ExtendsUnknown' was classified from its own members alone.",
    );
    assert.match(warning?.suggestion ?? '', /may be a DTO where a Class was intended/);
  });

  it('a fully-resolvable program emits no unresolved-heritage warning', () => {
    // Guards against the warning firing on every interface that merely has a
    // heritage clause — 69b's parents are all declared in-program.
    const result = convert('69b-interface-heritage-shape');
    const spurious = result.warnings.filter((w) => /could not be resolved in this program/.test(w.message));
    assert.deepEqual(spurious, [], 'resolvable parents must not warn');
  });
});

// PR #162 review, non-blocking finding — a GENERIC heritage target emits its
// argument list verbatim into the `<:` slot, producing `Unparsable text`.
//
// Pinned rather than "fixed" because the obvious repair (strip the arguments
// when emitting) is a change this repo has already rejected on purpose: it is
// PR #152's original bug, and `slat-harness-mixin-heritage-controls.test.ts`
// pins the verbatim recording as property 1 of the #152/#153 reconciliation,
// warning in its own comment that asserting zero diagnostics there "would
// pressure a future author to reintroduce the bug". Stripping on the interface
// lane alone would additionally make the two lanes diverge, which is the
// specific outcome the review asked to avoid.
//
// These assertions therefore pin the CURRENT behavior on BOTH lanes. If a
// future change teaches TypedMind to model a parameterized base (gap 68), this
// suite fails loudly and the expectation is re-baselined deliberately — the
// same gap-pin lifecycle fixtures 67 and 69 just went through.
describe('slat-harness rung, 69d: a generic heritage target behaves identically on both lanes', () => {
  it('the interface lane resolves the generic parent for the LOOKUP, so the child is Class-lane', () => {
    // `stripGenericArguments` is what makes `Repo<Item>` resolve to `Repo`,
    // so the shape decision sees the inherited `find`. Without it the child
    // would fall to the DTO lane and silently drop the contract.
    const result = convert('69d-generic-heritage-both-lanes');
    assert.equal(result.success, true);
    const child = result.entities.find((e) => e.name === 'GenericChild');
    assert.ok(child instanceof ClassNode && child.heritage.extends !== undefined);
    assert.equal(child?.kind, 'Class', 'a generic method-bearing parent must still make the child Class-like');
    assert.equal(printHeritage(child.heritage.extends), 'Repo<Item>', 'the emitted target keeps its type arguments verbatim (property 1)');
  });

  it('the real-class lane emits the SAME shape — the lanes agree, so this is not an interface-lane defect', () => {
    const result = convert('69d-generic-heritage-both-lanes');
    const derived = result.entities.find((e) => e.name === 'GenericDerived');
    assert.ok(derived instanceof ClassNode && derived.heritage.extends !== undefined);
    assert.equal(derived?.kind, 'Class');
    assert.equal(printHeritage(derived.heritage.extends), 'GenericBase<string>');
  });

  it('FIXED G.2 — full instantiated heritage checks clean in longform and shortform', async () => {
    const result = convert('69d-generic-heritage-both-lanes');
    assert.deepEqual(await diagnose(result.entities), []);
    const mind = await TypedMind.create();
    assert.deepEqual(mind.check(result.tmdContent).diagnostics, []);
    assert.match(result.tmdContent, /Repo<Item>/);
    assert.match(result.tmdContent, /GenericBase<string>/);
  });

  it('the generic child still warns about its own dropped property', () => {
    // The blocker-1 warning is orthogonal to the generic question and must
    // keep firing through it.
    const result = convert('69d-generic-heritage-both-lanes');
    const warning = result.warnings.find((w) => /Interface 'GenericChild'/.test(w.message));
    assert.equal(
      warning?.message,
      "Interface 'GenericChild' inherits methods from an interface it extends, so it converts to a Class; " +
        'a Class has no field surface, so 1 property is dropped: tag',
    );
  });
});
