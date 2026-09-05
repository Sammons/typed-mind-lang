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
        references.push({ writtenName: name.getText(), source, start, end: start + source.end - source.start, origin });
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
