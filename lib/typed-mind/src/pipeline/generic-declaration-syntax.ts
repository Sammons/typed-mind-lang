import type { Diagnostic } from '../ast/diagnostic.ts';
import type { CstInheritList, CstTypeParameters } from '../ast/gen/cst-nodes.ts';
import type { ClassHeritage, HeritageReference } from '../ast/heritage-reference.ts';
import type { Span } from '../ast/span.ts';
import type { EntityAccumulator } from './entity-accumulator.ts';
import { parseTypeParameterListText, parseTypeParameterText } from './parse-type-parameters.ts';
import { typeExprFromCst } from './type-expr-from-cst.ts';

export const attachHeaderTypeParameters = (accumulator: EntityAccumulator, header: CstTypeParameters | undefined): void => {
  if (header === undefined) return;
  const start = header.span().start;
  const result = parseTypeParameterListText(header.text, { baseLine: start.line, baseColumn: start.column });
  if (result.kind === 'parsed') accumulator.slots.typeParameters = [...result.parameters];
};

export const heritageFromCst = (list: CstInheritList | undefined): ClassHeritage => {
  const references =
    list?.heritageTypeChildren().map((node): HeritageReference => {
      const generic = node.typeGenericChildren()[0];
      const base = generic?.baseField() ?? node.typeNamedChildren()[0];
      if (base === undefined) return { kind: 'opaque', text: node.text, span: node.span() };
      return {
        kind: 'named',
        base: { kind: 'named', name: base.text, span: base.span() },
        args: generic?.typeExprChildren().map(typeExprFromCst) ?? [],
        span: node.span(),
      };
    }) ?? [];
  return { extends: references[0], implements: references.slice(1) };
};

export const attachParameterProperties = (
  accumulator: EntityAccumulator,
  properties: readonly { readonly value: string; readonly span: Span }[],
): Diagnostic[] => {
  if (properties.length === 0) return [];
  if (!['Function', 'Class', 'ClassFile', 'DTO', 'TypeDef'].includes(accumulator.kind)) {
    return [
      {
        code: 'semantics/unsupported-generic-declaration',
        severity: 'error',
        span: properties[0]?.span ?? accumulator.span,
        message: `${accumulator.kind} '${accumulator.name}' does not accept type parameters; remove them or use a DTO, Class, Function or alias declaration.`,
      },
    ];
  }
  const diagnostics: Diagnostic[] = [];
  if (accumulator.slots.typeParameters !== undefined) {
    diagnostics.push({
      code: 'semantics/conflicting-type-parameters',
      severity: 'error',
      span: accumulator.span,
      message: 'Declare type parameters in either the header or properties.',
    });
  }
  const parameters = [...(accumulator.slots.typeParameters ?? [])];
  for (const property of properties) {
    const parsed = parseTypeParameterText(property.value, { baseLine: property.span.start.line, baseColumn: property.span.start.column });
    if (parsed.kind === 'parsed') parameters.push(...parsed.parameters);
    else
      diagnostics.push({
        code: 'semantics/invalid-type-parameter',
        severity: 'error',
        span: property.span,
        message: `Invalid type parameter in '${accumulator.name}': ${parameterFailureMessage(parsed.reason)}`,
      });
  }
  accumulator.slots.typeParameters = parameters;
  return diagnostics;
};

const parameterFailureMessage = (
  reason: 'empty-parameter' | 'invalid-binding' | 'unbalanced-parameter' | 'missing-type' | 'unsupported-multiline-literal',
): string => {
  switch (reason) {
    case 'empty-parameter':
      return 'write a name for each parameter.';
    case 'invalid-binding':
      return 'write a binding name, optionally followed by extends and a default type.';
    case 'unbalanced-parameter':
      return 'close every bracket and quote.';
    case 'missing-type':
      return 'write a type after extends or =.';
    case 'unsupported-multiline-literal':
      return 'use a single-line literal value.';
  }
};
