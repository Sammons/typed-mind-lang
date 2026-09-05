// One conversion owns one allocator. Reservation keys describe source or
// generated identities; emission happens later and does not reserve again.
export class EmittedNameAllocator {
  readonly #namesByKey = new Map<string, string>();
  readonly #keysByName = new Map<string, string>();

  clear(): void {
    this.#namesByKey.clear();
    this.#keysByName.clear();
  }

  nameFor(key: string): string | undefined {
    return this.#namesByKey.get(key);
  }

  reserve(key: string, candidates: readonly string[]): string {
    const existing = this.#namesByKey.get(key);
    if (existing !== undefined) return existing;
    const base = candidates.at(-1) || 'Generated';
    let name = candidates.find((candidate) => candidate.length > 0 && !this.#keysByName.has(candidate));
    if (name === undefined) {
      let suffix = 2;
      while (this.#keysByName.has(`${base}${suffix}`)) suffix += 1;
      name = `${base}${suffix}`;
    }
    this.#namesByKey.set(key, name);
    this.#keysByName.set(name, key);
    return name;
  }
}
