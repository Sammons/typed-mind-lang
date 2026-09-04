// Loses the `Options` collision. Its module basename is `settings`, so the
// first disambiguator tier proposes `Settings__Options` — which is EXACTLY
// the name `src/collide.ts` below declares outright.
export interface Options {
  fromSettings: number;
}

export const readSettings = (): Options => {
  return { fromSettings: 1 };
};
