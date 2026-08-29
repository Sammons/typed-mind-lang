// Adversarial-review blocker #3 (PR #84, 2nd review round, comment 19118):
// a conventional types-only file classified `isPureTypesFile` — X-CONV-3's
// own fixed ordering (`convertModules`) always processes `regularFiles`
// (any module with a function, hence any module inline-DTO synthesis can
// fire from) BEFORE `pureTypesFiles`. Without a WHOLE-RUN reservation pass
// (over every module, not just the current one), a hand-authored interface
// living HERE could be silently evicted by a same-named synthesized DTO
// from a function in `main.ts` (a `regularFile`, processed first). See
// `convertModules`'s own doc comment for the fix.
export interface ProcessBatchInput {
  reason: string;
}
