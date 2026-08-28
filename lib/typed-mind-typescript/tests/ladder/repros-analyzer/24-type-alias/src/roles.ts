// RFC-TM-9 §4 (rfc-tm-9-diamond.md, X-CONV-2) fixture — a union type alias
// ("like an enum", the pre-TM-9 `L-g3`/`A-g9` misencoding target) and a
// simple named-type alias. Both must emit as TM-8's TypeDef entity kind,
// never the deleted self-referential Constants path.
export type Role = 'admin' | 'member';

export type RoleId = string;
