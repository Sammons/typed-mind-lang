// The SECOND declarer of `Config` in traversal order. Its declaration is
// renamed to `Settings__Config`; `main.ts` keeps the bare `Config`.
export interface Config {
  retries: number;
}

export const loadSettings = (): Config => {
  return { retries: 3 };
};
