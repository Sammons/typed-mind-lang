// RFC-TM-14 §S3 (rfc-tm-14-diamond.md, Quantum U3a): Class and ClassFile
// `calls` draw renderer call links (both renderer classes), and
// `calls`/`consumes` are dependencies for the graph metrics — the TM-13 F
// shape (constants-calls.test.ts) applied to the two class kinds.
import assert from 'node:assert/strict';
import { it } from 'node:test';
import { TypedMind } from '@sammons/typed-mind';
import { EnhancedTypedMindRenderer } from './enhanced-index.ts';
import { InteractiveTypedMindRenderer } from './interactive-renderer.ts';
import { GraphMetricsAnalyzer } from './metrics/graph-metrics.ts';

const source = [
  'helper :: () => void',
  'LIMIT ! limits.ts',
  'Widget <:',
  '  => [render]',
  'Service <:',
  '  ~> [helper, Widget.render]',
  '  $< [LIMIT]',
  'Store #: store.ts',
  '  ~> [helper, Widget.render]',
  '  $< [LIMIT]',
].join('\n');

const expectedCallLinks = [
  { source: 'Service', target: 'helper', type: 'call' },
  { source: 'Service', target: 'Widget', type: 'call' },
  { source: 'Store', target: 'helper', type: 'call' },
  { source: 'Store', target: 'Widget', type: 'call' },
];

it('TM14 U3: both renderers draw Class and ClassFile call links, member targets resolved to their owner', async () => {
  const mind = await TypedMind.create();
  const graph = mind.parse(source);
  const interactive = new InteractiveTypedMindRenderer({});
  interactive.setGraph(graph);
  const enhanced = new EnhancedTypedMindRenderer({});
  enhanced.setGraph(graph);
  assert.deepEqual(
    interactive.getGraphSnapshot().links.filter((link) => link.type === 'call'),
    expectedCallLinks,
  );
  assert.deepEqual(
    enhanced.getGraphSnapshot().links.filter((link) => link.type === 'call'),
    expectedCallLinks,
  );
});

it('TM14 U3: graph metrics count Class and ClassFile calls and consumes as dependencies', async () => {
  const mind = await TypedMind.create();
  const graph = mind.parse(source);
  const { detailedMetrics } = new GraphMetricsAnalyzer(graph).analyzeGraph();
  const names = graph.entities.map((entity) => entity.name);
  const matrix = detailedMetrics['dependencyMatrix'] as number[][];
  const dependenciesOf = (name: string) => names.filter((_target, column) => matrix[names.indexOf(name)]?.[column] === 1);
  // `Widget.render` is looked up by raw name here (Function-arm parity at
  // this head); U2 migrates the metrics lookup to the qualified resolver.
  const bareTargets = (name: string) => dependenciesOf(name).filter((target) => target !== 'Widget');
  assert.deepEqual(
    { service: bareTargets('Service'), store: bareTargets('Store') },
    { service: ['helper', 'LIMIT'], store: ['helper', 'LIMIT'] },
  );
});
