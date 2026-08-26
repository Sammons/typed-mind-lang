// RFC-TM-3 §3.1 (rfc-tm-3-diamond.md) — one `@import "path" [as Alias]` /
// `import "path" [as Alias]` statement as a parse product. Replaces the legacy
// ImportStatement record (types.ts) whose position was hardcoded to column 1;
// this node carries a real span per §3.2. Plain data, no tree-sitter
// references (I-8), all fields readonly.

import type { Span } from './span.ts';

export class ImportStatementNode {
  readonly path: string;
  readonly alias: string | undefined;
  readonly span: Span;
  readonly raw: string;

  // Explicit field assignment (not constructor parameter properties):
  // parameter properties are non-erasable syntax. Assign-only, no side effects.
  constructor(args: { path: string; alias?: string | undefined; span: Span; raw: string }) {
    this.path = args.path;
    this.alias = args.alias;
    this.span = args.span;
    this.raw = args.raw;
  }
}
