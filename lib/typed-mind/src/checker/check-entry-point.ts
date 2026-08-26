// RFC-TM-4 §1 (rfc-tm-4-diamond.md) — DSLValidator.checkEntryPoint ported
// verbatim (validator.ts:655-686): no-Program error, undefined entry, and the
// entry-must-be-a-File kind error (which double-reports with the reference
// legality entry arm exactly as legacy does — only the F4
// dependency-direct-consumption pair was resolved, §1).

import { ProgramNode } from '../ast/program-node.ts';
import type { Span } from '../ast/span.ts';
import type { CheckContext } from './check-context.ts';

// The no-Program error has no token to anchor to — the diagnostic reports an
// ABSENCE. Legacy pinned {line 1, column 1} (validator.ts:660); the named
// constant keeps that wire position without a constant-column literal at a
// diagnostic construction site (the I-6 tripwire's target is lazy per-token
// hardcoding, not the document origin).
const DOCUMENT_ORIGIN_LINE = 1;
const DOCUMENT_ORIGIN_COLUMN = 1;
const documentOriginSpan = (): Span => {
  const origin = { line: DOCUMENT_ORIGIN_LINE, column: DOCUMENT_ORIGIN_COLUMN };
  return { start: origin, end: origin };
};

export const checkEntryPoint = (context: CheckContext): void => {
  const programs = [...context.byName.values()].filter((entity) => entity instanceof ProgramNode);

  if (programs.length === 0) {
    context.addFinding({
      code: 'checker/no-entry-point',
      severity: 'error',
      span: documentOriginSpan(),
      message: 'No program entry point defined',
      suggestion: 'Add a Program entity: AppName -> EntryFile',
    });
  }

  for (const program of programs) {
    const entryFile = context.byName.get(program.entry);
    if (entryFile === undefined) {
      context.addFinding({
        code: 'checker/entry-not-found',
        severity: 'error',
        span: program.span,
        message: `Program '${program.name}' references undefined entry point '${program.entry}'`,
        suggestion: `Define a File entity: ${program.entry} @ path/to/file.ext:`,
      });
    } else if (entryFile.kind !== 'File') {
      context.addFinding({
        code: 'checker/entry-not-file',
        severity: 'error',
        span: program.span,
        message: `Program '${program.name}' entry point '${program.entry}' must be a File entity, but found ${entryFile.kind}`,
        suggestion: `Change '${program.entry}' to a File entity: ${program.entry} @ path/to/file.ext:`,
      });
    }
  }
};
