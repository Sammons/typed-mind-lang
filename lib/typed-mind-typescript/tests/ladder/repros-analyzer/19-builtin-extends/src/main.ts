// L-g6 (RFC-TM-9 X-CONV-5) — a class extending a global ambient builtin.
// Authored fresh from the census prose (extraction-gap-census-language.md
// gap 6): "a TS class extending a global builtin: `class NotionApiError
// extends Error { ... }` (real source, 03-claude-home-tooling-v2.tmd:18)."
// No prior repro file existed for this gap — this fixture is that repro.
export class NotionApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotionApiError';
  }
}
