// The one definition of "legal data-type kind": the entity kinds a type
// position (a DTO field, a Constants schema, a generic bound) may name.
// RFC-TM-8 §5 (X-TYPE-7) fixed the set at DTO/Class/TypeDef; RFC-TM-13
// evidence (self-core-dispositions.md, 13 live `dto-field-non-data-type`
// findings) showed the converter fuses a single-class file into a ClassFile.
// A ClassFile is a File fused with its one Class (issue #90 ruling, the
// `entry` row in valid-references.ts reads the File half); a type position
// names the Class half, so the kind is data. check-dto-fields.ts and
// VALID_REFERENCES.schema.to had drifted apart from the generic-declaration
// check, which already admitted ClassFile; every enforcement point now reads
// this list. Function, Asset, UIComponent, Constants, File, Program,
// RunParameter and Dependency stay out — the Function-typed-field ban and the
// Dependency-exports fallback live at their own call sites.

import type { EntityKind } from '../ast/entity-kind.ts';

export const DATA_TYPE_KINDS = ['DTO', 'Class', 'ClassFile', 'TypeDef'] as const satisfies readonly EntityKind[];

export const isDataTypeKind = (kind: EntityKind): boolean => {
  return (DATA_TYPE_KINDS as readonly EntityKind[]).includes(kind);
};
