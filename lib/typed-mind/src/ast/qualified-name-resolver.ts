import { ClassFileNode } from './class-file-node.ts';
import { ClassNode } from './class-node.ts';
import { ConstantsNode } from './constants-node.ts';
import { DependencyNode } from './dependency-node.ts';
import { DtoNode } from './dto-node.ts';
import type { EntityNode } from './entity-node.ts';
import { FileNode } from './file-node.ts';

export type QualifiedNameResolution =
  | { readonly kind: 'entity'; readonly entity: EntityNode }
  | { readonly kind: 'external'; readonly owner: DependencyNode; readonly member: string }
  | { readonly kind: 'member'; readonly owner: ClassNode | ClassFileNode | ConstantsNode; readonly member: string }
  | {
      readonly kind: 'unresolved';
      readonly name: string;
      readonly ownerName: string;
      readonly member: string;
      readonly reason: 'missing-name' | 'missing-owner' | 'invalid-owner' | 'missing-member' | 'private-member';
    };

// The implicit member of every Class and ClassFile (RFC-TM-14 §S2). Member
// tables in this resolver are `Map`s, so the prototype key is inert here.
export const CONSTRUCTOR_MEMBER = 'constructor';

export const resolvedNameTarget = (result: QualifiedNameResolution): EntityNode | undefined => {
  switch (result.kind) {
    case 'entity':
      return result.entity;
    case 'external':
    case 'member':
      return result.owner;
    case 'unresolved':
      return undefined;
  }
};

// A dotted declaration is an explicit ownership assertion, independent of
// public exports. This pure index is shared by checks, graph links and LSP.
export class QualifiedNameResolver {
  readonly #byName: ReadonlyMap<string, EntityNode>;
  readonly #declaredMembers = new Map<string, Map<string, EntityNode>>();

  constructor(byName: ReadonlyMap<string, EntityNode>) {
    this.#byName = byName;
    for (const entity of byName.values()) {
      const separator = entity.name.lastIndexOf('.');
      if (separator < 0) {
        continue;
      }
      const owner = entity.name.slice(0, separator);
      const member = entity.name.slice(separator + 1);
      const members = this.#declaredMembers.get(owner) ?? new Map<string, EntityNode>();
      members.set(member, entity);
      this.#declaredMembers.set(owner, members);
    }
  }

  target(name: string): EntityNode | undefined {
    return resolvedNameTarget(this.resolve(name));
  }

  // Export entries may spell an owned declaration by its local suffix. A
  // declared entity wins over a same-spelling method or bare global entity.
  resolveExport(ownerName: string, name: string): QualifiedNameResolution {
    const owner = this.#byName.get(ownerName);
    if (!name.includes('.') && (owner instanceof FileNode || owner instanceof ClassFileNode)) {
      const declared = this.#declaredMembers.get(ownerName)?.get(name);
      if (declared !== undefined) return this.resolve(declared.name);
    }
    return this.resolve(name, { importingFile: ownerName });
  }

  resolve(name: string, options: { readonly importingFile?: string } = {}): QualifiedNameResolution {
    return this.resolveWithState(name, options, new Set());
  }

  private resolveWithState(name: string, options: { readonly importingFile?: string }, active: Set<string>): QualifiedNameResolution {
    if (active.has(name)) {
      return { kind: 'unresolved', name, ownerName: name, member: '', reason: 'invalid-owner' };
    }
    active.add(name);
    const result = this.resolveOne(name, options, active);
    active.delete(name);
    return result;
  }

  private resolveOne(name: string, options: { readonly importingFile?: string }, active: Set<string>): QualifiedNameResolution {
    if (!name.includes('.')) {
      const entity = this.#byName.get(name);
      return entity === undefined
        ? { kind: 'unresolved', name, ownerName: '', member: name, reason: 'missing-name' }
        : { kind: 'entity', entity };
    }
    let separator = name.lastIndexOf('.');
    // A declared entity asserts its immediate owner's identity. Falling back
    // to a shorter export owner here could redirect an exact hit to itself.
    const isDeclaredEntity = this.#byName.has(name);
    while (!isDeclaredEntity && separator > 0 && !this.#byName.has(name.slice(0, separator))) {
      separator = name.lastIndexOf('.', separator - 1);
    }
    const ownerName = separator > 0 ? name.slice(0, separator) : name.slice(0, name.indexOf('.'));
    const member = name.slice(ownerName.length + 1);
    const failure = (reason: Extract<QualifiedNameResolution, { kind: 'unresolved' }>['reason']): QualifiedNameResolution => ({
      kind: 'unresolved',
      name,
      ownerName,
      member,
      reason,
    });
    const owner = this.#byName.get(ownerName);
    if (owner === undefined) {
      return failure('missing-owner');
    }
    // Shorter prefixes make recursion strictly decreasing; exact hits cannot
    // bypass the validity of the owner's own dotted declaration.
    if (ownerName.includes('.')) {
      const ownerResult = this.resolveWithState(ownerName, options, active);
      if (ownerResult.kind === 'unresolved') {
        return failure(ownerResult.reason === 'private-member' ? 'private-member' : 'invalid-owner');
      }
    }
    if (owner instanceof FileNode || owner instanceof ClassFileNode) {
      const declared = this.#declaredMembers.get(ownerName)?.get(member);
      const exported = owner.exports.includes(name) || owner.exports.includes(member);
      // RFC-TM-15 §S2 — a `reexports:` entry is bare (a project binding) or
      // `Owner.member` (an external binding forwarded from a Dependency).
      // Both spellings match on the member part; a qualified entry is then
      // resolved on its own, so the result is `external` for a Dependency
      // owner and never the same-spelled local entity.
      const reExportEntry =
        owner instanceof FileNode
          ? owner.reExports.find((entry) => entry === name || entry === member || entry.slice(entry.lastIndexOf('.') + 1) === member)
          : undefined;
      const reExported = reExportEntry !== undefined;
      if (declared !== undefined) {
        if (options.importingFile !== undefined && options.importingFile !== ownerName && !exported && !reExported) {
          return failure('private-member');
        }
        return { kind: 'entity', entity: declared };
      }
      if (!exported && reExportEntry !== undefined && reExportEntry.includes('.')) {
        // The forwarding File is the importer of the forwarded entry, so a
        // File-owned entry keeps its owner's privacy check (a barrel cannot
        // launder a private declaration through `reexports:` no more than
        // through `exports:`); a Dependency owner has no privacy.
        return this.resolveWithState(reExportEntry, { importingFile: ownerName }, active);
      }
      if (exported || reExported) {
        const target = this.#byName.get(name) ?? this.#byName.get(member);
        if (target !== undefined) {
          if (target.name.includes('.')) {
            const targetResult = this.resolveWithState(target.name, { importingFile: ownerName }, active);
            if (targetResult.kind === 'unresolved') {
              return failure(targetResult.reason === 'private-member' ? 'private-member' : 'invalid-owner');
            }
          }
          return { kind: 'entity', entity: target };
        }
      }
      // RFC-TM-14 §S2 — `constructor` is the member every class has; a
      // construct edge is `~> [Owner.constructor]`. It ranks below declared and
      // exported members and above the methods list. A plain File has none.
      if (owner instanceof ClassFileNode && (member === CONSTRUCTOR_MEMBER || owner.methods.includes(member))) {
        if (
          options.importingFile !== undefined &&
          options.importingFile !== ownerName &&
          !ownerName.startsWith(`${options.importingFile}.`)
        ) {
          return failure('private-member');
        }
        return { kind: 'member', owner, member };
      }
      return failure('missing-member');
    }
    if (this.#byName.has(name)) {
      return failure('invalid-owner'); // Dotted declarations require a File/ClassFile owner.
    }
    if (owner instanceof ClassNode) {
      if (
        options.importingFile !== undefined &&
        options.importingFile !== ownerName &&
        !ownerName.startsWith(`${options.importingFile}.`)
      ) {
        return failure('private-member');
      }
      return member === CONSTRUCTOR_MEMBER || owner.methods.includes(member) ? { kind: 'member', owner, member } : failure('missing-member');
    }
    if (owner instanceof ConstantsNode) {
      const schema = owner.schema === undefined ? undefined : resolvedNameTarget(this.resolveWithState(owner.schema, {}, active));
      return schema instanceof DtoNode && schema.fields.some((field) => field.name === member)
        ? { kind: 'member', owner, member }
        : failure('missing-member');
    }
    if (owner instanceof DependencyNode) {
      return owner.exports?.some((exported) => exported === member || exported === name)
        ? { kind: 'external', owner, member }
        : failure('missing-member');
    }
    return failure('invalid-owner');
  }
}
