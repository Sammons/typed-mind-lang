// Issue #130 (git.tail4ea214.ts.net/sammons/typed-mind-lang) — disposition
// (b). `quoteStringLiteral` (quote-string-literal.ts) swaps every embedded
// `"` for `'` on emission, because the grammar's string token has no escape
// production (see that module's own header comment). The swap is the only
// mechanically-safe move available today, but until disposition (a) — a
// grammar-level escaped-quote production — lands, it is still a silent
// rewrite of user-authored content. This module is the fix for the SILENCE,
// not the rewrite: it produces a `Diagnostic` (ast/diagnostic.ts's shape,
// the same shape `imports/*`/`semantics/*`/`syntax/*` codes use) naming the
// entity and property whose content was mutated.
//
// `emitter/*` diagnostics are deliberately NOT added to CHECK_CODES
// (checker/check-codes.ts) — that registry's own header comment freezes it
// as "the frozen public checker-code registry" scoped to `code:` sites
// under src/checker/ and src/pipeline/ only (check-codes.test.ts's
// stability test greps exactly those two directories), the same reason
// `imports/*`/`semantics/*`/`syntax/*` codes (produced by pipeline phases
// outside the checker) live outside it too. `emitter/quote-swap` follows
// that same precedent: a new producing area gets its own code prefix, not
// an entry force-fit into the checker's frozen baseline.
import type { AssetNode } from '../ast/asset-node.ts';
import type { ClassFileNode } from '../ast/class-file-node.ts';
import type { ClassNode } from '../ast/class-node.ts';
import type { ConstantsNode } from '../ast/constants-node.ts';
import type { DependencyNode } from '../ast/dependency-node.ts';
import type { Diagnostic } from '../ast/diagnostic.ts';
import type { DtoNode } from '../ast/dto-node.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import type { FileNode } from '../ast/file-node.ts';
import type { FunctionNode } from '../ast/function-node.ts';
import type { ProgramNode } from '../ast/program-node.ts';
import type { RunParameterNode } from '../ast/run-parameter-node.ts';
import type { Span } from '../ast/span.ts';
import type { UiComponentNode } from '../ast/ui-component-node.ts';
import { quoteSwapOccurred } from './quote-string-literal.ts';

export const QUOTE_SWAP_CODE = 'emitter/quote-swap';

// Style guide (lib/typed-mind/docs/diagnostic-style-guide.md): WHAT + WHERE
// in `message` (backtick-quoted names), WHAT-TO-DO folded into `message`
// too — `Diagnostic` carries no `suggestion` field (TM-3's message-only
// design, per checker/finding.ts's header comment), matching the existing
// `imports/read-failure` / `semantics/illegal-continuation` precedent of
// folding clause 3 into the message text itself.
export const quoteSwapDiagnostic = (entityName: string, propertyName: string, span: Span): Diagnostic => {
  return {
    code: QUOTE_SWAP_CODE,
    severity: 'warning',
    span,
    message: `'${propertyName}' on '${entityName}' contained a double quote, which was rewritten to a single quote — the grammar has no escaped-quote form, so this emission cannot preserve the original character`,
  };
};

const pushIfSwapped = (
  diagnostics: Diagnostic[],
  entityName: string,
  propertyName: string,
  value: string | undefined,
  span: Span,
): void => {
  if (value !== undefined && quoteSwapOccurred(value)) {
    diagnostics.push(quoteSwapDiagnostic(entityName, propertyName, span));
  }
};

// Mirrors exactly the set of free-text properties emit-shortform.ts and
// emit-longform.ts route through `quoteStringLiteral` for each entity kind.
// `entity.comment` is quoted ONLY in longform (`descriptionAndPurposeLines`
// prints it as `description:`) — shortform's own inline comment
// (`withInlineComment`, emit-shortform.ts) is appended as a raw, unquoted
// trailing `# comment` and never reaches `quoteStringLiteral`, so `form`
// gates whether `comment` is checked at all; checking it unconditionally
// would over-report a shortform emission that never touched the value.
// DtoFieldNode.description is checked only where a field carries one.
// TypeDefNode's alias branch is deliberately excluded from both forms:
// `typeDefToLongform` (emit-longform.ts) does NOT route its aliasType text
// through `quoteStringLiteral` — that call site is the documented bucket-b
// gap (issue #103 addendum) where the swap would be a semantic regression,
// not a safe substitution, so no diagnostic is produced for it here either;
// nothing was silently swapped there to report.
export const quoteSwapDiagnosticsFor = (entity: EntityNode, form: 'shortform' | 'longform'): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  if (form === 'longform') {
    pushIfSwapped(diagnostics, entity.name, 'comment', entity.comment, entity.span);
  }
  switch (entity.kind) {
    case 'Program':
      pushIfSwapped(diagnostics, entity.name, 'purpose', (entity as ProgramNode).purpose, entity.span);
      break;
    case 'File':
      pushIfSwapped(diagnostics, entity.name, 'purpose', (entity as FileNode).purpose, entity.span);
      break;
    case 'Function':
      pushIfSwapped(diagnostics, entity.name, 'description', (entity as FunctionNode).description, entity.span);
      break;
    case 'Class':
      pushIfSwapped(diagnostics, entity.name, 'purpose', (entity as ClassNode).purpose, entity.span);
      break;
    case 'ClassFile':
      pushIfSwapped(diagnostics, entity.name, 'purpose', (entity as ClassFileNode).purpose, entity.span);
      break;
    case 'Constants':
      pushIfSwapped(diagnostics, entity.name, 'purpose', (entity as ConstantsNode).purpose, entity.span);
      break;
    case 'DTO': {
      const dto = entity as DtoNode;
      pushIfSwapped(diagnostics, entity.name, 'purpose', dto.purpose, entity.span);
      for (const field of dto.fields) {
        pushIfSwapped(diagnostics, entity.name, `field '${field.name}'.description`, field.description, field.span);
      }
      break;
    }
    case 'Asset':
      pushIfSwapped(diagnostics, entity.name, 'description', (entity as AssetNode).description, entity.span);
      break;
    case 'UIComponent':
      pushIfSwapped(diagnostics, entity.name, 'purpose', (entity as UiComponentNode).purpose, entity.span);
      break;
    case 'RunParameter': {
      const runParameter = entity as RunParameterNode;
      pushIfSwapped(diagnostics, entity.name, 'description', runParameter.description, entity.span);
      pushIfSwapped(diagnostics, entity.name, 'defaultValue', runParameter.defaultValue, entity.span);
      break;
    }
    case 'Dependency':
      pushIfSwapped(diagnostics, entity.name, 'purpose', (entity as DependencyNode).purpose, entity.span);
      break;
    case 'TypeDef':
      // No quoteStringLiteral call site reachable for TypeDef — see header
      // comment.
      break;
  }
  return diagnostics;
};
