// RFC-TM-3 §3.5 / §5 Q4 (rfc-tm-3-diamond.md) — LinkIndex fixture graph:
// every lookup asserted against hand-computed expectations, including
// Reference.fromType, the Dependency importedBy routing, the Program-entry
// reference, and the declared-vs-derived contract (a declaredContainedBy entry
// absent from the derived index survives on the node and is not synthesized
// into the index). Entities carry no reverse-link fields — the phase writes
// nothing back onto nodes.

import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { UiComponentNode } from '../ast/ui-component-node.ts';
import { computeLinks, type LinkIndex } from './link-index.ts';
import type { ParseOutcome } from './parse-outcome.ts';
import { TypedMindParser } from './typed-mind-parser.ts';

const testDir = dirname(fileURLToPath(import.meta.url));
const packageDir = join(testDir, '..', '..');
const wasmPath = join(packageDir, 'grammar', 'grammar.wasm');

// The fixture graph exercises all thirteen forward fields the index derives
// from, plus the §3.4 composition (notify's affects comes from a distributed
// mixed list, not an `~ [...]` continuation).
const FIXTURE = [
  'App -> MainFile "Fixture app" v1.0.0',
  'MainFile @ src/main.ts:',
  '  <- [lodash, Helpers, UserService]',
  '  -> [start]',
  'Helpers @ src/helpers.ts:',
  '  -> [formatDate]',
  'formatDate :: () => string',
  'start :: (input: StartDTO) => ResultDTO',
  '  <- StartDTO',
  '  -> ResultDTO',
  '  ~> [UserService.create, formatDate]',
  '  ~ [Dashboard]',
  '  $< [API_KEY, Logo, Config]',
  'notify :: () => void',
  '  <- [Dashboard]',
  'UserService #: src/services/user.ts <: BaseService, ISerializable',
  '  => [create]',
  'BaseService <: Renderable',
  'ISerializable <: Marker',
  'Root &! "Root component"',
  '  > [Dashboard]',
  'Dashboard & "Dashboard"',
  '  < [Root]',
  'Widget & "Widget"',
  '  < [Root]',
  'API_KEY $env "API key" (required)',
  'Logo ~ "Logo asset"',
  '  >> App',
  'Config ! src/config.ts : ConfigSchema',
  'ConfigSchema % "Config schema"',
  'StartDTO % "Start input"',
  'ResultDTO % "Result output"',
  'lodash ^ "Utility library" v4.17.21',
  '',
].join('\n');

describe('computeLinks / LinkIndex (§3.5)', () => {
  let outcome: ParseOutcome;
  let index: LinkIndex;

  before(async () => {
    const parser = await TypedMindParser.create({ wasmPath });
    outcome = parser.parse(FIXTURE);
    index = computeLinks(outcome.entities);
  });

  it('parses the fixture graph clean (no diagnostics beyond none expected)', () => {
    assert.deepEqual(outcome.diagnostics, []);
  });

  it('derives every lookup from forward fields, hand-computed (incl. Reference.fromType, Dependency importedBy, Program entry)', () => {
    assert.deepEqual(
      {
        // Program entry: App -> MainFile.
        mainFileRefs: index.referencedBy('MainFile'),
        // File imports of non-Dependency targets land in referencedBy...
        helpersRefs: index.referencedBy('Helpers'),
        // ...while imports of a Dependency route to importedBy INSTEAD
        // (validator.ts:1305-1320 routing); non-Dependency imports never
        // appear in importedBy.
        lodashRefs: index.referencedBy('lodash'),
        lodashImportedBy: index.importedBy('lodash'),
        helpersImportedBy: index.importedBy('Helpers'),
        // File exports; Function dotted call (base name before '.');
        // ClassFile auto-self-export (parser.ts:287 replication).
        startRefs: index.referencedBy('start'),
        formatDateRefs: index.referencedBy('formatDate'),
        userServiceRefs: index.referencedBy('UserService'),
        // ClassFile extends / implements.
        baseServiceRefs: index.referencedBy('BaseService'),
        serializableRefs: index.referencedBy('ISerializable'),
        // Function input / output DTOs.
        startDtoRefs: index.referencedBy('StartDTO'),
        resultDtoRefs: index.referencedBy('ResultDTO'),
        // affects (incl. notify's §3.4-distributed list) + UIComponent contains.
        dashboardRefs: index.referencedBy('Dashboard'),
        dashboardAffectedBy: index.affectedBy('Dashboard'),
        dashboardContainedBy: index.containedBy('Dashboard'),
        // consumes: kind-agnostic derivation (RunParameter, Asset, Constants).
        apiKeyConsumedBy: index.consumedBy('API_KEY'),
        logoConsumedBy: index.consumedBy('Logo'),
        configConsumedBy: index.consumedBy('Config'),
        apiKeyRefs: index.referencedBy('API_KEY'),
        // Asset containsProgram; Constants schema.
        appRefs: index.referencedBy('App'),
        configSchemaRefs: index.referencedBy('ConfigSchema'),
        // Unknown names resolve to empty lookups.
        unknownRefs: index.referencedBy('Nope'),
        unknownContainedBy: index.containedBy('Nope'),
      },
      {
        mainFileRefs: [{ from: 'App', fromType: 'Program' }],
        helpersRefs: [{ from: 'MainFile', fromType: 'File' }],
        lodashRefs: [],
        lodashImportedBy: ['MainFile'],
        helpersImportedBy: [],
        startRefs: [{ from: 'MainFile', fromType: 'File' }],
        formatDateRefs: [
          { from: 'Helpers', fromType: 'File' },
          { from: 'start', fromType: 'Function' },
        ],
        userServiceRefs: [
          { from: 'MainFile', fromType: 'File' },
          { from: 'start', fromType: 'Function' },
          { from: 'UserService', fromType: 'ClassFile' },
        ],
        baseServiceRefs: [{ from: 'UserService', fromType: 'ClassFile' }],
        serializableRefs: [{ from: 'UserService', fromType: 'ClassFile' }],
        startDtoRefs: [{ from: 'start', fromType: 'Function' }],
        resultDtoRefs: [{ from: 'start', fromType: 'Function' }],
        dashboardRefs: [
          { from: 'start', fromType: 'Function' },
          { from: 'notify', fromType: 'Function' },
          { from: 'Root', fromType: 'UIComponent' },
        ],
        dashboardAffectedBy: ['start', 'notify'],
        dashboardContainedBy: ['Root'],
        apiKeyConsumedBy: ['start'],
        logoConsumedBy: ['start'],
        configConsumedBy: ['start'],
        apiKeyRefs: [{ from: 'start', fromType: 'Function' }],
        appRefs: [{ from: 'Logo', fromType: 'Asset' }],
        configSchemaRefs: [{ from: 'Config', fromType: 'Constants' }],
        unknownRefs: [],
        unknownContainedBy: [],
      },
    );
  });

  it('declared-vs-derived (F1): a declaredContainedBy entry absent from the derived index survives on the node and is NOT synthesized into the index', () => {
    const widget = outcome.entities.find((entity) => entity.name === 'Widget');
    assert.deepEqual(
      {
        declaredContainedBy: widget instanceof UiComponentNode ? widget.declaredContainedBy : undefined,
        derivedContainedBy: index.containedBy('Widget'),
        // The declared claim is also NOT an input to referencedBy: Widget's
        // `< [Root]` produces no reference from Widget onto Root.
        rootRefs: index.referencedBy('Root'),
      },
      {
        declaredContainedBy: ['Root'],
        derivedContainedBy: [],
        rootRefs: [],
      },
    );
  });

  it('entities carry no reverse-link fields — the phase writes nothing back onto nodes', () => {
    const reverseLinkFields = ['referencedBy', 'containedBy', 'affectedBy', 'consumedBy', 'importedBy'];
    const leaked = outcome.entities.filter((entity) => reverseLinkFields.some((field) => field in entity)).map((entity) => entity.name);
    assert.deepEqual(leaked, []);
  });
});
