// L-g1 (RFC-TM-9 X-CONV-1) — ES2022 hard-private method reference rejected
// by the grammar's `list_entry` token, which has no `#` alternative by
// design (census gap 1, issue #48). Fires on the tool's own source
// (`#getTypedMind`), cascading to 216 of ~300 ladder diagnostics.
export class Widget {
  publicMethod(): string {
    return this.#privateHelper();
  }

  #privateHelper(): string {
    return 'private-result';
  }
}
