// Adversarial-review blocker fix repro — see the sibling
// `pkg-a/x/events.ts`'s own comment for the collision mechanism.
export function fromPkgUnderscoreA(): string {
  return 'pkg_a';
}
