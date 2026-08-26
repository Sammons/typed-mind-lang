// RFC-TM-3 §3.7 / §5 Q5 (rfc-tm-3-diamond.md) — import-resolution port
// fixtures, reusing the scenarios/imports/*.tmd shapes: alias prefixing,
// stack-based circular detection, nested resolution, the per-instance path
// cache, the three imports/* diagnostics, and BOTH halves of the replicated
// top-level-error vs nested-silent-skip asymmetry (port-fidelity decision one).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ClassNode } from '../ast/class-node.ts';
import { FileNode } from '../ast/file-node.ts';
import { ImportStatementNode } from '../ast/import-statement-node.ts';
import { UiComponentNode } from '../ast/ui-component-node.ts';
import { type DocumentParser, ImportResolver } from './import-resolver.ts';
import type { ParseOutcome } from './parse-outcome.ts';
import { TypedMindParser } from './typed-mind-parser.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..', '..');
const repoRoot = join(packageDir, '..', '..');
const wasmPath = join(packageDir, 'grammar', 'grammar.wasm');
const scenariosDir = join(repoRoot, 'lib', 'typed-mind-test-suite', 'scenarios');

const syntheticImport = (path: string, line: number, alias?: string): ImportStatementNode => {
  return new ImportStatementNode({
    path,
    ...(alias !== undefined ? { alias } : {}),
    span: { start: { line, column: 1 }, end: { line, column: 1 + path.length } },
    raw: `@import "${path}"${alias === undefined ? '' : ` as ${alias}`}`,
  });
};

class CountingParser implements DocumentParser {
  readonly #inner: TypedMindParser;
  parseCount = 0;

  constructor(inner: TypedMindParser) {
    this.#inner = inner;
  }

  parse(source: string): ParseOutcome {
    this.parseCount += 1;
    return this.#inner.parse(source);
  }
}

const resolveScenario = (parser: DocumentParser, scenarioFileName: string) => {
  const outcome = new TypedMindParserProxy(parser).parseFile(join(scenariosDir, scenarioFileName));
  const resolver = new ImportResolver(parser);
  return resolver.resolveImports(outcome.imports, scenariosDir);
};

// Small file-reading shim so scenario tests parse the on-disk document once.
class TypedMindParserProxy {
  readonly #parser: DocumentParser;

  constructor(parser: DocumentParser) {
    this.#parser = parser;
  }

  parseFile(filePath: string): ParseOutcome {
    return this.#parser.parse(readFileSync(filePath, 'utf8'));
  }
}

describe('ImportResolver (§3.7 port)', () => {
  let parser: TypedMindParser;

  before(async () => {
    parser = await TypedMindParser.create({ wasmPath });
  });

  it('scenario-20: basic import resolves the imported document into named EntityNodes', () => {
    const result = resolveScenario(parser, 'scenario-20-basic-import.tmd');
    assert.deepEqual(
      {
        names: [...result.resolvedEntities.keys()].sort(),
        diagnostics: result.diagnostics,
        authFileIsFileNode: result.resolvedEntities.get('AuthFile') instanceof FileNode,
        authServiceIsClassNode: result.resolvedEntities.get('AuthService') instanceof ClassNode,
      },
      {
        names: ['AuthFile', 'AuthService', 'validateUser'],
        diagnostics: [],
        authFileIsFileNode: true,
        authServiceIsClassNode: true,
      },
    );
  });

  it('scenario-21: alias prefixing renames the clone, preserves its class and its unprefixed inner fields', () => {
    const result = resolveScenario(parser, 'scenario-21-aliased-import.tmd');
    const button = result.resolvedEntities.get('UI.Button');
    const form = result.resolvedEntities.get('UI.Form');
    const databaseFile = result.resolvedEntities.get('DB.DatabaseFile');
    assert.deepEqual(
      {
        names: [...result.resolvedEntities.keys()].sort(),
        diagnostics: result.diagnostics,
        buttonShape: button instanceof UiComponentNode ? { name: button.name, purpose: button.purpose, root: button.root } : undefined,
        // Inner references stay UNPREFIXED, exactly like the legacy shallow
        // clone (import-resolver.ts:67) — only the entity's own name changes.
        formContains: form instanceof UiComponentNode ? form.contains : undefined,
        databaseFileExports: databaseFile instanceof FileNode ? databaseFile.exports : undefined,
      },
      {
        names: ['DB.Connection', 'DB.DatabaseFile', 'DB.query', 'UI.Button', 'UI.ComponentsFile', 'UI.Form', 'UI.Input', 'UI.Modal'],
        diagnostics: [],
        buttonShape: { name: 'UI.Button', purpose: 'Reusable button component', root: true },
        formContains: ['Input', 'Button'],
        databaseFileExports: ['Connection', 'query'],
      },
    );
  });

  it('scenario-22: nested imports resolve transitively with the outer prefix applied', () => {
    const result = resolveScenario(parser, 'scenario-22-nested-import.tmd');
    assert.deepEqual(
      {
        names: [...result.resolvedEntities.keys()].sort(),
        diagnostics: result.diagnostics,
      },
      {
        // service-layer.tmd's own entities plus its nested database.tmd
        // entities, all unprefixed (no alias on either hop).
        names: ['Connection', 'DatabaseFile', 'ServiceFile', 'User', 'UserService', 'createUser', 'query'],
        diagnostics: [],
      },
    );
  });

  it('scenario-23: circular imports produce imports/circular at the offending statement span and still resolve both modules', () => {
    const result = resolveScenario(parser, 'scenario-23-circular-import.tmd');
    const circular = result.diagnostics.at(0);
    assert.deepEqual(
      {
        diagnosticCount: result.diagnostics.length,
        code: circular?.code,
        severity: circular?.severity,
        // The diagnostic sits on module-b.tmd's `@import "./module-a.tmd"`
        // statement (line 2), with a real token span (§3.2).
        spanStart: circular?.span.start,
        chainShape:
          circular !== undefined &&
          /^Circular import detected: .*module-a\.tmd -> .*module-b\.tmd -> .*module-a\.tmd$/.test(circular.message),
        names: [...result.resolvedEntities.keys()].sort(),
      },
      {
        diagnosticCount: 1,
        code: 'imports/circular',
        severity: 'error',
        spanStart: { line: 2, column: 1 },
        chainShape: true,
        names: ['FileA', 'FileB', 'ServiceA', 'ServiceB', 'methodA', 'methodB'],
      },
    );
  });

  it('scenario-24: a missing file produces imports/read-failure carrying the fs error text', () => {
    const result = resolveScenario(parser, 'scenario-24-import-not-found.tmd');
    const failure = result.diagnostics.at(0);
    assert.deepEqual(
      {
        diagnosticCount: result.diagnostics.length,
        code: failure?.code,
        severity: failure?.severity,
        namesEmpty: result.resolvedEntities.size,
        mentionsPath: failure?.message.includes("Failed to import './non-existent-file.tmd'"),
        carriesFsError: failure?.message.includes('ENOENT'),
      },
      {
        diagnosticCount: 1,
        code: 'imports/read-failure',
        severity: 'error',
        namesEmpty: 0,
        mentionsPath: true,
        carriesFsError: true,
      },
    );
  });

  it('scenario-25: a top-level duplicate name errors with imports/duplicate-name and keeps the FIRST resolution', () => {
    const result = resolveScenario(parser, 'scenario-25-import-duplicate-names.tmd');
    const duplicate = result.diagnostics.at(0);
    const kept = result.resolvedEntities.get('AuthService');
    assert.deepEqual(
      {
        diagnostics: result.diagnostics.map((diagnostic) => ({
          code: diagnostic.code,
          severity: diagnostic.severity,
          line: diagnostic.span.start.line,
        })),
        mentionsName: duplicate?.message.includes("Duplicate entity name 'AuthService'"),
        // First-import wins: auth-module.tmd's AuthService, not auth-duplicate's.
        keptMethods: kept instanceof ClassNode ? kept.methods : undefined,
        names: [...result.resolvedEntities.keys()].sort(),
      },
      {
        diagnostics: [{ code: 'imports/duplicate-name', severity: 'error', line: 3 }],
        mentionsName: true,
        keptMethods: ['login', 'logout', 'checkSession'],
        names: ['AuthDuplicateFile', 'AuthFile', 'AuthService', 'validateUser'],
      },
    );
  });

  it('asymmetry, nested half: a nested import colliding with an already-resolved name is silently skipped (first wins, no diagnostic)', () => {
    const resolver = new ImportResolver(parser);
    const result = resolver.resolveImports(
      [syntheticImport('./imports/shared/database.tmd', 2), syntheticImport('./imports/shared/service-layer.tmd', 3)],
      scenariosDir,
    );
    assert.deepEqual(
      {
        diagnostics: result.diagnostics,
        names: [...result.resolvedEntities.keys()].sort(),
      },
      {
        // service-layer's NESTED database entities collide with the directly
        // imported ones and are skipped without any diagnostic
        // (legacy import-resolver.ts:77-82).
        diagnostics: [],
        names: ['Connection', 'DatabaseFile', 'ServiceFile', 'User', 'UserService', 'createUser', 'query'],
      },
    );
  });

  it('asymmetry, top-level half: the same collision through a DIRECT import errors (legacy import-resolver.ts:58-64)', () => {
    const resolver = new ImportResolver(parser);
    const result = resolver.resolveImports(
      [syntheticImport('./imports/shared/service-layer.tmd', 2), syntheticImport('./imports/shared/database.tmd', 3)],
      scenariosDir,
    );
    assert.deepEqual(
      result.diagnostics.map((diagnostic) => ({ code: diagnostic.code, line: diagnostic.span.start.line })),
      // database.tmd's three entities all arrived first via the nested hop, so
      // each direct re-add errors.
      [
        { code: 'imports/duplicate-name', line: 3 },
        { code: 'imports/duplicate-name', line: 3 },
        { code: 'imports/duplicate-name', line: 3 },
      ],
    );
  });

  it('path cache: the same document imported twice parses once per resolver instance (port-fidelity decision two)', () => {
    const countingParser = new CountingParser(parser);
    const resolver = new ImportResolver(countingParser);
    const result = resolver.resolveImports(
      [syntheticImport('./imports/shared/database.tmd', 2), syntheticImport('./imports/shared/database.tmd', 3)],
      scenariosDir,
    );
    assert.deepEqual(
      {
        parseCount: countingParser.parseCount,
        duplicateDiagnostics: result.diagnostics.filter((diagnostic) => diagnostic.code === 'imports/duplicate-name').length,
      },
      { parseCount: 1, duplicateDiagnostics: 3 },
    );
  });
});
