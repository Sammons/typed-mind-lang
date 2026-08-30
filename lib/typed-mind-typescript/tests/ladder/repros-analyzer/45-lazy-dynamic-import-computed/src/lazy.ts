// RC-E sibling repro — same `lazy` stand-in as fixture 44.
export const lazy = <T>(loader: () => Promise<T>): T => loader() as unknown as T;
