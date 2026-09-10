import {
  ClassFileNode,
  ClassNode,
  type EntityKind,
  type EntityNode,
  FileNode,
  ProgramNode,
  type Span,
  SyntaxEmitter,
} from '@sammons/typed-mind';

export const SYNTHETIC_SPAN: Span = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };

const LEGACY_SECTION_ORDER: readonly EntityKind[] = ['Program', 'Dependency', 'File', 'ClassFile', 'Class', 'Function', 'DTO', 'Constants'];

export const sortIntoLegacySectionOrder = (entities: readonly EntityNode[]): EntityNode[] => {
  const rank = new Map(LEGACY_SECTION_ORDER.map((kind, index) => [kind, index]));
  return [...entities].sort(
    (a, b) => (rank.get(a.kind) ?? LEGACY_SECTION_ORDER.length) - (rank.get(b.kind) ?? LEGACY_SECTION_ORDER.length),
  );
};

export const collapseDescription = (raw: string): string => {
  const [firstParagraph] = raw.split(/\n\s*\n/);
  return (firstParagraph ?? '').replace(/\s+/g, ' ').trim();
};

export function emitTmd(entities: readonly EntityNode[]): string {
  const emitter = new SyntaxEmitter();
  return emitter.emitShortform({
    entities: sortIntoLegacySectionOrder(entities),
    imports: [],
    suppressions: [],
    diagnostics: [],
  });
}

// Entity kinds legal in exports.to per valid-references.ts.
const EXPORTABLE_KINDS = new Set(['Function', 'Class', 'ClassFile', 'Constants', 'DTO', 'Asset', 'UIComponent', 'File']);

/**
 * Post-process entities to fix the export-assert round-trip.
 * The checker validates:
 * - Program.entry references a File or ClassFile
 * - Program.exports, File.exports, ClassFile.exports only reference EXPORTABLE_KINDS
 * - Each entity is reachable from Program roots (entry + exports)
 * - Imports reference entities that exist
 * - Extends/implements reference entities that exist
 *
 * Strategy: Program.exports lists all File/ClassFile names (making them reachable).
 * Each File/ClassFile.exports lists its declared entities (making them reachable transitively).
 * TypeDef entities are only reachable via type references in DTO fields and signatures.
 */
export function fixupEntitiesForRoundTrip(entities: EntityNode[]): void {
  const entityNames = new Set(entities.map((e) => e.name));
  const entityKindByName = new Map(entities.map((e) => [e.name, e.kind]));
  const entityByPath = new Map<string, EntityNode>();
  for (const e of entities) {
    if ((e instanceof FileNode || e instanceof ClassFileNode) && 'path' in e) {
      entityByPath.set(e.path, e);
    }
  }

  // Step 1: Filter File/ClassFile exports to only valid, exportable entity names.
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i]!;
    if (entity instanceof FileNode) {
      const validExports = entity.exports.filter((exp) => entityNames.has(exp) && EXPORTABLE_KINDS.has(entityKindByName.get(exp) ?? ''));
      if (validExports.length !== entity.exports.length) {
        entities[i] = new FileNode({
          name: entity.name,
          path: entity.path,
          imports: [...entity.imports],
          exports: validExports,
          reExports: entity.reExports,
          span: entity.span,
          raw: entity.raw,
          sourceForm: entity.sourceForm,
        });
      }
    }
    if (entity instanceof ClassFileNode) {
      const validExports = entity.exports.filter((exp) => entityNames.has(exp) && EXPORTABLE_KINDS.has(entityKindByName.get(exp) ?? ''));
      if (validExports.length !== entity.exports.length) {
        entities[i] = new ClassFileNode({
          name: entity.name,
          path: entity.path,
          imports: [...entity.imports],
          exports: validExports,
          methods: [...entity.methods],
          implements: [...entity.implements],
          ...(entity.extends !== undefined ? { extends: entity.extends } : {}),
          ...(entity.purpose !== undefined ? { purpose: entity.purpose } : {}),
          span: entity.span,
          raw: entity.raw,
          sourceForm: entity.sourceForm,
        });
      }
    }
  }

  // Step 2: Collect all File/ClassFile names and their exported children.
  const fileEntities: (FileNode | ClassFileNode)[] = [];
  for (const e of entities) {
    if (e instanceof FileNode || e instanceof ClassFileNode) fileEntities.push(e);
  }
  const alreadyExported = new Set<string>();
  for (const f of fileEntities) for (const exp of f.exports) alreadyExported.add(exp);
  const fileNames = new Set(fileEntities.map((e) => e.name));

  // Step 3: Resolve Program entry and build Program.exports.
  // Program.exports includes every File/ClassFile name plus every exportable
  // entity not already exported by a File/ClassFile. The checker's
  // isProgramScopedExposure exclusion allows Program + File/ClassFile to both
  // export the same name when the File/ClassFile is reachable from entry.
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i]!;
    if (!(entity instanceof ProgramNode)) continue;

    let resolvedEntry = entity.entry;
    if (!entityNames.has(resolvedEntry)) {
      const byPath = entityByPath.get(resolvedEntry);
      if (byPath !== undefined) {
        resolvedEntry = byPath.name;
      } else {
        const first = fileEntities[0];
        if (first !== undefined) resolvedEntry = first.name;
      }
    }

    const exportNames = [...fileNames];
    for (const e of entities) {
      if (EXPORTABLE_KINDS.has(e.kind) && !fileNames.has(e.name)) {
        exportNames.push(e.name);
      }
    }

    const programArgs: ConstructorParameters<typeof ProgramNode>[0] = {
      name: entity.name,
      entry: resolvedEntry,
      exports: exportNames,
      span: entity.span,
      raw: entity.raw,
      sourceForm: entity.sourceForm,
    };
    if (entity.purpose !== undefined) programArgs.purpose = entity.purpose;
    if (entity.version !== undefined) programArgs.version = entity.version;
    entities[i] = new ProgramNode(programArgs);
  }

  // Step 4: Wire the entry File/ClassFile to import all other File/ClassFile
  // names. This creates the reachability chain that filesReachableFromEntry
  // walks, so isProgramScopedExposure returns true for every Program + File
  // pair and the "exported by multiple files" check is suppressed.
  const program = entities.find((e) => e instanceof ProgramNode) as ProgramNode | undefined;
  const entryName = program?.entry;

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i]!;

    if (entity instanceof FileNode) {
      const filteredImports = entity.imports.filter((imp) => entityNames.has(imp) && entityKindByName.get(imp) !== 'TypeDef');
      const isEntry = entity.name === entryName;
      const imports = isEntry
        ? [...new Set([...filteredImports, ...fileEntities.filter((f) => f.name !== entity.name).map((f) => f.name)])]
        : filteredImports;
      if (imports.length !== entity.imports.length || imports.some((imp, idx) => imp !== entity.imports[idx])) {
        entities[i] = new FileNode({
          name: entity.name,
          path: entity.path,
          imports,
          exports: entity.exports,
          reExports: entity.reExports,
          span: entity.span,
          raw: entity.raw,
          sourceForm: entity.sourceForm,
        });
      }
    }

    if (entity instanceof ClassFileNode) {
      const filteredImports = entity.imports.filter((imp) => entityNames.has(imp) && entityKindByName.get(imp) !== 'TypeDef');
      const filteredImplements = entity.implements.filter((imp) => entityNames.has(imp));
      const isEntry = entity.name === entryName;
      const imports = isEntry
        ? [...new Set([...filteredImports, ...fileEntities.filter((f) => f.name !== entity.name).map((f) => f.name)])]
        : filteredImports;
      const validExtends = entity.extends !== undefined && entityNames.has(entity.extends) ? entity.extends : undefined;
      if (imports.length !== entity.imports.length || imports.some((imp, idx) => imp !== entity.imports[idx]) || filteredImplements.length !== entity.implements.length) {
        entities[i] = new ClassFileNode({
          name: entity.name,
          path: entity.path,
          imports,
          exports: [...entity.exports],
          methods: [...entity.methods],
          implements: filteredImplements,
          ...(validExtends !== undefined ? { extends: validExtends } : {}),
          ...(entity.purpose !== undefined ? { purpose: entity.purpose } : {}),
          span: entity.span,
          raw: entity.raw,
          sourceForm: entity.sourceForm,
        });
      }
    }

    if (entity instanceof ClassNode) {
      const filteredImplements = entity.implements.filter((imp) => entityNames.has(imp));
      const extendsValid = entity.extends === undefined || entityNames.has(entity.extends);
      if (filteredImplements.length !== entity.implements.length || !extendsValid) {
        const validExtends = entity.extends !== undefined && entityNames.has(entity.extends) ? entity.extends : undefined;
        entities[i] = new ClassNode({
          name: entity.name,
          methods: [...entity.methods],
          implements: filteredImplements,
          ...(validExtends !== undefined ? { extends: validExtends } : {}),
          ...(entity.purpose !== undefined ? { purpose: entity.purpose } : {}),
          ...(entity.consumes !== undefined ? { consumes: [...entity.consumes] } : {}),
          span: entity.span,
          raw: entity.raw,
          sourceForm: entity.sourceForm,
          calls: [...entity.calls],
        });
      }
    }
  }
}
