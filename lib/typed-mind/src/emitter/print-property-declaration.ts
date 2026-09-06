import type { PropertyDeclarationNode } from '../ast/class-members.ts';
import { printTypeExpr } from './print-type-expr.ts';

// RFC-TM-14 §S4 R3a (rfc-tm-14-diamond.md): the `property:` payload,
// `[readonly] name[?]: Type` — the DTO field shape, one member kind over.
// Shared by the longform emitter and the LSP hover (exported from index.ts
// beside printSignature).
export const printPropertyDeclaration = (member: PropertyDeclarationNode): string =>
  `${member.readonly ? 'readonly ' : ''}${member.name}${member.optionality === 'question' ? '?' : ''}: ${printTypeExpr(member.typeExpr)}`;
