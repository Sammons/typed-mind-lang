// RFC-TM-4 §4 (rfc-tm-4-diamond.md) S-TEST-2 — coverage gaps close as
// diagnostics-inspection tests on the new surface (`TypedMind` /
// `TypedMindParser`), living in the test-suite package per the doc. Each
// block below closes one named gap from the frozen scope
// (ast-v2-goal-scope.md §S-TEST-2):
//   - inline comments, including S-GRAMMAR-1b's in-string `#` case
//   - unterminated longform blocks
//   - ClassFile longform round-trip (S-CORE-2a)
//   - near-miss operator diagnostics (S-GRAMMAR-4a)
//   - name-class drops (S-GRAMMAR-4b)
//   - the DTO collision fixtures (S-GRAMMAR-1a)
//   - the whitespace-prefix fixture (S-GRAMMAR-3)
//   - import resolution
// Strict-mode tests are NOT re-created here: `errorRecovery`/
// `errorRecoveryMode`/`DSLCheckerOptions.strictMode` are Amendment-B flags
// that live on the legacy parser/checker (frozen bridge, still consumed by
// the LSP/converter/renderer through Q5) and have no new-surface equivalent
// to test — the new pipeline is unconditionally always-tolerant (S-PARSE-3;
// TypedMindParser.parse never throws, has no strict/non-strict mode). Their
// "replacement" IS this file's diagnostics-inspection coverage: the flags
// existed to toggle whether malformed input threw or silently dropped;
// the new surface always reports and never drops, so a mode toggle is not
// a concept that needs a new test — it needs no equivalent, which the tests
// below demonstrate by construction (every case here either parses and
// reports, or reports and does not throw).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ClassFileNode } from '../../typed-mind/src/ast/class-file-node.ts';
import { DtoNode } from '../../typed-mind/src/ast/dto-node.ts';
import { ImportResolver } from '../../typed-mind/src/pipeline/import-resolver.ts';
import { TypedMindParser } from '../../typed-mind/src/pipeline/typed-mind-parser.ts';
import { WASM_PATH } from './wasm-path.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');
const staticSiteSnippets = join(repoRoot, 'lib', 'typed-mind-static-website', 'snippets');
const grammarFixtures = join(repoRoot, 'lib', 'typed-mind', 'grammar', 'test', 'fixtures');

describe('S-TEST-2 gap fixtures (diagnostics-inspection, new surface)', () => {
  describe('inline comments', () => {
    it('a full-line comment does not produce a diagnostic or an entity', async () => {
      const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
      const outcome = parser.parse('# just a comment\nMainFile @ src/main.ts:\n');
      assert.equal(outcome.diagnostics.length, 0);
      assert.equal(outcome.entities.length, 1);
    });

    it("S-GRAMMAR-1b: '#' inside a quoted description does not truncate the description or produce a diagnostic", async () => {
      const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
      const source = 'UserDTO %\n  - promo: string "Handles a # discount code"\n';
      const outcome = parser.parse(source);
      assert.equal(outcome.diagnostics.length, 0);
      const dto = outcome.entities.find((e) => e.name === 'UserDTO');
      assert.ok(dto instanceof DtoNode);
      assert.equal(dto?.fields.at(0)?.description, 'Handles a # discount code');
    });

    it('a trailing inline comment on a shortform declaration survives and does not corrupt the entity', async () => {
      const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
      const outcome = parser.parse('MainFile @ src/main.ts:  # entry point\n');
      assert.equal(outcome.diagnostics.length, 0);
      assert.equal(outcome.entities.at(0)?.name, 'MainFile');
      assert.equal(outcome.entities.at(0)?.comment, 'entry point');
    });
  });

  describe('unterminated longform blocks', () => {
    it('a longform block with no closing brace produces a syntax/* diagnostic and does not throw', async () => {
      const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
      const source = 'program TodoApp {\n  entry: AppEntry\n';
      assert.doesNotThrow(() => parser.parse(source));
      const outcome = parser.parse(source);
      assert.ok(outcome.diagnostics.length > 0);
      assert.ok(outcome.diagnostics.every((diagnostic) => diagnostic.severity === 'error'));
    });
  });

  describe('ClassFile longform round-trip (S-CORE-2a)', () => {
    it('classfile-longform.tmd: the ClassFile entities round-trip through parse (sigil-with-brace header)', async () => {
      const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
      const content = readFileSync(join(staticSiteSnippets, 'classfile-longform.tmd'), 'utf-8');
      const outcome = parser.parse(content);
      const userService = outcome.entities.find((e) => e.name === 'UserService');
      assert.ok(userService instanceof ClassFileNode);
      assert.equal(userService?.path, 'src/services/user.ts');
      assert.equal(userService?.sourceForm, 'longform');
      assert.ok(userService?.methods.includes('findById'));
    });

    it('hero-longform.tmd: the sigil-with-brace ClassFile header (`Name #: path { ... }`) parses as ClassFile, not silently dropped', async () => {
      const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
      const content = readFileSync(join(staticSiteSnippets, 'hero-longform.tmd'), 'utf-8');
      const outcome = parser.parse(content);
      const todoService = outcome.entities.find((e) => e.name === 'TodoService');
      assert.ok(todoService instanceof ClassFileNode);
      assert.equal(todoService?.path, 'api.ts');
      assert.equal(todoService?.sourceForm, 'longform');
    });
  });

  describe('near-miss operator diagnostics (S-GRAMMAR-4a)', () => {
    it('naming-edge-cases-example.tmd:49 (`<=` near-miss) yields exactly one syntax/* diagnostic, not a recovery cascade', async () => {
      const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
      const content = readFileSync(join(repoRoot, 'naming-edge-cases-example.tmd'), 'utf-8');
      const outcome = parser.parse(content);
      const line49 = outcome.diagnostics.filter((diagnostic) => diagnostic.span.start.line <= 49 && diagnostic.span.end.line >= 49);
      assert.equal(line49.length, 1);
      assert.equal(line49.at(0)?.code, 'syntax/error');
      assert.equal(line49.at(0)?.severity, 'error');
    });
  });

  describe('name-class drops (S-GRAMMAR-4b)', () => {
    it('naming-edge-cases-example.tmd:47 (the 4b normalization line) parses without a diagnostic', async () => {
      const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
      const content = readFileSync(join(repoRoot, 'naming-edge-cases-example.tmd'), 'utf-8');
      const outcome = parser.parse(content);
      const line47 = outcome.diagnostics.filter((diagnostic) => diagnostic.span.start.line <= 47 && diagnostic.span.end.line >= 47);
      assert.equal(line47.length, 0);
    });

    it('scenario-54: a leading-digit name (`123Name @ ...`) errors as syntax, not a silently-parsed File (TM-2 narrowing disclosure, A9)', async () => {
      const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
      const content = readFileSync(
        join(repoRoot, 'lib', 'typed-mind-test-suite', 'scenarios', 'scenario-54-entity-name-boundaries.tmd'),
        'utf-8',
      );
      const outcome = parser.parse(content);
      const named123 = outcome.entities.find((e) => e.name === '123Name');
      assert.equal(named123, undefined);
      assert.ok(outcome.diagnostics.some((diagnostic) => diagnostic.code.startsWith('syntax/')));
    });
  });

  describe('DTO collision fixtures (S-GRAMMAR-1a)', () => {
    it('collision-same-kind.tmd: a same-kind shortform name collision preserves BOTH declarations with distinct spans', async () => {
      const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
      const content = readFileSync(join(grammarFixtures, 'collision-same-kind.tmd'), 'utf-8');
      const outcome = parser.parse(content);
      const apiEntities = outcome.entities.filter((e) => e.name === 'Api');
      assert.equal(apiEntities.length, 2);
      assert.notDeepEqual(apiEntities.at(0)?.span, apiEntities.at(1)?.span);
    });

    it('collision-longform-vs-shortform.tmd: a longform-vs-shortform collision preserves BOTH declarations, kind-agnostic', async () => {
      const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
      const content = readFileSync(join(grammarFixtures, 'collision-longform-vs-shortform.tmd'), 'utf-8');
      const outcome = parser.parse(content);
      const createUserEntities = outcome.entities.filter((e) => e.name === 'createUser');
      assert.equal(createUserEntities.length, 2);
    });
  });

  describe('whitespace-prefix fixture (S-GRAMMAR-3)', () => {
    it('a whitespace-prefixed continuation line disambiguates from a top-level Dependency declaration', async () => {
      const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
      // A Dependency name may begin with '-' (parser-patterns.ts), colliding
      // with the DTO field sigil; leading whitespace is what disambiguates a
      // continuation from a same-sigil top-level declaration (S-GRAMMAR-3).
      const source = '-pkg ^ "1.0.0"\nUserDTO %\n  - field: string "desc"\n';
      const outcome = parser.parse(source);
      const pkg = outcome.entities.find((e) => e.name === '-pkg');
      const dto = outcome.entities.find((e) => e.name === 'UserDTO');
      assert.ok(pkg !== undefined);
      assert.ok(dto instanceof DtoNode);
      assert.equal(dto?.fields.length, 1);
      assert.equal(dto?.fields.at(0)?.name, 'field');
    });
  });

  describe('import resolution', () => {
    it('a resolved @import merges the imported entity into the graph with no diagnostics', async () => {
      const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
      const filePath = join(repoRoot, 'lib', 'typed-mind-test-suite', 'scenarios', 'scenario-20-basic-import.tmd');
      const content = readFileSync(filePath, 'utf-8');
      const outcome = parser.parse(content);
      assert.ok(outcome.imports.length > 0);
      const resolver = new ImportResolver(parser);
      const resolved = resolver.resolveImports(outcome.imports, dirname(filePath));
      assert.equal(resolved.diagnostics.length, 0);
      assert.ok(resolved.resolvedEntities.size > 0);
    });

    it('an unresolvable @import path produces an imports/read-failure diagnostic, not a throw', async () => {
      const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
      const filePath = join(repoRoot, 'lib', 'typed-mind-test-suite', 'scenarios', 'scenario-24-import-not-found.tmd');
      const content = readFileSync(filePath, 'utf-8');
      const outcome = parser.parse(content);
      const resolver = new ImportResolver(parser);
      assert.doesNotThrow(() => resolver.resolveImports(outcome.imports, dirname(filePath)));
      const resolved = resolver.resolveImports(outcome.imports, dirname(filePath));
      assert.equal(resolved.diagnostics.length, 1);
      assert.equal(resolved.diagnostics.at(0)?.code, 'imports/read-failure');
    });
  });
});
