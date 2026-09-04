// Corpus: sammons/mail-agent `src/harness/envelope.ts:266` (`DispatchResult`)
// and `src/store/revert.ts:47` (`RevertOutcome`) — a `kind`-discriminated
// result union, the house style for a tagged failure/result type
// (knowledge/pillars/main.md `failures_are_local_tagged_unions`).
//
// TypeScript allows an OPTIONAL LEADING `|` before the first union member,
// which is how such a union is conventionally authored once it spans lines.
// That leading `|` is a separator with nothing before it, so
// `splitTopLevelUnionMembers` produced an EMPTY first member.
// `isUnionOfObjectLiterals` then failed its `.every(isInlineObjectLiteralType)`
// test on that empty string and returned false, so `isObjectLikeType`'s naive
// `type.includes('{')` fallback routed the union down the DTO branch — where
// the brace-slice found no `name: type` pairs and emitted a FIELDLESS
// `DispatchResult %`. Every member was silently dropped: the checker reported
// clean while the entire union body had vanished.
//
// `Interleaved` additionally carries a `//` comment BETWEEN members, which the
// real corpus does (envelope.ts:269, :271-273) and which leaks source
// commentary into the emitted type once the newline terminating it is gone.
//
// `SingleLine` is the control: the same union authored on one line already
// converted correctly and must be unchanged by the fix.
export type DispatchResult =
  | { kind: "none"; reason: string }
  | { kind: "reply"; text: string };

export type Interleaved =
  | { kind: "first"; a: string }
  // RFC-2 Addendum: this comment sits between two union members.
  | { kind: "second"; b: number };

export type SingleLine = { kind: "first"; a: string } | { kind: "second"; b: number };

export const dispatch = (result: DispatchResult, other: Interleaved, control: SingleLine): boolean => {
  return Boolean(result && other && control);
};
