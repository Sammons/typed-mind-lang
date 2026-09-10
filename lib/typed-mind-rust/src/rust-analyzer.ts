import { readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import type {
  Analyzer,
  AnalyzerDiagnostic,
  ParsedClass,
  ParsedConstant,
  ParsedEnum,
  ParsedExport,
  ParsedFunction,
  ParsedImport,
  ParsedInterface,
  ParsedMethod,
  ParsedModule,
  ParsedParameter,
  ParsedProperty,
  ParsedTypeAlias,
  ProjectAnalysis,
  TreeSitterParser,
} from '@sammons/typed-mind-tree-sitter-common';
import type { Node, Tree } from 'web-tree-sitter';
import { type CargoProject, collectRustFiles, findCargoToml, loadCargoProject } from './rust-project.ts';

// Rust-specific parsed structures extending the shared types.
interface RustImplBlock {
  readonly targetName: string;
  readonly traitName: string | undefined;
  readonly methods: readonly ParsedMethod[];
}

export class RustAnalyzer implements Analyzer {
  readonly #projectPath: string;
  readonly #parser: TreeSitterParser;
  readonly #cargoProject: CargoProject;

  constructor(projectPath: string, parser: TreeSitterParser) {
    this.#projectPath = resolve(projectPath);
    this.#parser = parser;

    const cargoTomlPath = findCargoToml(this.#projectPath);
    if (cargoTomlPath === undefined) {
      throw new Error(`No Cargo.toml found at or above ${this.#projectPath}`);
    }
    this.#cargoProject = loadCargoProject(cargoTomlPath);
  }

  get cargoProject(): CargoProject {
    return this.#cargoProject;
  }

  analyzeFromEntrypoint(entrypoint: string): ProjectAnalysis {
    const diagnostics: AnalyzerDiagnostic[] = [];
    const sourceDir = this.#cargoProject.sourceDir;
    const rsFiles = collectRustFiles(sourceDir, this.#cargoProject.projectRoot);

    // If an explicit entrypoint is given, filter to reachable files.
    // For Rust, all .rs files under src/ are typically part of the crate.
    const entrypointRel = relative(this.#cargoProject.projectRoot, resolve(this.#projectPath, entrypoint));

    const modules: ParsedModule[] = [];
    const allImplBlocks: RustImplBlock[] = [];

    for (const filePath of rsFiles) {
      const absPath = join(this.#cargoProject.projectRoot, filePath);
      let source: string;
      try {
        source = readFileSync(absPath, 'utf-8');
      } catch {
        diagnostics.push({
          severity: 'warning',
          category: 'io',
          message: `Failed to read ${filePath}`,
          filePath,
        });
        continue;
      }

      const tree = this.#parser.parse(source);
      const { module, implBlocks } = this.#analyzeFile(filePath, tree, source);
      modules.push(module);
      allImplBlocks.push(...implBlocks);
    }

    // Merge impl block methods into their target structs/enums.
    this.#mergeImplBlocks(modules, allImplBlocks);

    return {
      modules,
      entryPoints: [entrypointRel],
      projectRoot: this.#cargoProject.projectRoot,
      diagnostics,
    };
  }

  #analyzeFile(filePath: string, tree: Tree, source: string): { module: ParsedModule; implBlocks: RustImplBlock[] } {
    const root = tree.rootNode;
    const imports: ParsedImport[] = [];
    const functions: ParsedFunction[] = [];
    const classes: ParsedClass[] = [];
    const interfaces: ParsedInterface[] = [];
    const types: ParsedTypeAlias[] = [];
    const constants: ParsedConstant[] = [];
    const enums: ParsedEnum[] = [];
    const exports: ParsedExport[] = [];
    const implBlocks: RustImplBlock[] = [];

    for (let i = 0; i < root.childCount; i++) {
      const node = root.child(i);
      if (node === null) continue;

      switch (node.type) {
        case 'use_declaration':
          imports.push(...this.#parseUseDeclaration(node));
          break;
        case 'function_item':
          {
            const fn = this.#parseFunction(node, source);
            if (fn !== undefined) {
              functions.push(fn);
              if (this.#isPublic(node)) {
                exports.push({ name: fn.name, isDefault: false, type: 'function', source: undefined });
              }
            }
          }
          break;
        case 'struct_item':
          {
            const cls = this.#parseStruct(node, source);
            if (cls !== undefined) {
              classes.push(cls);
              if (this.#isPublic(node)) {
                exports.push({ name: cls.name, isDefault: false, type: 'class', source: undefined });
              }
            }
          }
          break;
        case 'enum_item':
          {
            const en = this.#parseEnum(node, source);
            if (en !== undefined) {
              enums.push(en);
              if (this.#isPublic(node)) {
                exports.push({ name: en.name, isDefault: false, type: 'enum', source: undefined });
              }
            }
          }
          break;
        case 'trait_item':
          {
            const iface = this.#parseTrait(node, source);
            if (iface !== undefined) {
              interfaces.push(iface);
              if (this.#isPublic(node)) {
                exports.push({ name: iface.name, isDefault: false, type: 'interface', source: undefined });
              }
            }
          }
          break;
        case 'impl_item':
          {
            const implBlock = this.#parseImplBlock(node, source);
            if (implBlock !== undefined) {
              implBlocks.push(implBlock);
            }
          }
          break;
        case 'type_item':
          {
            const typeAlias = this.#parseTypeAlias(node, source);
            if (typeAlias !== undefined) {
              types.push(typeAlias);
              if (this.#isPublic(node)) {
                exports.push({ name: typeAlias.name, isDefault: false, type: 'type', source: undefined });
              }
            }
          }
          break;
        case 'const_item':
        case 'static_item':
          {
            const constant = this.#parseConstant(node, source);
            if (constant !== undefined) {
              constants.push(constant);
              if (this.#isPublic(node)) {
                exports.push({ name: constant.name, isDefault: false, type: 'constant', source: undefined });
              }
            }
          }
          break;
        case 'mod_item':
          // Module declarations — we handle file-level modules by scanning
          // the filesystem, so inline mod items are noted as imports.
          {
            const modName = this.#getChildByFieldName(node, 'name')?.text;
            if (modName !== undefined) {
              imports.push({
                specifier: modName,
                defaultImport: undefined,
                namedImports: [],
                namespaceImport: modName,
                isTypeOnly: false,
              });
            }
          }
          break;
        // Skip macro_definition, attribute_item at top level, etc.
      }
    }

    return {
      module: { filePath, imports, exports, functions, classes, interfaces, types, constants, enums },
      implBlocks,
    };
  }

  #parseUseDeclaration(node: Node): ParsedImport[] {
    // Extract the use path. Rust use declarations can be complex:
    // `use crate::models::{User, UserRole};`
    // `use std::collections::HashMap;`
    const useNode = this.#isPublic(node) ? node.child(2) : node.child(1);
    if (useNode === null) return [];

    const fullPath = useNode.text;
    const imports: ParsedImport[] = [];

    // Handle use group: `use foo::{Bar, Baz};`
    const useList = this.#findChildByType(useNode, 'use_list');
    if (useList !== null) {
      const names: string[] = [];
      for (let i = 0; i < useList.childCount; i++) {
        const child = useList.child(i);
        if (child !== null && child.type !== ',' && child.type !== '{' && child.type !== '}') {
          names.push(child.text);
        }
      }
      // Specifier is the path before `::{`
      const specifier = fullPath.replace(/::\{.*\}$/, '');
      imports.push({
        specifier,
        defaultImport: undefined,
        namedImports: names,
        namespaceImport: undefined,
        isTypeOnly: false,
      });
    } else {
      // Single import: `use foo::Bar;`
      const parts = fullPath.replace(/;$/, '').split('::');
      const lastName = parts[parts.length - 1] ?? fullPath;
      imports.push({
        specifier: fullPath.replace(/;$/, ''),
        defaultImport: undefined,
        namedImports: [lastName],
        namespaceImport: undefined,
        isTypeOnly: false,
      });
    }

    return imports;
  }

  #parseFunction(node: Node, source: string): ParsedFunction | undefined {
    const nameNode = this.#getChildByFieldName(node, 'name');
    if (nameNode === null) return undefined;
    const name = nameNode.text;

    const params = this.#parseFunctionParameters(node);
    const returnType = this.#extractReturnType(node, source);
    const isAsync = this.#hasChildWithText(node, 'async');
    const decorators = this.#extractAttributes(node);
    const description = this.#extractDocComment(node, source);

    const signature = this.#buildFunctionSignature(name, params, returnType, isAsync);

    return {
      name,
      signature,
      parameters: params,
      returnType,
      isAsync,
      description,
      decorators,
    };
  }

  #parseStruct(node: Node, source: string): ParsedClass | undefined {
    const nameNode = this.#getChildByFieldName(node, 'name');
    if (nameNode === null) return undefined;
    const name = nameNode.text;

    const properties: ParsedProperty[] = [];
    const decorators = this.#extractAttributes(node);
    const description = this.#extractDocComment(node, source);

    // Parse struct fields from the field_declaration_list.
    const fieldList = this.#findChildByType(node, 'field_declaration_list');
    if (fieldList !== null) {
      for (let i = 0; i < fieldList.childCount; i++) {
        const child = fieldList.child(i);
        if (child !== null && child.type === 'field_declaration') {
          const prop = this.#parseFieldDeclaration(child, source);
          if (prop !== undefined) {
            properties.push(prop);
          }
        }
      }
    }

    return {
      name,
      isAbstract: false,
      extends: [],
      implements: [],
      methods: [],
      properties,
      decorators,
      description,
    };
  }

  #parseEnum(node: Node, source: string): ParsedEnum | undefined {
    const nameNode = this.#getChildByFieldName(node, 'name');
    if (nameNode === null) return undefined;
    const name = nameNode.text;
    const description = this.#extractDocComment(node, source);

    const members: string[] = [];
    const body = this.#findChildByType(node, 'enum_variant_list');
    if (body !== null) {
      for (let i = 0; i < body.childCount; i++) {
        const child = body.child(i);
        if (child !== null && child.type === 'enum_variant') {
          const variantName = this.#getChildByFieldName(child, 'name');
          if (variantName !== null) {
            members.push(variantName.text);
          }
        }
      }
    }

    return { name, members, description };
  }

  #parseTrait(node: Node, source: string): ParsedInterface | undefined {
    const nameNode = this.#getChildByFieldName(node, 'name');
    if (nameNode === null) return undefined;
    const name = nameNode.text;
    const description = this.#extractDocComment(node, source);

    const methods: ParsedMethod[] = [];
    const properties: ParsedProperty[] = [];
    const extendsArr: string[] = [];

    // Trait bounds (supertraits): `trait Foo: Bar + Baz`
    const bounds = this.#findChildByType(node, 'trait_bounds');
    if (bounds !== null) {
      for (let i = 0; i < bounds.childCount; i++) {
        const child = bounds.child(i);
        if (child !== null && child.type !== '+' && child.type !== ':') {
          const boundName = this.#extractTypeName(child);
          if (boundName !== undefined) {
            extendsArr.push(boundName);
          }
        }
      }
    }

    // Parse trait items (method signatures).
    const body = this.#findChildByType(node, 'declaration_list');
    if (body !== null) {
      for (let i = 0; i < body.childCount; i++) {
        const child = body.child(i);
        if (child === null) continue;
        if (child.type === 'function_signature_item' || child.type === 'function_item') {
          const method = this.#parseMethodFromNode(child, source, false);
          if (method !== undefined) {
            methods.push(method);
          }
        }
      }
    }

    return { name, extends: extendsArr, properties, methods, description };
  }

  #parseImplBlock(node: Node, source: string): RustImplBlock | undefined {
    // `impl Type { ... }` or `impl Trait for Type { ... }`
    const typeNode = this.#getChildByFieldName(node, 'type');
    if (typeNode === null) return undefined;
    const targetName = this.#extractTypeName(typeNode) ?? typeNode.text;

    // Check for trait implementation.
    const traitNode = this.#getChildByFieldName(node, 'trait');
    const traitName = traitNode !== null ? (this.#extractTypeName(traitNode) ?? traitNode.text) : undefined;

    const methods: ParsedMethod[] = [];
    const body = this.#findChildByType(node, 'declaration_list');
    if (body !== null) {
      for (let i = 0; i < body.childCount; i++) {
        const child = body.child(i);
        if (child !== null && child.type === 'function_item') {
          const method = this.#parseMethodFromNode(child, source, false);
          if (method !== undefined) {
            methods.push(method);
          }
        }
      }
    }

    return { targetName, traitName, methods };
  }

  #parseTypeAlias(node: Node, source: string): ParsedTypeAlias | undefined {
    const nameNode = this.#getChildByFieldName(node, 'name');
    if (nameNode === null) return undefined;
    const name = nameNode.text;

    const typeNode = this.#getChildByFieldName(node, 'type');
    const type = typeNode !== null ? this.#cleanTypeText(typeNode.text) : 'unknown';
    const description = this.#extractDocComment(node, source);

    return { name, type, description };
  }

  #parseConstant(node: Node, _source: string): ParsedConstant | undefined {
    const nameNode = this.#getChildByFieldName(node, 'name');
    if (nameNode === null) return undefined;
    const name = nameNode.text;

    const typeNode = this.#getChildByFieldName(node, 'type');
    const type = typeNode !== null ? this.#cleanTypeText(typeNode.text) : 'unknown';

    const valueNode = this.#getChildByFieldName(node, 'value');
    const value = valueNode !== null ? valueNode.text : undefined;

    return { name, type, value };
  }

  #parseFieldDeclaration(node: Node, _source: string): ParsedProperty | undefined {
    const nameNode = this.#getChildByFieldName(node, 'name');
    if (nameNode === null) return undefined;
    const name = nameNode.text;

    const typeNode = this.#getChildByFieldName(node, 'type');
    const type = typeNode !== null ? this.#cleanTypeText(typeNode.text) : 'unknown';

    const isPublic = this.#isPublic(node);

    return {
      name,
      type,
      isReadonly: false,
      isStatic: false,
      isPrivate: !isPublic,
      isProtected: false,
      isOptional: false,
    };
  }

  #parseMethodFromNode(node: Node, source: string, _isAbstract: boolean): ParsedMethod | undefined {
    const nameNode = this.#getChildByFieldName(node, 'name');
    if (nameNode === null) return undefined;
    const name = nameNode.text;

    const allParams = this.#parseFunctionParameters(node);
    // Filter out `self` / `&self` / `&mut self` — these are not method parameters in TMD.
    const firstParam = allParams.length > 0 ? allParams[0] : undefined;
    const hasSelf =
      firstParam !== undefined && (firstParam.name === 'self' || firstParam.name === '&self' || firstParam.name === '&mut self');
    const isStatic = !hasSelf;
    const params = hasSelf ? allParams.slice(1) : allParams;

    const returnType = this.#extractReturnType(node, source);
    const isAsync = this.#hasChildWithText(node, 'async');
    const isPublic = this.#isPublic(node);

    const signature = this.#buildFunctionSignature(name, params, returnType, isAsync);

    return {
      name,
      signature,
      isStatic,
      isPrivate: !isPublic,
      isProtected: false,
      isAbstract: node.type === 'function_signature_item',
      parameters: params,
      returnType,
      isAsync,
      accessorKind: undefined,
    };
  }

  #parseFunctionParameters(node: Node): ParsedParameter[] {
    const params: ParsedParameter[] = [];
    const paramList = this.#findChildByType(node, 'parameters');
    if (paramList === null) return params;

    for (let i = 0; i < paramList.childCount; i++) {
      const child = paramList.child(i);
      if (child === null) continue;

      if (child.type === 'parameter') {
        const patNode = this.#getChildByFieldName(child, 'pattern');
        const typeNode = this.#getChildByFieldName(child, 'type');
        if (patNode !== null) {
          params.push({
            name: patNode.text,
            type: typeNode !== null ? this.#cleanTypeText(typeNode.text) : 'unknown',
            isOptional: false,
            hasDefaultValue: false,
          });
        }
      } else if (child.type === 'self_parameter') {
        // Represent self variants for method detection.
        params.push({
          name: child.text.replace(/\s+/g, ' ').trim(),
          type: 'Self',
          isOptional: false,
          hasDefaultValue: false,
        });
      }
    }

    return params;
  }

  #extractReturnType(node: Node, _source: string): string {
    const retType = this.#getChildByFieldName(node, 'return_type');
    if (retType === null) return '()';

    // The return_type node includes the `->` prefix; strip it.
    let text = retType.text.trim();
    if (text.startsWith('->')) {
      text = text.slice(2).trim();
    }
    return this.#cleanTypeText(text);
  }

  #extractAttributes(node: Node): string[] {
    const decorators: string[] = [];
    // Look at preceding siblings for attribute_item nodes.
    let sibling = node.previousSibling;
    while (sibling !== null && sibling.type === 'attribute_item') {
      // Extract the attribute content (e.g., `derive(Debug, Clone)`).
      const inner = sibling.text.replace(/^#\[/, '').replace(/\]$/, '');
      decorators.unshift(inner);
      sibling = sibling.previousSibling;
    }
    return decorators;
  }

  #extractDocComment(node: Node, _source: string): string | undefined {
    // Collect `/// ...` lines above the node.
    const lines: string[] = [];
    let sibling = node.previousSibling;

    // Skip attribute_items first.
    while (sibling !== null && sibling.type === 'attribute_item') {
      sibling = sibling.previousSibling;
    }

    while (sibling !== null && sibling.type === 'line_comment') {
      const text = sibling.text;
      if (text.startsWith('///')) {
        lines.unshift(text.slice(3).trim());
      } else {
        break;
      }
      sibling = sibling.previousSibling;
    }

    return lines.length > 0 ? lines.join(' ') : undefined;
  }

  #isPublic(node: Node): boolean {
    // Check for `pub` visibility modifier as a child.
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child !== null && child.type === 'visibility_modifier') {
        return true;
      }
    }
    return false;
  }

  #hasChildWithText(node: Node, text: string): boolean {
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child !== null && child.text === text) return true;
    }
    return false;
  }

  #findChildByType(node: Node, type: string): Node | null {
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child !== null && child.type === type) return child;
    }
    return null;
  }

  #getChildByFieldName(node: Node, name: string): Node | null {
    return node.childForFieldName(name);
  }

  #extractTypeName(node: Node): string | undefined {
    // Handle type_identifier, scoped_type_identifier, generic_type.
    if (node.type === 'type_identifier') return node.text;
    if (node.type === 'scoped_type_identifier') {
      const nameNode = this.#getChildByFieldName(node, 'name');
      return nameNode?.text ?? node.text;
    }
    if (node.type === 'generic_type') {
      const typeNode = this.#findChildByType(node, 'type_identifier') ?? this.#findChildByType(node, 'scoped_type_identifier');
      return typeNode?.text;
    }
    // Fallback: use the full text but strip lifetimes.
    return this.#cleanTypeText(node.text);
  }

  #cleanTypeText(text: string): string {
    // Strip lifetime parameters (`'a`, `'static`, etc.) for TMD output.
    return text
      .replace(/'[a-zA-Z_]+\s*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  #buildFunctionSignature(name: string, params: readonly ParsedParameter[], returnType: string, isAsync: boolean): string {
    const paramStr = params.map((p) => `${p.name}: ${p.type}`).join(', ');
    const asyncPrefix = isAsync ? 'async ' : '';
    return `${asyncPrefix}fn ${name}(${paramStr}) -> ${returnType}`;
  }

  #mergeImplBlocks(modules: ParsedModule[], implBlocks: readonly RustImplBlock[]): void {
    // Build a map from struct/enum name to impl blocks targeting it.
    const implsByTarget = new Map<string, RustImplBlock[]>();
    for (const impl of implBlocks) {
      const existing = implsByTarget.get(impl.targetName) ?? [];
      existing.push(impl);
      implsByTarget.set(impl.targetName, existing);
    }

    // Replace classes in each module with merged versions.
    for (let mi = 0; mi < modules.length; mi++) {
      const mod = modules[mi];
      if (mod === undefined) continue;
      let changed = false;
      const newClasses: ParsedClass[] = [];

      for (const cls of mod.classes) {
        const impls = implsByTarget.get(cls.name);
        if (impls === undefined || impls.length === 0) {
          newClasses.push(cls);
          continue;
        }

        changed = true;
        const mergedMethods: ParsedMethod[] = [...cls.methods];
        const mergedImplements: string[] = [...cls.implements];

        for (const impl of impls) {
          mergedMethods.push(...impl.methods);
          if (impl.traitName !== undefined && !mergedImplements.includes(impl.traitName)) {
            mergedImplements.push(impl.traitName);
          }

          // Store method details on the side channel for the converter.
          const existing = this.#implMethodMap.get(impl.targetName) ?? [];
          existing.push(...impl.methods);
          this.#implMethodMap.set(impl.targetName, existing);
        }

        newClasses.push({
          ...cls,
          methods: mergedMethods,
          implements: mergedImplements,
        });
      }

      if (changed) {
        modules[mi] = { ...mod, classes: newClasses };
      }
    }
  }

  // Side channel: full method details from impl blocks, keyed by struct name.
  readonly #implMethodMap = new Map<string, ParsedMethod[]>();

  getImplMethods(structName: string): readonly ParsedMethod[] {
    return this.#implMethodMap.get(structName) ?? [];
  }
}
