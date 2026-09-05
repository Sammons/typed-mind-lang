// RFC-TM-14 U5a (rfc-tm-14-diamond.md §S5, leaf R6a / delta R6-ann):
// exported constants whose annotations carry a generic, a readonly map, a
// literal union and an array. Corpus shapes: `Record<string, AttachmentRule>`
// (core/pipeline/attachment-rules.ts), `ReadonlyMap<string, CheckCode>`.

export interface Rule {
  ok: boolean;
}

// Generic annotation: the whole `Record<string, Rule>` reaches the schema slot.
export const RULES: Record<string, Rule> = {};

// Readonly map annotation: `ReadonlyMap<string, Rule>` (was reduced to `Map`).
export const NAMES: ReadonlyMap<string, Rule> = new Map();

// String-literal union: round-trips through the quoted longform slot.
export const MODE: 'read' | 'write' = 'read';

// Array annotation: `Rule[]` (was reduced to `Array`); members do not resolve.
export const LIST: Rule[] = [];

// Control: an undeclared schema name yields only the existing finding for an
// unresolved schema — no `checker/generic-*` finding (G2-2, U2-4).
export const BROKEN: NonExistentSchema = {};
