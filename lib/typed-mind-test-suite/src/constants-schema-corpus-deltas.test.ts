// RFC-TM-14 U5a, leaf R6a (rfc-tm-14-diamond.md §S5, U-2): a Constants
// schema names the type of the value, which is a use, so schema references
// now credit the orphan walk — a proved correction of the legacy port
// exclusion (check-orphans.ts header). Measured blast at 08336db over every
// tracked .tmd: 8 documents lose exactly the orphan findings below and gain
// nothing. Removing only the schema slots that name each target restores
// precisely the old orphan multiset, so every removed finding is attributed
// to a concrete schema use (the G.4 precedent in
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
  ['complex-dto-example.tmd', ['DatabaseConfigDTO']],
  ['naming-edge-cases-example.tmd', ['ValidationRuleDTO']],
  ['lib/typed-mind-test-suite/scenarios/scenario-34-cli-tool.tmd', ['TaskConstants', 'WorkerConstants']],
  ['lib/typed-mind-test-suite/scenarios/scenario-48-constants-edge-cases.tmd', ['ConfigSchema']],
  ['lib/typed-mind-test-suite/scenarios/scenario-59-program-classfile-entrypoint.tmd', ['ConfigSchema']],
  [
    'lib/typed-mind-test-suite/scenarios/scenario-60-constants-schema-validation.tmd',
    ['AppConfigSchema', 'ApiConfigSchema', 'InvalidSchema', 'BadSchema', 'NestedSchema', 'MethodSchema', 'SharedSchema', 'SecretSchema'],
  ],
  ['lib/typed-mind-test-suite/scenarios/scenario-62-dependency-consumption.tmd', ['ConstantsSchema']],
  ['lib/typed-mind-test-suite/scenarios/scenario-63-file-isolation-patterns.tmd', ['AuthConfigSchema']],
] as const;

for (const [path, names] of cases) {
  it(`R6a schema-slot removal restores exactly the attributed orphans: ${path}`, async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const source = readFileSync(join(root, path), 'utf8');
    const targets: readonly string[] = names;
    // These fixtures spell every schema as a bare name on the declaration
    // line; drop only the ` : <target>` slot, nothing else.
    const control = source.replace(/^(\S+ ! \S+) : ([A-Za-z_]\w*)$/gm, (line, head: string, schema: string) =>
      targets.includes(schema) ? head : line,
    );
    assert.notEqual(control, source);
    const orphanMessages = (text: string) => {
      const entities = parser.parse(text).entities;
      const context = new CheckContext({ entities, links: computeLinks(entities), parseDiagnostics: [] });
      checkOrphans(context);
      return context.findings.map((finding) => finding.message).sort();
    };
    const baseline = orphanMessages(source);
    for (const name of targets) assert.equal(baseline.includes(`Orphaned entity '${name}'`), false, name);
    assert.deepEqual(orphanMessages(control), [...baseline, ...targets.map((name) => `Orphaned entity '${name}'`)].sort());
  });
}
