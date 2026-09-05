import { ClassFileNode } from './class-file-node.ts';
import { ClassNode } from './class-node.ts';
import { DtoNode } from './dto-node.ts';
import type { EntityNode } from './entity-node.ts';
import { FunctionNode } from './function-node.ts';
import { TypeDefNode } from './type-def-node.ts';
import type { TypeParameterNode } from './type-parameter-node.ts';

export const parametersOf = (entity: EntityNode): readonly TypeParameterNode[] | undefined => {
  if (
    entity instanceof ClassNode ||
    entity instanceof ClassFileNode ||
    entity instanceof DtoNode ||
    entity instanceof FunctionNode ||
    entity instanceof TypeDefNode
  )
    return entity.typeParameters;
  return undefined;
};
