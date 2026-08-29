// D-LEG-1 (rfc-tm-10-diamond.md §1, issue #59) — isDTOLikeType's two proven
// false-positive faces, both fixed by kind-resolved classification instead
// of a first-character heuristic:
//   (a) a quoted-string-union-literal return type ("empty" | "processed")
//       starts with `"`, trivially passing the old uppercase check. Double
//       quotes match the DSL's own string-literal token (grammar.js) and
//       the exact cited evidence (outbound-delivery's
//       Promise<"empty" | "processed">, extraction-ladder-rerun-2026-08-28.md).
//   (b) a Class-kind reference (CheckContext) also passes the old check.
// Both must leave input/output undefined post-fix (the type stays visible
// in the signature TEXT; only the machine-checked input/output edge is
// gone for these two non-DTO shapes).
export class CheckContext {
  value = 0;
}

export function processNextMessage(): "empty" | "processed" {
  return "empty";
}

export function inspect(ctx: CheckContext): CheckContext {
  return ctx;
}

// Control case: the ORIGINAL true positive this heuristic exists to serve
// — a real interface parameter/return type must keep routing through
// input/output, unchanged by this fix.
export interface Widget {
  name: string;
}

export function makeWidget(input: Widget): Widget {
  return input;
}
