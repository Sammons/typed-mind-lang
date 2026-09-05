// RFC-TM-3 §5 Q2 immutability fixture (rfc-tm-3-diamond.md §2.2: all fields on
// all semantic classes are readonly). Every statement below is a write that
// must FAIL to typecheck; each sits under @ts-expect-error, so `tsc -p` over
// this directory exits 0 exactly while every field stays readonly. If a field
// ever becomes writable, its @ts-expect-error is unfulfilled (TS2578) and the
// spawning test (src/ast/immutability.test.ts) fails. Marker count is asserted
// there — keep it in sync when fields change.

import type { AssetNode } from '../../src/ast/asset-node.ts';
import type { ClassFileNode } from '../../src/ast/class-file-node.ts';
import type { ClassNode } from '../../src/ast/class-node.ts';
import type { ConstantsNode } from '../../src/ast/constants-node.ts';
import type { DependencyNode } from '../../src/ast/dependency-node.ts';
import type { DtoFieldNode } from '../../src/ast/dto-field-node.ts';
import type { DtoNode } from '../../src/ast/dto-node.ts';
import type { FileNode } from '../../src/ast/file-node.ts';
import type { FunctionNode } from '../../src/ast/function-node.ts';
import type { ProgramNode } from '../../src/ast/program-node.ts';
import type { RunParameterNode } from '../../src/ast/run-parameter-node.ts';
import type { UiComponentNode } from '../../src/ast/ui-component-node.ts';

export const attemptProgramWrites = (node: ProgramNode) => {
  // @ts-expect-error readonly base field
  node.name = 'x';
  // @ts-expect-error readonly base field
  node.span = { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } };
  // @ts-expect-error readonly nested span position
  node.span.start = { line: 2, column: 2 };
  // @ts-expect-error readonly base field
  node.raw = 'x';
  // @ts-expect-error readonly base field
  node.comment = 'x';
  // @ts-expect-error readonly kind discriminant
  node.kind = 'Program';
  // @ts-expect-error readonly field
  node.entry = 'x';
  // @ts-expect-error readonly field
  node.purpose = 'x';
  // @ts-expect-error readonly field
  node.version = 'x';
  // @ts-expect-error readonly field
  node.exports = [];
};

export const attemptFileWrites = (node: FileNode) => {
  // @ts-expect-error readonly kind discriminant
  node.kind = 'File';
  // @ts-expect-error readonly field
  node.path = 'x';
  // @ts-expect-error readonly field
  node.imports = [];
  // @ts-expect-error readonly field
  node.exports = [];
  // @ts-expect-error readonly field
  node.purpose = 'x';
};

export const attemptFunctionWrites = (node: FunctionNode) => {
  // @ts-expect-error readonly kind discriminant
  node.kind = 'Function';
  // @ts-expect-error readonly field
  node.signature = 'x';
  // @ts-expect-error readonly field
  node.calls = [];
  // @ts-expect-error readonly array — push does not exist on readonly string[]
  node.calls.push('x');
  // @ts-expect-error readonly field
  node.pendingDependencies = [];
  // @ts-expect-error readonly field
  node.description = 'x';
  // @ts-expect-error readonly field
  node.input = 'x';
  // @ts-expect-error readonly field
  node.output = 'x';
  // @ts-expect-error readonly field
  node.affects = [];
  // @ts-expect-error readonly field
  node.consumes = [];
};

export const attemptClassWrites = (node: ClassNode) => {
  // @ts-expect-error readonly kind discriminant
  node.kind = 'Class';
  // @ts-expect-error readonly field
  node.implements = [];
  // @ts-expect-error readonly field
  node.methods = [];
  // @ts-expect-error readonly field
  node.extends = 'x';
  // @ts-expect-error readonly field
  node.purpose = 'x';
};

export const attemptClassFileWrites = (node: ClassFileNode) => {
  // @ts-expect-error readonly kind discriminant
  node.kind = 'ClassFile';
  // @ts-expect-error readonly field
  node.path = 'x';
  // @ts-expect-error readonly field
  node.implements = [];
  // @ts-expect-error readonly field
  node.methods = [];
  // @ts-expect-error readonly field
  node.imports = [];
  // @ts-expect-error readonly field
  node.exports = [];
  // @ts-expect-error readonly field
  node.extends = 'x';
  // @ts-expect-error readonly field
  node.purpose = 'x';
};

export const attemptConstantsWrites = (node: ConstantsNode) => {
  // @ts-expect-error readonly field
  node.calls = [];
  // @ts-expect-error readonly array
  node.calls.push('target');
  // @ts-expect-error readonly kind discriminant
  node.kind = 'Constants';
  // @ts-expect-error readonly field
  node.path = 'x';
  // @ts-expect-error readonly field
  node.schema = 'x';
  // @ts-expect-error readonly field
  node.purpose = 'x';
};

export const attemptDtoWrites = (node: DtoNode) => {
  // @ts-expect-error readonly kind discriminant
  node.kind = 'DTO';
  // @ts-expect-error readonly field
  node.fields = [];
  // @ts-expect-error readonly array — push does not exist on readonly DtoFieldNode[]
  node.fields.push(undefined);
  // @ts-expect-error readonly field
  node.purpose = 'x';
};

export const attemptAssetWrites = (node: AssetNode) => {
  // @ts-expect-error readonly kind discriminant
  node.kind = 'Asset';
  // @ts-expect-error readonly field
  node.description = 'x';
  // @ts-expect-error readonly field
  node.containsProgram = 'x';
};

export const attemptUiComponentWrites = (node: UiComponentNode) => {
  // @ts-expect-error readonly kind discriminant
  node.kind = 'UIComponent';
  // @ts-expect-error readonly field
  node.purpose = 'x';
  // @ts-expect-error readonly field
  node.root = true;
  // @ts-expect-error readonly field
  node.contains = [];
  // @ts-expect-error readonly field
  node.declaredContainedBy = [];
  // @ts-expect-error readonly field
  node.declaredAffectedBy = [];
};

export const attemptRunParameterWrites = (node: RunParameterNode) => {
  // @ts-expect-error readonly kind discriminant
  node.kind = 'RunParameter';
  // @ts-expect-error readonly field
  node.paramType = 'env';
  // @ts-expect-error readonly field
  node.description = 'x';
  // @ts-expect-error readonly field
  node.defaultValue = 'x';
  // @ts-expect-error readonly field
  node.required = true;
};

export const attemptDependencyWrites = (node: DependencyNode) => {
  // @ts-expect-error readonly kind discriminant
  node.kind = 'Dependency';
  // @ts-expect-error readonly field
  node.purpose = 'x';
  // @ts-expect-error readonly field
  node.version = 'x';
  // @ts-expect-error readonly field
  node.exports = [];
};

export const attemptDtoFieldWrites = (node: DtoFieldNode) => {
  // @ts-expect-error readonly field
  node.name = 'x';
  // @ts-expect-error readonly field
  node.type = 'x';
  // @ts-expect-error readonly field
  node.optionalityMarker = 'none';
  // @ts-expect-error readonly field
  node.description = 'x';
  // @ts-expect-error readonly field
  node.span = { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } };
  // @ts-expect-error derived getter has no setter
  node.isOptional = true;
};
