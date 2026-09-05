import path from 'node:path';
import * as ts from 'typescript';
import type { DeclarationIdentity, ParsedTypeText, ReferenceOrigin, SourceRange, TypeReferenceOccurrence } from './types.ts';

export interface ReferenceOriginContext {
  // A referenced first-party package may resolve through an emitted .d.ts.
  // Map its symbol to a proven source declaration, never copy emitted offsets.
  // null means a first-party mapping exists but its declaration is ambiguous.
  readonly mapDeclaration?: (declaration: ts.Declaration) => ts.Declaration | null | undefined;
}

export const sourceRange = (node: ts.Node): SourceRange => ({
  filePath: path.resolve(node.getSourceFile().fileName),
  start: node.getStart(),
  end: node.getEnd(),
});

export const getDeclarationIdentity = (declaration: ts.Declaration): DeclarationIdentity | undefined => {
  const name = ts.getNameOfDeclaration(declaration);
  if (name === undefined || (!ts.isIdentifier(name) && !ts.isStringLiteral(name) && !ts.isNumericLiteral(name))) return undefined;
  return { ...sourceRange(declaration), name: name.text };
};

export const resolveReferenceOrigin = (
  symbol: ts.Symbol | undefined,
  program: ts.Program,
  checker: ts.TypeChecker,
  context: ReferenceOriginContext = {},
): ReferenceOrigin => {
  if (symbol === undefined) return { kind: 'unresolved', reason: 'missing-symbol' };
  const seen = new Set<ts.Symbol>();
  while ((symbol.flags & ts.SymbolFlags.Alias) !== 0) {
    if (seen.has(symbol)) return { kind: 'unresolved', reason: 'ambiguous-declaration' };
    seen.add(symbol);
    symbol = checker.getAliasedSymbol(symbol);
  }
  const declarations = symbol.getDeclarations();
  if (declarations === undefined || declarations.length === 0) return { kind: 'unresolved', reason: 'missing-declaration' };
  const candidates = declarations.map((declaration) => {
    const mapped = context.mapDeclaration?.(declaration);
    const target = mapped ?? declaration;
    return { declaration: target, identity: getDeclarationIdentity(target), mapped: mapped !== undefined, ambiguous: mapped === null };
  });
  if (candidates.some((candidate) => candidate.ambiguous)) return { kind: 'unresolved', reason: 'ambiguous-declaration' };
  if (candidates.some((candidate) => candidate.identity === undefined)) return { kind: 'unresolved', reason: 'missing-declaration' };
  const names = new Set(candidates.map((candidate) => candidate.identity?.name));
  if (names.size !== 1) return { kind: 'unresolved', reason: 'ambiguous-declaration' };
  candidates.sort((a, b) => {
    const left = a.identity?.filePath ?? '';
    const right = b.identity?.filePath ?? '';
    return left < right ? -1 : left > right ? 1 : (a.identity?.start ?? 0) - (b.identity?.start ?? 0);
  });
  const selected = candidates[0];
  if (selected?.identity === undefined) return { kind: 'unresolved', reason: 'missing-declaration' };
  const declaration = selected.identity;
  if (ts.isTypeParameterDeclaration(selected.declaration)) return { kind: 'type-parameter', declaration };
  const file = selected.declaration.getSourceFile();
  if (selected.mapped) return { kind: 'project', declaration };
  if (program.isSourceFileDefaultLibrary(file)) return { kind: 'typescript-lib', declaration };
  if (program.isSourceFileFromExternalLibrary(file)) {
    const pieces = path.resolve(file.fileName).split(`${path.sep}node_modules${path.sep}`);
    const packagePath = pieces.length > 1 ? pieces.at(-1) : undefined;
    const parts = packagePath?.split(path.sep);
    const packageName = parts?.[0]?.startsWith('@') ? parts.slice(0, 2).join('/') : parts?.[0];
    if (packageName) return { kind: 'external-package', packageName, declaration };
    // External library without attributable package provenance is uncertain.
    return { kind: 'unresolved', reason: 'ambiguous-declaration' };
  }
  return { kind: 'project', declaration };
};

interface TextPiece {
  readonly text: string;
  readonly sourceStart?: number;
}
const raw = (node: ts.Node): TextPiece => ({ text: node.getText(), sourceStart: node.getStart() });
const containsQuery = (node: ts.Node): boolean => ts.isTypeQueryNode(node) || node.getChildren().some(containsQuery);
const joinPieces = (nodes: readonly ts.TypeNode[], separator: string): TextPiece[] =>
  nodes.flatMap((node, index) => [...(index === 0 ? [] : [{ text: separator }]), ...renderType(node)]);

// Exact rendering rules previously owned by parenthesizeTypeQueries. Source
// segments carry offsets through inserted parentheses and normalized separators.
const renderType = (node: ts.TypeNode): TextPiece[] => {
  if (ts.isTypeQueryNode(node)) return [{ text: '(' }, raw(node), { text: ')' }];
  if (ts.isTypeReferenceNode(node) && node.typeArguments?.some(containsQuery)) {
    return [raw(node.typeName), { text: '<' }, ...joinPieces(node.typeArguments, ', '), { text: '>' }];
  }
  if (ts.isArrayTypeNode(node) && containsQuery(node.elementType)) return [...renderType(node.elementType), { text: '[]' }];
  if (ts.isUnionTypeNode(node) && node.types.some(containsQuery)) return joinPieces(node.types, ' | ');
  if (ts.isIntersectionTypeNode(node) && node.types.some(containsQuery)) return joinPieces(node.types, ' & ');
  return [raw(node)];
};

// Preserve the public import binding separately from the canonical declaration.
// A package may export Internal as Public, or expose the same type via subpaths.
const externalBindingFor = (
  name: ts.Node,
  origin: ReferenceOrigin,
  program: ts.Program,
  checker: ts.TypeChecker,
  context: ReferenceOriginContext,
): TypeReferenceOccurrence['externalBinding'] => {
  if (origin.kind !== 'external-package') return undefined;
  const rootOf = (node: ts.Node): ts.Node =>
    ts.isQualifiedName(node) ? rootOf(node.left) : ts.isPropertyAccessExpression(node) ? rootOf(node.expression) : node;
  const root = rootOf(name);
  const bindings: { specifier: ts.StringLiteralLike; exportName: string }[] = [];
  if (ts.isImportTypeNode(name.parent) && ts.isLiteralTypeNode(name.parent.argument) && ts.isStringLiteral(name.parent.argument.literal)) {
    bindings.push({ specifier: name.parent.argument.literal, exportName: name.getText() });
  } else {
    for (const declaration of checker.getSymbolAtLocation(root)?.declarations ?? []) {
      const importDeclaration = ts.findAncestor(declaration, ts.isImportDeclaration);
      if (importDeclaration === undefined || !ts.isStringLiteralLike(importDeclaration.moduleSpecifier)) continue;
      if (ts.isImportSpecifier(declaration) && name === root) {
        bindings.push({ specifier: importDeclaration.moduleSpecifier, exportName: (declaration.propertyName ?? declaration.name).text });
      } else if (ts.isImportClause(declaration) && declaration.name !== undefined && name === root) {
        bindings.push({ specifier: importDeclaration.moduleSpecifier, exportName: 'default' });
      } else if (ts.isNamespaceImport(declaration) && root !== name) {
        const exported =
          ts.isQualifiedName(name) && name.left === root
            ? name.right.text
            : ts.isPropertyAccessExpression(name) && name.expression === root
              ? name.name.text
              : undefined;
        if (exported !== undefined) bindings.push({ specifier: importDeclaration.moduleSpecifier, exportName: exported });
      }
    }
  }
  const proven = bindings.filter((binding) => {
    const moduleSymbol = checker.getSymbolAtLocation(binding.specifier);
    if (moduleSymbol === undefined) return false;
    const exported = checker.getExportsOfModule(moduleSymbol).find((symbol) => symbol.name === binding.exportName);
    const resolved = resolveReferenceOrigin(exported, program, checker, context);
    return (
      resolved.kind === 'external-package' &&
      resolved.packageName === origin.packageName &&
      resolved.declaration.filePath === origin.declaration.filePath &&
      resolved.declaration.name === origin.declaration.name &&
      resolved.declaration.start === origin.declaration.start &&
      resolved.declaration.end === origin.declaration.end
    );
  });
  const unique = new Map(proven.map((binding) => [JSON.stringify([binding.specifier.text, binding.exportName]), binding]));
  if (unique.size !== 1) return undefined;
  const binding = [...unique.values()][0];
  return binding === undefined ? undefined : { specifier: binding.specifier.text, exportName: binding.exportName };
};

export const parseTypeTextOrigins = (
  node: ts.TypeNode | undefined,
  program: ts.Program,
  checker: ts.TypeChecker,
  context: ReferenceOriginContext = {},
): ParsedTypeText => {
  if (node === undefined) return { text: 'any', source: undefined, references: [] };
  const pieces = renderType(node);
  const text = pieces.map((piece) => piece.text).join('');
  const references: TypeReferenceOccurrence[] = [];
  const file = node.getSourceFile();
  const hasChecker = program.getSourceFile(file.fileName) === file;
  const collectName = (name: ts.Node): void => {
    const source = sourceRange(name);
    let renderedOffset = 0;
    for (const piece of pieces) {
      if (piece.sourceStart !== undefined && source.start >= piece.sourceStart && source.end <= piece.sourceStart + piece.text.length) {
        const start = renderedOffset + source.start - piece.sourceStart;
        const origin: ReferenceOrigin = hasChecker
          ? resolveReferenceOrigin(checker.getSymbolAtLocation(name), program, checker, context)
          : { kind: 'unresolved', reason: 'checker-unavailable' };
        const externalBinding = hasChecker ? externalBindingFor(name, origin, program, checker, context) : undefined;
        references.push({
          writtenName: name.getText(),
          source,
          start,
          end: start + source.end - source.start,
          origin,
          ...(externalBinding === undefined ? {} : { externalBinding }),
        });
        return;
      }
      renderedOffset += piece.text.length;
    }
  };
  const visit = (current: ts.Node): void => {
    if (ts.isTypeReferenceNode(current)) {
      collectName(current.typeName);
      current.typeArguments?.forEach(visit);
    } else if (ts.isTypeQueryNode(current)) {
      collectName(current.exprName);
      current.typeArguments?.forEach(visit);
    } else if (ts.isExpressionWithTypeArguments(current)) {
      if (ts.isIdentifier(current.expression) || ts.isPropertyAccessExpression(current.expression)) collectName(current.expression);
      current.typeArguments?.forEach(visit);
    } else if (ts.isImportTypeNode(current)) {
      if (current.qualifier) collectName(current.qualifier);
      current.typeArguments?.forEach(visit);
    } else {
      ts.forEachChild(current, visit);
    }
  };
  visit(node);
  return { text, source: sourceRange(node), references };
};
