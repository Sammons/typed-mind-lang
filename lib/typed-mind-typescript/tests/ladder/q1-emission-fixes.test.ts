// RFC-TM-10 Q1 (rfc-tm-10-diamond.md) — converter emission fixes. Check
// bindings per the Diamond's Q1 line:
//   - D-LEG-1 (issue #59): quoted-string-union and Class-kind signature
//     types leave input/output undefined; the interface true-positive case
//     is unchanged.
//   - D-LEG-2 (issue #65): Pick<S3Client, "send"> in a DTO field AND a
//     function-signature return type synthesizes an S3Client
//     Dependency-exports stub.
//   - D-LEG-3 (issue #61), refined by A2: a proven external heritage name
//     resolves through its actual Dependency export; missing provenance
//     retains the existing sanitized stub fallback.
//   - D-LEG-4 (issue #60): a two-paragraph JSDoc comment collapses to its
//     whitespace-normalized first paragraph only.
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { DependencyNode, FileNode, SyntaxEmitter, TypedMind } from '@sammons/typed-mind';
import { TypeScriptAnalyzer } from '../../src/typescript-analyzer.ts';
import { TypeScriptToTypedMindConverter } from '../../src/typescript-to-typedmind-converter.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');
const fixturePath = (name: string, ...segments: string[]): string => join(reprosDir, name, ...segments);

const checkViaLongform = async (entities: readonly unknown[]) => {
  const emitter = new SyntaxEmitter();
  const longform = emitter.emitLongform({ entities: entities as never, imports: [], suppressions: [], diagnostics: [] });
  const tm = await TypedMind.create();
  return { longform, result: tm.check(longform) };
};

describe('RFC-TM-10 Q1 check — D-LEG-1: isDTOLikeType kind-resolved classification', () => {
  it('a quoted-string-union return type leaves output undefined, signature text preserved', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('28-dto-classification'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('28-dto-classification', 'src', 'main.ts'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);
    assert.equal(result.success, true);

    const fn = result.entities.find((e) => e.kind === 'Function' && e.name === 'processNextMessage') as
      | { output: string | undefined; signature: string }
      | undefined;
    assert.notEqual(fn, undefined);
    assert.equal(fn?.output, undefined, 'a literal-union return type must not populate output');
    assert.ok(fn?.signature.includes('"empty" | "processed"'), 'the union text stays visible in the signature');
  });

  it('a Class-kind parameter/return type leaves input/output undefined, signature text preserved', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('28-dto-classification'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('28-dto-classification', 'src', 'main.ts'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);
    assert.equal(result.success, true);

    const fn = result.entities.find((e) => e.kind === 'Function' && e.name === 'inspect') as
      | { input: string | undefined; output: string | undefined; signature: string }
      | undefined;
    assert.notEqual(fn, undefined);
    assert.equal(fn?.input, undefined, 'a Class-kind parameter type must not populate input');
    assert.equal(fn?.output, undefined, 'a Class-kind return type must not populate output');
    assert.ok(fn?.signature.includes('CheckContext'), 'the class name stays visible in the signature');
  });

  it('control case: an interface parameter/return type keeps routing through input/output unchanged', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('28-dto-classification'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('28-dto-classification', 'src', 'main.ts'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);
    assert.equal(result.success, true);

    const fn = result.entities.find((e) => e.kind === 'Function' && e.name === 'makeWidget') as
      | { input: string | undefined; output: string | undefined }
      | undefined;
    assert.notEqual(fn, undefined);
    assert.equal(fn?.input, 'Widget', 'the original true-positive interface case must be unchanged');
    assert.equal(fn?.output, 'Widget');
  });
});

describe('RFC-TM-10 Q1 check — D-LEG-2: generic type-argument Dependency stubs', () => {
  it('Pick<S3Client, "send"> in a function-signature return type synthesizes an S3Client Dependency-exports stub', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('29-generic-arg-stub'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('29-generic-arg-stub', 'src', 'main.ts'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);
    assert.equal(result.success, true);

    const dep = result.entities.find((e) => e.kind === 'Dependency' && e.name === 'AwsSdkClientS3') as
      | { exports: readonly string[] | undefined }
      | undefined;
    assert.notEqual(dep, undefined, 'the sanitized AwsSdkClientS3 Dependency entity must exist');
    assert.ok(dep?.exports?.includes('S3Client'), 'S3Client must be synthesized into the Dependency exports');
  });

  it('Pick<S3Client, "send"> in a DTO field also synthesizes the same stub', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('29-generic-arg-stub'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('29-generic-arg-stub', 'src', 'main.ts'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);
    assert.equal(result.success, true);

    const dto = result.entities.find((e) => e.kind === 'DTO' && e.name === 'DeliveryOptions');
    assert.notEqual(dto, undefined, 'the DeliveryOptions DTO must exist');

    const dep = result.entities.find((e) => e.kind === 'Dependency' && e.name === 'AwsSdkClientS3') as
      | { exports: readonly string[] | undefined }
      | undefined;
    assert.ok(dep?.exports?.includes('S3Client'), 'S3Client stub is shared across both the DTO-field and signature paths');
  });
});

describe('RFC-TM-10 Q1 check — D-LEG-3: namespace-qualified implements resolution', () => {
  it('TM13 A2: proven package heritage replaces a synthetic stub with the actual dependency member', async () => {
    const analysis = new TypeScriptAnalyzer(fixturePath('27-namespace-implements')).analyzeFromEntrypoint(
      fixturePath('27-namespace-implements', 'src', 'main.ts'),
    );
    const result = new TypeScriptToTypedMindConverter().convert(analysis);
    assert.equal(result.success, true);
    assert.equal(
      result.entities.some((entity) => entity.name === 'TsParseConfigFileHost'),
      false,
    );
    const dependency = result.entities.find((entity) => entity.kind === 'Dependency');
    assert.ok(dependency instanceof DependencyNode);
    assert.deepEqual(dependency.exports, ['ParseConfigFileHost']);
    assert.ok(result.tmdContent.includes('CollectingParseConfigHost <: Typescript.ParseConfigFileHost'));
    const owner = result.entities.find((entity) => entity.kind === 'File');
    assert.ok(owner instanceof FileNode);
    assert.deepEqual(owner.exports, ['CollectingParseConfigHost'], 'the dependency member is not falsely exported by this file');
    const control = new TypeScriptToTypedMindConverter().convert({
      ...analysis,
      modules: analysis.modules.map((module) => ({
        ...module,
        classes: module.classes.map((cls) => ({ ...cls, implementsTypeInfo: undefined })),
      })),
    });
    const stub = control.entities.find((entity) => entity.name === 'TsParseConfigFileHost');
    assert.equal(stub?.kind, 'Class');
    const tm = await TypedMind.create();
    assert.deepEqual(tm.check(result.tmdContent).diagnostics, []);
    assert.deepEqual(tm.check(control.tmdContent).diagnostics, []);
  });

  it('the class implementing the namespace-qualified interface keeps zero parse errors', async () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('27-namespace-implements'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('27-namespace-implements', 'src', 'main.ts'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);
    assert.equal(result.success, true);

    const { result: checkResult } = await checkViaLongform(result.entities);
    const codes = checkResult.diagnostics.map((d) => d.code);
    assert.equal(
      codes.some((c) => c.startsWith('syntax/')),
      false,
      'zero syntax diagnostics — the dotted name must parse cleanly',
    );
  });
});

describe('RFC-TM-10 Q1 check — D-LEG-4: multi-paragraph JSDoc collapse', () => {
  it('a two-paragraph JSDoc comment collapses to its whitespace-normalized first paragraph only', () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('26-multiparagraph-jsdoc'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('26-multiparagraph-jsdoc', 'src', 'main.ts'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);
    assert.equal(result.success, true);

    const fn = result.entities.find((e) => e.kind === 'Function' && e.name === 'publicHeader') as
      | { description: string | undefined }
      | undefined;
    assert.notEqual(fn, undefined);
    assert.equal(fn?.description, 'Shared header for all public (unauthenticated) pages.');
    assert.equal(fn?.description?.includes('\n'), false, 'the collapsed description must be a single line');
    assert.equal(fn?.description?.includes('Renders a consistent nav bar'), false, 'only the first paragraph survives');
  });

  it('the collapsed description emits with zero syntax diagnostics', async () => {
    const analyzer = new TypeScriptAnalyzer(fixturePath('26-multiparagraph-jsdoc'));
    const analysis = analyzer.analyzeFromEntrypoint(fixturePath('26-multiparagraph-jsdoc', 'src', 'main.ts'));
    const converter = new TypeScriptToTypedMindConverter();
    const result = converter.convert(analysis);
    assert.equal(result.success, true);

    const { result: checkResult } = await checkViaLongform(result.entities);
    const codes = checkResult.diagnostics.map((d) => d.code);
    assert.equal(
      codes.some((c) => c.startsWith('syntax/')),
      false,
      'zero syntax diagnostics — the blank line must never desync the parser',
    );
  });
});
