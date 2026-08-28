// RFC-TM-3 §3.1 (rfc-tm-3-diamond.md) — the attachment table: which
// continuation kinds are legal for which entity kinds, transcribed from the
// legacy per-kind continuation handlers (parser.ts:457-650). The delta from
// legacy is that an illegal attachment becomes `semantics/illegal-continuation`
// instead of a silent no-op (§3.3, verdict-moving, incl. the Class-imports
// case per the §2.2 F3 ruling), and a continuation with no open entity becomes
// `semantics/orphan-continuation` instead of vanishing.
//
// Legality inventory (legacy source cited per row):
//   import_list `<- [..]`   → File/ClassFile imports (parser.ts:480-483);
//                             Function mixed dependency list → the raw list
//                             lands on pendingDependencies until the Q4
//                             distribution phase resolves it (parser.ts:465-477,
//                             doc §3.4)
//   export_list `-> [..]`   → File/ClassFile exports (parser.ts:487-491);
//                             Dependency exports (parser.ts:492-497)
//   calls_list `~> [..]`    → Function calls (parser.ts:501-505)
//   input_name `<- Name`    → Function input (parser.ts:507-513)
//   output_name `-> Name`   → Function output (parser.ts:515-521)
//   methods_list `=> [..]`  → Class/ClassFile methods (parser.ts:523-528)
//   affects_list `~ [..]`   → Function affects (parser.ts:530-550; the inline
//                             reverse write there is the fourth reverse-writer
//                             and is NOT replicated — reverse data is Q4's)
//   contains_list `> [..]`  → UIComponent contains (parser.ts:552-558)
//   contained_by `< [..]`   → UIComponent declaredContainedBy (parser.ts:560-566,
//                             F1 ruling: declared reverse links are language
//                             surface)
//   contains_program `>> N` → Asset containsProgram (parser.ts:568-574)
//   dto_field `- n: t`      → DTO fields, append (parser.ts:576-588)
//   description_line `"…"`  → Function description; Program/File/Class/Constants
//                             purpose (parser.ts:597-619); ClassFile only via
//                             the lookahead conversion (the converted entity is
//                             a legacy Class, parser.ts:611-613)
//   default_value `= "…"`   → RunParameter defaultValue (parser.ts:621-627)
//   consumes_list `$< [..]` → Function consumes (parser.ts:629-649; inline
//                             reverse write not replicated, as above)

import type { Node as SyntaxNode } from 'web-tree-sitter';
import type { Diagnostic } from '../ast/diagnostic.ts';
import { DtoFieldNode, type OptionalityMarker } from '../ast/dto-field-node.ts';
import {
  CstAffectsList,
  CstCallsList,
  CstConsumesList,
  CstContainedByList,
  CstContainsList,
  CstContainsProgram,
  CstDefaultValue,
  CstDescriptionLine,
  CstDtoField,
  CstExportList,
  CstImportList,
  CstInputName,
  CstMethodsList,
  CstOutputName,
} from '../ast/gen/cst-nodes.ts';
import type { Span } from '../ast/span.ts';
import type { EntityAccumulator } from './entity-accumulator.ts';
import { typeExprFromCst } from './type-expr-from-cst.ts';

export interface AttachmentRule {
  readonly group: string;
  readonly label: string;
  accepts(target: EntityAccumulator): boolean;
  apply(target: EntityAccumulator, syntaxNode: SyntaxNode, span: Span): void;
}

const namesOf = (wrapped: { nameListChildren(): { listEntryChildren(): { text: string }[] }[] }): string[] => {
  const nameList = wrapped.nameListChildren().at(0);
  if (nameList === undefined) {
    return [];
  }
  return nameList.listEntryChildren().map((entry) => entry.text);
};

const unquote = (text: string): string => {
  return text.replace(/^"/, '').replace(/"$/, '');
};

// §1: the `?` optionality sigil is a bare anonymous token, invisible to the
// node-types fields/children maps — detected by walking the node's full child
// list (named and anonymous) rather than through a generated accessor.
const hasQuestionSigil = (wrapped: CstDtoField): boolean => {
  const { syntaxNode } = wrapped;
  for (let childIndex = 0; childIndex < syntaxNode.childCount; childIndex++) {
    const child = syntaxNode.child(childIndex);
    if (child !== null && !child.isNamed && child.type === '?') {
      return true;
    }
  }
  return false;
};

// X-TYPE-2 (rfc-tm-8-diamond.md §2): field_type wraps type_expr (grammar.js),
// so the fieldType CST child always carries exactly one type_expr child once
// the document parses cleanly. A missing type_expr (a MISSING-token recovery
// case) falls back to an empty opaque leaf rather than throwing — parsing
// stays tolerant end to end (doc §3.3 precedent), and a malformed field_type
// already surfaces its own syntax/* diagnostic from the CST walk.
const typeExprOf = (wrapped: CstDtoField, span: Span) => {
  const fieldType = wrapped.fieldTypeChildren().at(0);
  const typeExprCst = fieldType?.typeExprChildren().at(0);
  if (typeExprCst === undefined) {
    return { kind: 'opaque' as const, text: '', span };
  }
  return typeExprFromCst(typeExprCst);
};

export const dtoFieldFromCst = (wrapped: CstDtoField, span: Span): DtoFieldNode => {
  const description = wrapped.stringChildren().at(0)?.text;
  const parenthesized = wrapped.optionalMarkerChildren().length > 0;
  const question = hasQuestionSigil(wrapped);
  const optionalityMarker: OptionalityMarker = question ? 'question' : parenthesized ? 'parenthesized' : 'none';
  return new DtoFieldNode({
    name: wrapped.fieldNameChildren().at(0)?.text ?? '',
    type: (wrapped.fieldTypeChildren().at(0)?.text ?? '').trim(),
    typeExpr: typeExprOf(wrapped, span),
    optionalityMarker,
    ...(description !== undefined ? { description: unquote(description) } : {}),
    span,
  });
};

export const attachmentRules: Record<string, AttachmentRule> = {
  import_list: {
    group: 'imports',
    label: 'imports list (`<- [...]`)',
    accepts: (target) => target.kind === 'File' || target.kind === 'ClassFile' || target.kind === 'Function',
    apply: (target, syntaxNode) => {
      const names = namesOf(new CstImportList(syntaxNode));
      if (target.kind === 'Function') {
        // The mixed dependency list (parser.ts:476 `_dependencies`); the Q4
        // distribution phase (§3.4) resolves it into calls/input/affects/
        // consumes and leaves the unresolved residue here.
        target.slots.pendingDependencies = names;
        return;
      }
      target.slots.imports = names;
    },
  },
  export_list: {
    group: 'exports',
    label: 'exports list (`-> [...]`)',
    accepts: (target) => target.kind === 'File' || target.kind === 'ClassFile' || target.kind === 'Dependency',
    apply: (target, syntaxNode) => {
      target.slots.exports = namesOf(new CstExportList(syntaxNode));
    },
  },
  calls_list: {
    group: 'calls',
    label: 'calls list (`~> [...]`)',
    accepts: (target) => target.kind === 'Function',
    apply: (target, syntaxNode) => {
      target.slots.calls = namesOf(new CstCallsList(syntaxNode));
    },
  },
  input_name: {
    group: 'input',
    label: 'input (`<- Name`)',
    accepts: (target) => target.kind === 'Function',
    apply: (target, syntaxNode) => {
      target.slots.input = new CstInputName(syntaxNode).entityNameChildren().at(0)?.text ?? '';
    },
  },
  output_name: {
    group: 'output',
    label: 'output (`-> Name`)',
    accepts: (target) => target.kind === 'Function',
    apply: (target, syntaxNode) => {
      target.slots.output = new CstOutputName(syntaxNode).entityNameChildren().at(0)?.text ?? '';
    },
  },
  methods_list: {
    group: 'methods',
    label: 'methods list (`=> [...]`)',
    accepts: (target) => target.kind === 'Class' || target.kind === 'ClassFile',
    apply: (target, syntaxNode) => {
      target.slots.methods = namesOf(new CstMethodsList(syntaxNode));
    },
  },
  affects_list: {
    group: 'affects',
    label: 'affects list (`~ [...]`)',
    accepts: (target) => target.kind === 'Function',
    apply: (target, syntaxNode) => {
      target.slots.affects = namesOf(new CstAffectsList(syntaxNode));
    },
  },
  contains_list: {
    group: 'contains',
    label: 'contains list (`> [...]`)',
    accepts: (target) => target.kind === 'UIComponent',
    apply: (target, syntaxNode) => {
      target.slots.contains = namesOf(new CstContainsList(syntaxNode));
    },
  },
  contained_by_list: {
    group: 'containedBy',
    label: 'containedBy list (`< [...]`)',
    accepts: (target) => target.kind === 'UIComponent',
    apply: (target, syntaxNode) => {
      target.slots.declaredContainedBy = namesOf(new CstContainedByList(syntaxNode));
    },
  },
  contains_program: {
    group: 'containsProgram',
    label: 'containsProgram (`>> Name`)',
    accepts: (target) => target.kind === 'Asset',
    apply: (target, syntaxNode) => {
      target.slots.containsProgram = new CstContainsProgram(syntaxNode).entityNameChildren().at(0)?.text ?? '';
    },
  },
  default_value: {
    group: 'defaultValue',
    label: 'default value (`= "..."`)',
    accepts: (target) => target.kind === 'RunParameter',
    apply: (target, syntaxNode) => {
      const value = new CstDefaultValue(syntaxNode).stringChildren().at(0)?.text;
      target.slots.defaultValue = value === undefined ? '' : unquote(value);
    },
  },
  consumes_list: {
    group: 'consumes',
    label: 'consumes list (`$< [...]`)',
    accepts: (target) => target.kind === 'Function',
    apply: (target, syntaxNode) => {
      target.slots.consumes = namesOf(new CstConsumesList(syntaxNode));
    },
  },
  description_line: {
    group: 'description',
    label: 'description line (`"..."`)',
    accepts: (target) => {
      if (target.kind === 'Function' || target.kind === 'Program' || target.kind === 'File' || target.kind === 'Class') {
        return true;
      }
      if (target.kind === 'Constants') {
        return true;
      }
      // Lookahead-converted ClassFiles keep the legacy converted-Class
      // description surface (parser.ts:611-613); declared `#:` ClassFiles
      // never accepted one (no ClassFile arm in parser.ts:597-619).
      return target.kind === 'ClassFile' && target.viaLookahead;
    },
    apply: (target, syntaxNode) => {
      const text = new CstDescriptionLine(syntaxNode).stringChildren().at(0)?.text;
      const value = text === undefined ? '' : unquote(text);
      if (target.kind === 'Function') {
        target.slots.description = value;
        return;
      }
      target.slots.purpose = value;
    },
  },
  dto_field: {
    group: 'field',
    label: 'DTO field (`- name: type`)',
    accepts: (target) => target.kind === 'DTO',
    apply: (target, syntaxNode, span) => {
      const field = dtoFieldFromCst(new CstDtoField(syntaxNode), span);
      const fields = target.slots.fields ?? [];
      fields.push(field);
      target.slots.fields = fields;
    },
  },
};

export const orphanContinuationDiagnostic = (label: string, span: Span): Diagnostic => {
  return {
    code: 'semantics/orphan-continuation',
    severity: 'warning',
    span,
    message: `orphan continuation: ${label} has no open entity declaration to attach to`,
  };
};

export const illegalContinuationDiagnostic = (label: string, kind: string, span: Span): Diagnostic => {
  return {
    code: 'semantics/illegal-continuation',
    severity: 'warning',
    span,
    message: `illegal continuation: ${label} cannot attach to a ${kind} entity`,
  };
};
