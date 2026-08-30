// Adversarial-review blocker fix repro — shares basename `events` and
// parent directory name `x` with `../../pkg_a/x/events.ts`; the two full
// relative paths ('src/pkg-a/x/events.ts' vs 'src/pkg_a/x/events.ts')
// sanitize to the identical string.
export function fromPkgDashA(): string {
  return 'pkg-a';
}
