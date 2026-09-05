// G.4 corpus attribution: every removed orphan has a concrete heritage use.
// Removing only those uses restores precisely the old orphan multiset.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { it } from 'node:test';
import { FunctionNode } from '../../typed-mind/src/ast/function-node.ts';
import { CheckContext } from '../../typed-mind/src/checker/check-context.ts';
import { checkOrphans } from '../../typed-mind/src/checker/check-orphans.ts';
import { computeLinks } from '../../typed-mind/src/pipeline/link-index.ts';
import { TypedMindParser } from '../../typed-mind/src/pipeline/typed-mind-parser.ts';
import { WASM_PATH } from './wasm-path.ts';

const root = join(import.meta.dirname, '../../..');
const cases = [
  ['method-calls-example.tmd', ['BaseService', 'BaseProcessor']],
  ['monorepo-program.tmd', ['BaseAPIAdapter']],
  ['naming-edge-cases-example.tmd', ['BaseUserService', '_BaseManager', 'DatabaseConnection', 'BaseLogger']],
  ['examples/example-fixed.tmd', ['BaseController']],
  ['lib/typed-mind-test-suite/scenarios/scenario-01-duplicate-export.tmd', ['BaseService']],
  ['lib/typed-mind-test-suite/scenarios/scenario-39-classfile-basic.tmd', ['BaseController']],
  ['lib/typed-mind-test-suite/scenarios/scenario-40-classfile-naming-conflict.tmd', ['BaseController']],
  ['lib/typed-mind-test-suite/scenarios/scenario-41-classfile-method-calls.tmd', ['BaseController']],
  [
    'lib/typed-mind-test-suite/scenarios/scenario-42-classfile-inheritance.tmd',
    ['BaseController', 'IUserController', 'IAdminController', 'IAuditController'],
  ],
  ['lib/typed-mind-test-suite/scenarios/scenario-43-classfile-auto-export.tmd', ['BaseController']],
  ['lib/typed-mind-test-suite/scenarios/scenario-44-classfile-mixed-entities.tmd', ['BaseController']],
  ['lib/typed-mind-test-suite/scenarios/scenario-35-video-game.tmd', ['AIController']],
] as const;

for (const [path, names] of cases) {
  it(`G heritage removal restores exactly the attributed orphans: ${path}`, async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const source = readFileSync(join(root, path), 'utf8');
    // These historical fixtures use bare, same-line heritage lists. Do not
    // rewrite declarations, method calls, imports, or other references.
    const targets: readonly string[] = names;
    const control = source.replace(/^([^\n]*?) <: ([A-Za-z_][\w]*(?:, [A-Za-z_][\w]*)*)$/gm, (line, head: string, bases: string) => {
      const remaining = bases.split(', ').filter((name) => !targets.includes(name));
      if (remaining.length === bases.split(', ').length) return line;
      return `${head}${remaining.length > 0 ? ` <: ${remaining.join(', ')}` : head.includes('#:') ? '' : ' <:'}`;
    });
    assert.notEqual(control, source);
    assert.deepEqual(
      parser.parse(control).entities.map(({ kind, name }) => [kind, name]),
      parser.parse(source).entities.map(({ kind, name }) => [kind, name]),
      'removing heritage must preserve every declaration identity and kind',
    );
    const orphanMessages = (text: string) => {
      const outcome = parser.parse(text);
      // Q's separate call-removal control proves AIController still has a
      // heritage use. Remove those calls in both sides of this G control.
      const entities = outcome.entities.map((entity) =>
        path.endsWith('scenario-35-video-game.tmd') && entity instanceof FunctionNode
          ? new FunctionNode({
              name: entity.name,
              span: entity.span,
              raw: entity.raw,
              sourceForm: entity.sourceForm,
              signature: entity.signature,
              pendingDependencies: entity.pendingDependencies,
              ...(entity.comment === undefined ? {} : { comment: entity.comment }),
              ...(entity.description === undefined ? {} : { description: entity.description }),
              ...(entity.input === undefined ? {} : { input: entity.input }),
              ...(entity.output === undefined ? {} : { output: entity.output }),
              ...(entity.affects === undefined ? {} : { affects: entity.affects }),
              ...(entity.consumes === undefined ? {} : { consumes: entity.consumes }),
              ...(entity.typeParameters === undefined ? {} : { typeParameters: entity.typeParameters }),
              calls: entity.calls.filter((call) => !call.startsWith('AIController.')),
            })
          : entity,
      );
      const context = new CheckContext({ entities, links: computeLinks(entities), parseDiagnostics: [] });
      checkOrphans(context);
      return context.findings.map((finding) => finding.message).sort();
    };
    const baseline = orphanMessages(source);
    for (const name of targets) assert.equal(baseline.includes(`Orphaned entity '${name}'`), false);
    assert.deepEqual(orphanMessages(control), [...baseline, ...targets.map((name) => `Orphaned entity '${name}'`)].sort());
  });
}
