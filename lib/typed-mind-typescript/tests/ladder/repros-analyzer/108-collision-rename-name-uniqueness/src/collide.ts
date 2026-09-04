// The adversarial declaration: a real, hand-authored interface whose name is
// byte-identical to the qualified name `src/settings.ts`'s losing `Options`
// would otherwise be renamed to.
//
// Before the fix, the reservation pass recorded only QUALIFIED names in its
// `assignedNames` set and wrote bare names unguarded, so whichever of these
// two was processed second silently took a name the other already held — two
// distinct entities both called `Settings__Options`, emitted with no error and
// surfacing only as two `checker/duplicate-name` findings in the output.
export interface Settings__Options {
  fromCollide: boolean;
}

export const readCollide = (): Settings__Options => {
  return { fromCollide: true };
};
