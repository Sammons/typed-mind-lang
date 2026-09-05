import assert from 'node:assert/strict';
import { it } from 'node:test';
import { TypedMind } from '@sammons/typed-mind';
import { InteractiveTypedMindRenderer } from './interactive-renderer.ts';

it('TM13 F: renderer exposes Constants initializer call edges', async () => {
  const mind = await TypedMind.create();
  const renderer = new InteractiveTypedMindRenderer({});
  renderer.setGraph(mind.parse('used :: () => void\nConfig ! config.ts\n  ~> [used]'));
  assert.deepEqual(renderer.getGraphSnapshot().links, [{ source: 'Config', target: 'used', type: 'call' }]);
});

it('TM13 F+Q: renderer resolves initializer methods to the actual owning class', async () => {
  const mind = await TypedMind.create();
  const renderer = new InteractiveTypedMindRenderer({});
  renderer.setGraph(
    mind.parse('Owner @ owner.ts:\n  -> [Owner.Service]\nOwner.Service <:\n  => [run]\nConfig ! config.ts\n  ~> [Owner.Service.run]'),
  );
  assert.ok(
    renderer.getGraphSnapshot().links.some((link) => link.source === 'Config' && link.target === 'Owner.Service' && link.type === 'call'),
  );
});

it('TM14 U2: renderer draws a Function construct edge spelled Owner.constructor to the owner', async () => {
  const mind = await TypedMind.create();
  const renderer = new InteractiveTypedMindRenderer({});
  renderer.setGraph(
    mind.parse('Walker <:\n  => [walk]\nCursor #: cursor.ts\nwalk :: () => number\n  ~> [Walker.constructor, Cursor.constructor]'),
  );
  assert.deepEqual(
    renderer.getGraphSnapshot().links.filter((link) => link.type === 'call'),
    [
      { source: 'walk', target: 'Walker', type: 'call' },
      { source: 'walk', target: 'Cursor', type: 'call' },
    ],
  );
});

it('TM14 U2: renderer keeps the legacy exact-name call link for a dotted entity the resolver rejects', async () => {
  const mind = await TypedMind.create();
  const renderer = new InteractiveTypedMindRenderer({});
  // `Holder.Service` declares a Class-owned dotted entity; the checker
  // reports it (`qualified-name-unresolved`, invalid owner) and the resolver
  // returns no target, but the graph drew the declared entity before U2
  // through the exact-name lookup and still does.
  renderer.setGraph(mind.parse('Holder <:\n  => [go]\nHolder.Service <:\n  => [run]\nuse :: () => void\n  ~> [Holder.Service]'));
  assert.deepEqual(
    renderer.getGraphSnapshot().links.filter((link) => link.type === 'call'),
    [{ source: 'use', target: 'Holder.Service', type: 'call' }],
  );
});
