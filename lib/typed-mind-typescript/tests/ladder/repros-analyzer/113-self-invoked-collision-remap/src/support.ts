// Sorts SECOND (`src/main.ts` < `src/support.ts`), so this declaration is
// the one renamed — to `SupportFile.runWorker`. `supportLimit` calls it so
// the renamed entity has a consumer and the control stays finding-free.
export function runWorker(): number {
  return 8;
}

export const supportLimit = (): number => {
  return runWorker() / 2;
};
