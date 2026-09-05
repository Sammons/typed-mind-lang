// RFC-TM-14 §S4 R4a corpus attribution (rfc-tm-14-diamond.md): every orphan
// removed from examples-inventory-expected.json has a concrete use inside an
// inline-object field type. Replacing only those uses with `string` restores
// precisely the old orphan multiset (the G.4 attribution pattern,
// generic-heritage-corpus-deltas.test.ts).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { it } from 'node:test';
import { CheckContext } from '../../typed-mind/src/checker/check-context.ts';
import { checkOrphans } from '../../typed-mind/src/checker/check-orphans.ts';
import { computeLinks } from '../../typed-mind/src/pipeline/link-index.ts';
import { TypedMindParser } from '../../typed-mind/src/pipeline/typed-mind-parser.ts';
import { WASM_PATH } from './wasm-path.ts';

const root = join(import.meta.dirname, '../../..');
const cases = [
  [
    'complex-dto-example.tmd',
    ['ColumnDefDTO', 'ExecutionStepDTO', 'RedisConfigDTO', 'MemoryConfigDTO', 'AuthProviderDTO', 'PermissionDTO'],
  ],
] as const;

for (const [path, names] of cases) {
  it(`R4a inline-object member removal restores exactly the attributed orphans: ${path}`, async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const source = readFileSync(join(root, path), 'utf8');
    const targets: readonly string[] = names;
    // Only DTO field lines whose type is an inline object carry the uses.
    // Every other reference (schema lines, signatures, imports) stays as is.
    const control = source.replace(/^( {2}- \w+\??: )(\{[^\n"]*\})/gm, (line, head: string, object: string) => {
      const edited = object.replace(/\b[A-Z]\w*DTO\b(\[\])?/g, (name, suffix: string | undefined) =>
        targets.includes(name.replace('[]', '')) ? `string${suffix ?? ''}` : name,
      );
      return edited === object ? line : `${head}${edited}`;
    });
    assert.notEqual(control, source);
    assert.deepEqual(
      parser.parse(control).entities.map(({ kind, name }) => [kind, name]),
      parser.parse(source).entities.map(({ kind, name }) => [kind, name]),
      'editing field types must preserve every declaration identity and kind',
    );
    const orphanMessages = (text: string) => {
      const { entities } = parser.parse(text);
      const context = new CheckContext({ entities, links: computeLinks(entities), parseDiagnostics: [] });
      checkOrphans(context);
      return context.findings.map((finding) => finding.message).sort();
    };
    const baseline = orphanMessages(source);
    for (const name of targets) assert.equal(baseline.includes(`Orphaned entity '${name}'`), false, name);
    assert.deepEqual(orphanMessages(control), [...baseline, ...targets.map((name) => `Orphaned entity '${name}'`)].sort());
  });
}
