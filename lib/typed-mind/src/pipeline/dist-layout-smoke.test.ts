// RFC-TM-3 Q1 smoke test, built dist layout (rfc-tm-3-diamond.md §3.1/§4):
// the compiled ESM output must resolve grammar.wasm via import.meta.url
// (dist/pipeline → ../../grammar/grammar.wasm) with NO override, and parse the
// same hero fixture the src-layout smoke covers. The child process is what
// makes this real: it imports the built dist/ artifact, not the src tree.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..', '..');
const repoRoot = join(packageDir, '..', '..');
const heroPath = join(packageDir, 'grammar', 'test', 'fixtures', 'hero.tmd');
const distParserPath = join(packageDir, 'dist', 'pipeline', 'typed-mind-parser.js');

const childScript = `
import { readFileSync } from 'node:fs';
const { TypedMindParser } = await import(process.argv[1]);
const parser = await TypedMindParser.create();
const root = parser.parseCst(readFileSync(process.argv[2], 'utf8'));
const headers = root.longformBlockChildren().map((block) => block.blockHeaderChildren()[0].headerName());
const eofDto = root.dtoDeclarationChildren()[0];
console.log(
  JSON.stringify({
    headers,
    dtoConcreteType: eofDto.syntaxNode.type,
    dtoIsFinal: eofDto.isFinal,
    dtoName: eofDto.entityNameChildren()[0].text,
    rootStart: root.span().start,
  }),
);
`;

describe('TypedMindParser (built dist layout, default import.meta.url wasm resolution)', () => {
  it('parses the hero fixture from the compiled ESM output with no wasm override', () => {
    // Ensure dist/ reflects the current sources; tsc --build is incremental.
    execFileSync(join(repoRoot, 'node_modules', '.bin', 'tsc'), ['--build'], { cwd: packageDir, encoding: 'utf8' });
    const stdout = execFileSync(process.execPath, ['--input-type=module', '-e', childScript, distParserPath, heroPath], { encoding: 'utf8' });
    assert.deepEqual(JSON.parse(stdout), {
      headers: ['TodoApp', 'left-pad'],
      dtoConcreteType: 'dto_declaration_final',
      dtoIsFinal: true,
      dtoName: 'UserDTO',
      rootStart: { line: 1, column: 1 },
    });
  });
});
