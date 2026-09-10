// TMD entity names: /[A-Za-z_]\w*(\.[A-Za-z_]\w*)*/
export function sanitizeTmdName(raw: string): string {
  let s = raw.replace(/<[^>]*>/g, '');
  s = s.replace(/-/g, '_');
  s = s.replace(/[^\w.]/g, '');
  s = s.replace(/^[^A-Za-z_]+/, '');
  if (s.length === 0) s = 'Generated';
  return s;
}

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
    const sanitized = candidates.filter((c) => c.length > 0).map(sanitizeTmdName);
    const base = sanitized.at(-1) || 'Generated';
    let name = sanitized.find((candidate) => candidate.length > 0 && !this.#keysByName.has(candidate));
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
