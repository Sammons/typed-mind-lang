// Sorts first among the two `Options` declarers (`src/config.ts` <
// `src/settings.ts`), so this one keeps the bare `Options`.
export interface Options {
  fromConfig: string;
}

export const readConfig = (): Options => {
  return { fromConfig: 'c' };
};
