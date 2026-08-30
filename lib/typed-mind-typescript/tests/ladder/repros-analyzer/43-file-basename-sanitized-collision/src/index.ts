// Adversarial-review blocker fix repro (PR #105 review comment 2) —
// `reserveFileEntityNames` disambiguates a basename collision by parent
// directory name first, falling back to the full sanitized relative
// directory path on a parent-dir-name sub-collision. `sanitizeEntityName`
// is lossy: it collapses '/', '-', '_', and case into one alnum-only
// PascalCase string, so `src/pkg-a/x` and `src/pkg_a/x` sanitize to the
// IDENTICAL string ('SrcPkgAX') even though they are two different real
// paths. Both modules below share the basename `events` AND the parent
// directory name `x` (forcing the full-path fallback tier), and their
// full relative paths sanitize identically — without the numeric-suffix
// backstop, the second module's reservation would silently clobber the
// first's.
import { fromPkgDashA } from './pkg-a/x/events.ts';
import { fromPkgUnderscoreA } from './pkg_a/x/events.ts';

export function handler(): string {
  return `${fromPkgDashA()} ${fromPkgUnderscoreA()}`;
}
