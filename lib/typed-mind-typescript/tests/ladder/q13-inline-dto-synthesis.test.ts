// RFC-TM-10 §5's tracked follow-up (issue #72) — inline object-literal
// function parameter/return types previously left `input`/`output`
// `undefined` (D-LEG-1's `isDTOLikeType` `{`-prefix exclusion, a disclosed
// loss the Diamond's §5 recorded and issue #72 tracked as future scope).
// This item replaces the exclusion with synthesis: `synthesizeInlineDTO`
// mirrors D-LEG-2's external-stub mechanism
// (`walkGenericArgsForExternalStubs`/`addExternalTypeToDepExports`) to give
// the inline type a real bare `entity_name` and real `DtoFieldNode`s.
//
// Fail-before / pass-after: before this item, every assertion below that
// checks `fn?.input`/`fn?.output` against a synthesized DTO name would see
// `undefined` instead (D-LEG-1's exclusion) — confirmed by stashing this
// item's converter changes, rebuilding, and observing the fixture's
// `input`/`output` fields read `undefined` with zero DTO entities named
// `*Input`/`*Output` in the entity list, then restoring and rebuilding to
// see all assertions below turn green.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { SyntaxEmitter, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');
const fixturePath = (name: string, ...segments: string[]): string => join(reprosDir, name, ...segments);
const fixtureDir = '35-inline-dto-synthesis';
const entrypoint = fixturePath(fixtureDir, 'src', 'main.ts');

type FunctionEntity = { kind: string; name: string; input: string | undefined; output: string | undefined; signature: string };
type DtoEntity = { kind: string; name: string; fields: readonly { name: string; type: string; optionalityMarker: string }[] };

const convert = () => {
  const analyzer = new TypeScriptAnalyzer(fixturePath(fixtureDir));
  const analysis = analyzer.analyzeFromEntrypoint(entrypoint);
  const converter = new TypeScriptToTypedMindConverter();
  const result = converter.convert(analysis);
  assert.equal(result.success, true);
  return result;
};

const findFunction = (entities: readonly unknown[], name: string) =>
  entities.find((e) => (e as { kind: string }).kind === 'Function' && (e as { name: string }).name === name) as FunctionEntity | undefined;

const findDTO = (entities: readonly unknown[], name: string) =>
  entities.find((e) => (e as { kind: string }).kind === 'DTO' && (e as { name: string }).name === name) as DtoEntity | undefined;

const checkViaLongform = async (entities: readonly unknown[]) => {
  const emitter = new SyntaxEmitter();
  const longform = emitter.emitLongform({ entities: entities as never, imports: [], suppressions: [], diagnostics: [] });
  const tm = await TypedMind.create();
  return { longform, result: tm.check(longform) };
};

describe('issue #72 check — synthesized inline-DTO for object-literal parameter types', () => {
  it('parameter position: a single-property inline object-literal parameter synthesizes <FunctionName>Input', () => {
    const result = convert();
    const fn = findFunction(result.entities, 'updateProfile');
    assert.notEqual(fn, undefined, 'the updateProfile function entity must exist');
    assert.equal(fn?.input, 'UpdateProfileInput', 'input must resolve to the synthesized DTO name');

    const dto = findDTO(result.entities, 'UpdateProfileInput');
    assert.notEqual(dto, undefined, 'the synthesized DTO entity must exist');
    assert.deepEqual(
      dto?.fields.map((f) => ({ name: f.name, type: f.type, optionalityMarker: f.optionalityMarker })),
      [
        { name: 'name', type: 'string', optionalityMarker: 'none' },
        { name: 'email', type: 'string', optionalityMarker: 'none' },
      ],
    );
  });
});

describe('issue #72 check — synthesized inline-DTO for object-literal return types', () => {
  it('return position: an inline object-literal return type synthesizes <FunctionName>Output', () => {
    const result = convert();
    const fn = findFunction(result.entities, 'lookupProfile');
    assert.notEqual(fn, undefined, 'the lookupProfile function entity must exist');
    assert.equal(fn?.output, 'LookupProfileOutput', 'output must resolve to the synthesized DTO name');

    const dto = findDTO(result.entities, 'LookupProfileOutput');
    assert.notEqual(dto, undefined, 'the synthesized DTO entity must exist');
    assert.deepEqual(
      dto?.fields.map((f) => ({ name: f.name, type: f.type, optionalityMarker: f.optionalityMarker })),
      [
        { name: 'name', type: 'string', optionalityMarker: 'none' },
        { name: 'email', type: 'string', optionalityMarker: 'none' },
      ],
    );
  });
});

describe('issue #72 check — optional fields', () => {
  it('a `?`-marked property carries optionalityMarker: question on the synthesized DTO field', () => {
    const result = convert();
    const fn = findFunction(result.entities, 'updateSettings');
    assert.notEqual(fn, undefined);
    assert.equal(fn?.input, 'UpdateSettingsInput');

    const dto = findDTO(result.entities, 'UpdateSettingsInput');
    assert.notEqual(dto, undefined);
    assert.deepEqual(
      dto?.fields.map((f) => ({ name: f.name, type: f.type, optionalityMarker: f.optionalityMarker })),
      [
        { name: 'theme', type: 'string', optionalityMarker: 'question' },
        { name: 'locale', type: 'string', optionalityMarker: 'question' },
      ],
    );
  });
});

describe('issue #72 check — both positions on the same function', () => {
  it('a function with an inline object-literal parameter AND return type gets two distinct synthesized DTOs', () => {
    const result = convert();
    const fn = findFunction(result.entities, 'transformRecord');
    assert.notEqual(fn, undefined);
    assert.equal(fn?.input, 'TransformRecordInput');
    assert.equal(fn?.output, 'TransformRecordOutput');
    assert.notEqual(fn?.input, fn?.output, 'input and output DTOs must be distinct entities, never one name serving both');

    assert.notEqual(findDTO(result.entities, 'TransformRecordInput'), undefined);
    assert.notEqual(findDTO(result.entities, 'TransformRecordOutput'), undefined);
  });
});

describe('issue #72 check — nesting', () => {
  it('a field whose own type is an inline object literal recurses into its own synthesized DTO, not an opaque leaf', () => {
    const result = convert();
    const fn = findFunction(result.entities, 'createOrder');
    assert.notEqual(fn, undefined);
    assert.equal(fn?.input, 'CreateOrderInput');

    const parentDto = findDTO(result.entities, 'CreateOrderInput');
    assert.notEqual(parentDto, undefined);
    const shippingField = parentDto?.fields.find((f) => f.name === 'shipping');
    assert.notEqual(shippingField, undefined, 'the shipping field must exist on the parent DTO');
    assert.equal(
      shippingField?.type,
      'CreateOrderInputShipping',
      'the nested inline object-literal field must reference a synthesized nested DTO by name, not stay opaque raw text',
    );

    const nestedDto = findDTO(result.entities, 'CreateOrderInputShipping');
    assert.notEqual(nestedDto, undefined, 'the nested DTO entity must exist as a first-class entity');
    assert.deepEqual(
      nestedDto?.fields.map((f) => ({ name: f.name, type: f.type, optionalityMarker: f.optionalityMarker })),
      [
        { name: 'street', type: 'string', optionalityMarker: 'none' },
        { name: 'city', type: 'string', optionalityMarker: 'none' },
      ],
    );
  });
});

describe('issue #72 check — collision of two identical-shaped inline types in one file', () => {
  it('two functions with identically-shaped inline object-literal parameters synthesize distinct DTOs, one per function', () => {
    const result = convert();
    const registerFn = findFunction(result.entities, 'registerUser');
    const inviteFn = findFunction(result.entities, 'inviteUser');
    assert.notEqual(registerFn, undefined);
    assert.notEqual(inviteFn, undefined);
    assert.equal(registerFn?.input, 'RegisterUserInput');
    assert.equal(inviteFn?.input, 'InviteUserInput');
    assert.notEqual(registerFn?.input, inviteFn?.input, 'identical field shape must not cause the two DTOs to merge or collide');

    const registerDto = findDTO(result.entities, 'RegisterUserInput');
    const inviteDto = findDTO(result.entities, 'InviteUserInput');
    assert.notEqual(registerDto, undefined);
    assert.notEqual(inviteDto, undefined);
    assert.deepEqual(
      registerDto?.fields.map((f) => f.name),
      inviteDto?.fields.map((f) => f.name),
      'both DTOs carry the same field shape, as distinct entities',
    );
  });

  it('a synthesized DTO name colliding with a plain function entity that already claims it falls back to the __2 disambiguator', () => {
    // `reserveFunctionEntityNames` is a pre-pass that reserves EVERY
    // exported function's bare name in `entityNames` before any function
    // actually converts (see its own doc comment). So by the time
    // `craftInvoice` converts and its inline-object parameter synthesizes
    // `CraftInvoiceInput`, that exact name is ALREADY reserved — not by a
    // DTO, but by the sibling function literally named `CraftInvoiceInput`
    // (declared immediately after `craftInvoice` in the fixture, on
    // purpose, to construct this exact collision). `craftInvoice`'s
    // synthesis must fall back to `reserveSynthesizedDTOName`'s `__2`
    // disambiguator rather than silently colliding with that function's
    // own entity name.
    const result = convert();
    const craftInvoiceFn = findFunction(result.entities, 'craftInvoice');
    const collidingFn = findFunction(result.entities, 'CraftInvoiceInput');
    assert.notEqual(craftInvoiceFn, undefined, 'the craftInvoice function entity must exist');
    assert.notEqual(collidingFn, undefined, 'the CraftInvoiceInput function entity must exist, unrenamed');

    assert.equal(
      craftInvoiceFn?.input,
      'CraftInvoiceInput__2',
      'CraftInvoiceInput is already claimed by the sibling function of that exact name — the synthesized DTO must disambiguate',
    );
    assert.equal(collidingFn?.input, undefined, "CraftInvoiceInput's own parameter is a plain identifier, not DTO-shaped");

    const synthesizedDto = findDTO(result.entities, 'CraftInvoiceInput__2');
    assert.notEqual(synthesizedDto, undefined, 'the disambiguated synthesized DTO must exist as its own entity');
    assert.deepEqual(
      synthesizedDto?.fields.map((f) => f.name),
      ['orderId', 'note'],
    );
    assert.equal(
      result.entities.some((e) => (e as { kind: string }).kind === 'DTO' && (e as { name: string }).name === 'CraftInvoiceInput'),
      false,
      'no DTO ever claims the bare name CraftInvoiceInput — a function entity of that exact name already owns it',
    );
  });
});

describe('issue #72 check — control case: named-interface parameter is unaffected', () => {
  it('a named-interface parameter keeps routing through the D-LEG-1 true-positive path, not inline-DTO synthesis', () => {
    const result = convert();
    const fn = findFunction(result.entities, 'useWidget');
    assert.notEqual(fn, undefined);
    assert.equal(fn?.input, 'Widget', 'a named-interface parameter must resolve to the interface itself, not a synthesized DTO');
  });
});

describe('issue #72 check — output parses, checker green on the fixture', () => {
  it('the full fixture emits with zero syntax diagnostics and zero checker/reference-to-illegal findings', async () => {
    const result = convert();
    const { result: checkResult } = await checkViaLongform(result.entities);
    const codes = checkResult.diagnostics.map((d) => d.code);
    assert.equal(
      codes.some((c) => c.startsWith('syntax/')),
      false,
      'zero syntax diagnostics — every synthesized DTO name must be a legal bare entity_name token',
    );
    assert.equal(codes.includes('checker/reference-to-illegal'), false, 'every input/output reference must resolve to a real DTO entity');
  });
});
