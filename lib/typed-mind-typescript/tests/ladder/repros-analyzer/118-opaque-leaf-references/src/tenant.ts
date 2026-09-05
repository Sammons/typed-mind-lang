// `Base` and `Legacy` are NOT exported: they are retained privately because
// exported surfaces reach them (the live webhookstorage
// packages/core/src/db/tenant-billing.ts:10-21 shape, RFC-TM-14 R3/R4).
type Base = { id: string; name: string };
type Legacy = 'basic' | 'pro';

// Part 1 (R3b): a constructor payload whose opaque leaf is an inline object.
export class Param {
  constructor(args: Base & { kind: Legacy }) {
    void args;
  }
}

// Part 2 (R4a): an alias whose opaque leaf carries a property member, a
// method member, and a quoted key. Double-quoted generic arguments: the
// grammar rejects a single-quoted string inside `<...>` in the alias slot
// (out of scope here; see the fixture README).
export type Persisted = Omit<Base, "id"> & { id: string; tier?: Legacy; send(cmd: Base): Promise<Legacy>; "quoted-key": string };

// Rejected controls: an index signature and an accessor member make the whole
// leaf contribute nothing (only `Omit<Base, "id">` credits `Base` here).
export type IndexControl = Omit<Base, "id"> & { [k: string]: Legacy };
export type AccessorControl = Omit<Base, "id"> & { get x(): Legacy };
