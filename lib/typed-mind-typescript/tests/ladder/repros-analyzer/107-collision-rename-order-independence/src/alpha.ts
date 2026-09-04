// Sorts FIRST by project-relative path among the two declaring modules
// (`src/alpha.ts` < `src/zulu.ts`), so this declaration keeps the bare name
// under the canonical rule — regardless of traversal order.
export interface Shared {
  fromAlpha: string;
}

export const readAlpha = (): Shared => {
  return { fromAlpha: 'a' };
};
