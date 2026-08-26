// RFC-TM-5 §4 (rfc-tm-5-diamond.md), S-EDITOR-1 — the retained TextMate
// grammar (syntaxes/typedmind.tmLanguage.json) is a sanctioned I-2 exception
// bound to this drift check. Mechanism: tokenize a fixture exercising every
// entity sigil (`->`, `@`, `::`, `<:`, `!`, `%`, `~`, `&`, `&!`,
// `$env`/`$config`, `^`, `#:`) using vscode-textmate + vscode-oniguruma (both
// Microsoft-published, sanctioned devDependencies per
// dep_trust_is_full_transitive_graph and the doc's own citation). Assertion
// per kind: BOTH the sigil token AND the entity-name token that follows it
// carry scopes beyond the root source.typedmind — a sigil-only assertion
// would pass straight through the historical ClassFile failure (a
// highlighted operator next to an unhighlighted name).
//
// Scope note: the grammar has no longform-block tokenization (`program X {
// ... }`, `function X { ... }`, etc. all fall through as bare
// source.typedmind text — the grammar's `patterns` array has no rule that
// matches the `program`/`file`/`function`/`class`/`classfile`/`constants`/
// `dto`/`asset`/`uicomponent` block keywords). Every sigil this RFC names
// (`->`, `@`, `::`, `<:`, `#:`, `!`, `%`, `~`, `&`, `&!`, `$env`/`$config`,
// `^`) is a shortform-only operator with no longform equivalent, so the
// fixture (textmate-smoke-fixture.tmd) is shortform-only by construction.
// Full grammar-from-CST generation (which would also cover longform) stays
// deferred under D-8 per the goal scope.
//
// Fix folded into this same check (not a separate leaf — the check exists
// precisely to catch this class of drift, and it caught one on first write):
// the `comments` pattern (`#.*$`, tried first in the top-level `patterns`
// list) swallowed the ClassFile sigil `#:` and everything after it on the
// line as a comment, because `#:` starts with `#`. `syntaxes/
// typedmind.tmLanguage.json`'s comment pattern gained a negative lookahead
// (`#(?!:).*$`) so `#:` is excluded from the comment match. This is the exact
// "operator next to an unhighlighted name" failure mode named above, just
// worse (the operator AND the name's trailing clause were swallowed too).

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
// vscode-oniguruma and vscode-textmate are CommonJS packages with no static
// ESM named exports (Node's ESM/CJS interop only synthesizes a default
// export for them) — destructure off the default import rather than naming
// exports directly.
import oniguruma from 'vscode-oniguruma';
import textmate, { type IOnigLib, type IRawGrammar } from 'vscode-textmate';

const { loadWASM, OnigScanner, OnigString } = oniguruma;
const { INITIAL, Registry } = textmate;

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..');
const grammarPath = join(packageDir, 'syntaxes', 'typedmind.tmLanguage.json');
const fixturePath = join(testDir, 'textmate-smoke-fixture.tmd');
const ROOT_SCOPE = 'source.typedmind';

interface SigilCase {
  readonly description: string;
  readonly line: string;
  // Index into the tokenized line of the token holding the entity name, and
  // of the token holding the sigil. Both are asserted to carry a scope
  // beyond ROOT_SCOPE.
  readonly nameText: string;
  readonly sigilText: string;
}

// One case per entity kind's sigil, matching a line in textmate-smoke-fixture.tmd.
const SIGIL_CASES: SigilCase[] = [
  { description: 'Program (->)', line: 'ProgramEntity -> mainFn v1.0.0', nameText: 'ProgramEntity', sigilText: '->' },
  { description: 'File (@)', line: 'FileEntity @ src/file.ts:', nameText: 'FileEntity', sigilText: '@' },
  { description: 'Function (::)', line: 'FunctionEntity :: (input: string) => void', nameText: 'FunctionEntity', sigilText: '::' },
  { description: 'Class (<:)', line: 'ClassEntity <: BaseClass', nameText: 'ClassEntity', sigilText: '<:' },
  {
    description: 'ClassFile (#:)',
    line: 'ClassFileEntity #: src/class-file.ts <: BaseClass',
    nameText: 'ClassFileEntity',
    sigilText: '#:',
  },
  { description: 'Constants (!)', line: 'ConstantsEntity ! src/config.ts : ConfigSchema', nameText: 'ConstantsEntity', sigilText: '!' },
  { description: 'DTO (%)', line: 'DtoEntity %', nameText: 'DtoEntity', sigilText: '%' },
  { description: 'Asset (~)', line: 'AssetEntity ~ "asset description"', nameText: 'AssetEntity', sigilText: '~' },
  { description: 'UIComponent (&)', line: 'UiComponentEntity & "component description"', nameText: 'UiComponentEntity', sigilText: '&' },
  {
    description: 'Root UIComponent (&!)',
    line: 'RootUiComponentEntity &! "root component description"',
    nameText: 'RootUiComponentEntity',
    sigilText: '&!',
  },
  {
    description: 'RunParameter ($env)',
    line: 'ENV_PARAM $env "environment parameter" (required)',
    nameText: 'ENV_PARAM',
    sigilText: '$env',
  },
  {
    description: 'RunParameter ($config)',
    line: 'CONFIG_PARAM $config "config parameter"',
    nameText: 'CONFIG_PARAM',
    sigilText: '$config',
  },
  { description: 'Dependency (^)', line: 'dependency-entity ^ "dependency purpose" v1.0.0', nameText: 'dependency-entity', sigilText: '^' },
];

const createOnigLib = async (): Promise<IOnigLib> => {
  const wasmBinPath = join(dirname(dirname(fileURLToPath(import.meta.resolve('vscode-oniguruma')))), 'release', 'onig.wasm');
  const wasmBin = readFileSync(wasmBinPath);
  await loadWASM(wasmBin.buffer as ArrayBuffer);
  return {
    createOnigScanner: (patterns: string[]) => new OnigScanner(patterns),
    createOnigString: (text: string) => new OnigString(text),
  };
};

describe('TextMate grammar drift smoke (RFC-TM-5 §4, S-EDITOR-1)', () => {
  it('tokenizes the fixture and colocates each sigil case with its fixture line', () => {
    const fixtureContent = readFileSync(fixturePath, 'utf8');
    for (const sigilCase of SIGIL_CASES) {
      assert.ok(
        fixtureContent.includes(sigilCase.line),
        `fixture is missing the line for ${sigilCase.description}: ${JSON.stringify(sigilCase.line)}`,
      );
    }
  });

  it('gives both the sigil token and the entity-name token a scope beyond source.typedmind, for every entity kind', async () => {
    const rawGrammar = JSON.parse(readFileSync(grammarPath, 'utf8')) as IRawGrammar;
    const registry = new Registry({
      onigLib: createOnigLib(),
      loadGrammar: async (scopeName) => (scopeName === ROOT_SCOPE ? rawGrammar : null),
    });
    const grammar = await registry.loadGrammar(ROOT_SCOPE);
    assert.notEqual(grammar, null, `failed to load grammar at ${grammarPath}`);
    if (grammar === null) {
      return;
    }

    for (const sigilCase of SIGIL_CASES) {
      const result = grammar.tokenizeLine(sigilCase.line, INITIAL);
      const nameToken = result.tokens.find((token) => sigilCase.line.slice(token.startIndex, token.endIndex) === sigilCase.nameText);
      const sigilToken = result.tokens.find((token) => sigilCase.line.slice(token.startIndex, token.endIndex) === sigilCase.sigilText);

      assert.notEqual(
        nameToken,
        undefined,
        `${sigilCase.description}: no token exactly matched the entity name ${JSON.stringify(sigilCase.nameText)} in line ${JSON.stringify(sigilCase.line)}`,
      );
      assert.notEqual(
        sigilToken,
        undefined,
        `${sigilCase.description}: no token exactly matched the sigil ${JSON.stringify(sigilCase.sigilText)} in line ${JSON.stringify(sigilCase.line)}`,
      );

      const nameScopesBeyondRoot = nameToken?.scopes.filter((scope) => scope !== ROOT_SCOPE) ?? [];
      const sigilScopesBeyondRoot = sigilToken?.scopes.filter((scope) => scope !== ROOT_SCOPE) ?? [];

      assert.ok(
        nameScopesBeyondRoot.length > 0,
        `${sigilCase.description}: entity-name token ${JSON.stringify(sigilCase.nameText)} carries only ${JSON.stringify(nameToken?.scopes)} — the historical ClassFile failure mode (highlighted sigil, unhighlighted name)`,
      );
      assert.ok(
        sigilScopesBeyondRoot.length > 0,
        `${sigilCase.description}: sigil token ${JSON.stringify(sigilCase.sigilText)} carries only ${JSON.stringify(sigilToken?.scopes)}`,
      );
    }
  });
});
