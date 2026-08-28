// RFC-TM-8 §8/§9 (rfc-tm-8-diamond.md) — X-SUPP-3: suppressed-not-silenced
// checker semantics. Applied at the typed-mind.ts facade layer, the same seam
// `skipOrphanCheck` already uses for a coarser check-skipping option — this
// keeps every existing check-*.ts module untouched (findings are produced
// unconditionally; suppression is a post-processing partition over the
// finding list, doc §8 "After all checks run, the checker partitions
// findings").
//
// Matching rule (doc §7 grain ruling: "(code, target entity)" per run).
// Findings in this codebase carry only a span (checker/finding.ts), not an
// entity name — every existing check attaches `entity.span` verbatim as its
// finding's span (check-orphans.ts, check-dto-fields.ts, etc., confirmed
// across every check-*.ts module as of Q1/this Quantum). Q2's later
// X-TYPE-4 per-part span refinement narrows some findings to a SUB-SPAN of
// their entity's own declaration span (a field's own span sits strictly
// inside the entity's span) — so span CONTAINMENT (not exact equality)
// against the resolved target entity's span is the match rule: it is exactly
// equality's natural generalization (a span contains itself) and requires no
// change here when Q2 lands its narrower spans, per this Quantum's contract
// not to depend on Q2's unmerged work.
//
// checker/stale-suppression (doc §8): a suppression matching ZERO findings
// this run is itself a finding, severity error (I-9: one strict bar; an
// outlived suppression is rot the checker must fail on). A suppression whose
// target resolves to no entity at all is unmatchable by definition and is
// therefore always stale — this is the case I-10 exists to report (the
// grain ruling: SuppressionNode carries `target: string`, not an entity
// reference, exactly so an absent target is representable).
//
// Meta-suppression (doc §8, closing FAQ): the suppression-machinery codes
// (checker/stale-suppression and any future checker/suppression-*) are not
// suppressible. An entry naming one is rejected with its own dedicated
// finding rather than silently accepted or silently dropped — the doc's
// "closing the meta-suppression loop."
//
// Rename-aware matching (doc §9, X-SUPP-7): a suppression's code is resolved
// through the check-codes.ts RECORDED_RENAMES ladder before matching against
// diagnostics — a suppression naming a code with a recorded rename to `X`
// matches `X`'s findings, so a code rename does not instantly convert every
// document suppressing the old spelling into a stale-suppression failure.
// isMetaSuppressionCode below checks the RESOLVED code (post-rename), because
// the meta-suppression rejection is about which code is actually live today,
// not which spelling the document author used.

import type { Diagnostic } from '../ast/diagnostic.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import type { Span } from '../ast/span.ts';
import type { SuppressionNode } from '../ast/suppression-node.ts';
import { resolveSuppressionCode } from './check-codes.ts';

const NOT_SUPPRESSIBLE_CODE_PREFIX = 'checker/suppression-';
const STALE_SUPPRESSION_CODE = 'checker/stale-suppression';
const META_SUPPRESSION_CODE = 'checker/meta-suppression-rejected';

const isMetaSuppressionCode = (code: string): boolean => {
  return code === STALE_SUPPRESSION_CODE || code.startsWith(NOT_SUPPRESSIBLE_CODE_PREFIX);
};

// Span containment: `outer` fully covers `inner` when inner starts at or
// after outer's start and ends at or before outer's end (line-major,
// column-minor comparison — the same ordering compareDiagnosticsBySpan uses
// in pipeline/cst-to-ast.ts).
const startsAtOrAfter = (candidate: Span['start'], boundary: Span['start']): boolean => {
  if (candidate.line !== boundary.line) {
    return candidate.line > boundary.line;
  }
  return candidate.column >= boundary.column;
};

const endsAtOrBefore = (candidate: Span['end'], boundary: Span['end']): boolean => {
  if (candidate.line !== boundary.line) {
    return candidate.line < boundary.line;
  }
  return candidate.column <= boundary.column;
};

const spanContains = (outer: Span, inner: Span): boolean => {
  return startsAtOrAfter(inner.start, outer.start) && endsAtOrBefore(inner.end, outer.end);
};

export interface ApplySuppressionsResult {
  readonly diagnostics: readonly Diagnostic[];
  // I-10: suppressions are visible and counted in output — the exact count
  // of findings this run silenced-but-kept (doc §8's "suppressed-summary
  // line").
  readonly suppressedCount: number;
}

// One suppression's match set: every diagnostic whose code equals the
// suppression's code — resolved through the rename ladder first — AND whose
// span sits inside the resolved target entity's span. A suppression whose
// target does not resolve to any entity has an empty match set by
// construction (undefined byName lookup), which is exactly the "absent
// target" stale case the grain ruling calls out.
const matchesFor = (
  suppression: SuppressionNode,
  diagnostics: readonly Diagnostic[],
  byName: ReadonlyMap<string, EntityNode>,
): Diagnostic[] => {
  const target = byName.get(suppression.target);
  if (target === undefined) {
    return [];
  }
  const resolvedCode = resolveSuppressionCode(suppression.code);
  return diagnostics.filter((diagnostic) => diagnostic.code === resolvedCode && spanContains(target.span, diagnostic.span));
};

export const applySuppressions = (
  diagnostics: readonly Diagnostic[],
  suppressions: readonly SuppressionNode[],
  byName: ReadonlyMap<string, EntityNode>,
): ApplySuppressionsResult => {
  const suppressedDiagnostics = new Set<Diagnostic>();
  const extraFindings: Diagnostic[] = [];
  const suppressionByDiagnostic = new Map<Diagnostic, SuppressionNode>();

  for (const suppression of suppressions) {
    if (isMetaSuppressionCode(resolveSuppressionCode(suppression.code))) {
      // Meta-suppression: reject the entry with its own dedicated finding.
      // The rejected entry is NOT applied (its named code/target pair is
      // never treated as a live suppression) — closing the loop means a
      // suppression cannot shield the suppression machinery from scrutiny.
      extraFindings.push({
        code: META_SUPPRESSION_CODE,
        severity: 'error',
        span: suppression.span,
        message: `Suppression of '${suppression.code}' is rejected: suppression-machinery codes are not suppressible`,
      });
      continue;
    }
    const matches = matchesFor(suppression, diagnostics, byName);
    if (matches.length === 0) {
      extraFindings.push({
        code: STALE_SUPPRESSION_CODE,
        severity: 'error',
        span: suppression.span,
        message: `Stale suppression: '${suppression.code}' on '${suppression.target}' matches no finding this run`,
      });
      continue;
    }
    for (const match of matches) {
      suppressedDiagnostics.add(match);
      suppressionByDiagnostic.set(match, suppression);
    }
  }

  const projected = diagnostics.map((diagnostic) => {
    const suppression = suppressionByDiagnostic.get(diagnostic);
    if (suppression === undefined) {
      return diagnostic;
    }
    return { ...diagnostic, suppression: { reason: suppression.reason, span: suppression.span } };
  });

  return {
    diagnostics: [...projected, ...extraFindings],
    suppressedCount: suppressedDiagnostics.size,
  };
};
