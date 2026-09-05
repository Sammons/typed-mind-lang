// Pure-types module: no File entity of its own until a retained private
// Class needs an owner.
interface Reporter {
  report(line: string): void;
}

// Interface carrier: the DTO field is rewritten through the A2 type walk.
export interface Job {
  reporter: Reporter;
}

// Type-alias carrier: the object-literal members are opaque to the type
// parser, so the rewrite walks `key: type` members itself.
export type Batch = { readonly reporters: Reporter[]; fallback?: Reporter };
