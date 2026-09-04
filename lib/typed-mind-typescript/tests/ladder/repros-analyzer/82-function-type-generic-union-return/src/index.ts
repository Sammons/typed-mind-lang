// Corpus: sammons/s7-constructor lib/harness/src/model-client.ts
// (`S7ModelClient.runTurn`) and lib/harness/src/forks.ts
// (`S7ForkRunner.runSummaryFork`).
//
// An interface method whose type is a FUNCTION TYPE returning a GENERIC whose
// argument is a UNION (`(a: X) => Promise<Y | Z>`) leaves an unconsumed `>` in
// `parseTypeExprText`'s remainder, and the emitted field line is then rejected
// by the grammar as "Unparsable text: `>`".
//
// The `(params) => Return` rescan in `parseAtom` calls `scanOpaqueRun` with the
// CALLER's `inGenericArgs` (false at a field's top level), so `scanOpaqueRun`
// never tracks angle depth for the generic the arrow RETURNS. The `|` inside
// `Promise<...>` is therefore read as a TOP-LEVEL union operator and ends the
// opaque run early, stranding the generic's own closing `>`.
//
// Control: the same shape WITHOUT a union inside the generic
// (`(a: X) => Promise<Y>`) already parses correctly as one opaque leaf, which
// is what isolates the union-inside-the-returned-generic as the trigger.
export type Outcome = {
  summary: string;
};

export type Failure = {
  reason: string;
};

export type Message = {
  body: string;
};

export interface ModelClient {
  // The gap: a union inside the returned generic.
  runTurn: (start: string) => Promise<Message[] | Failure>;
  // Control: no union inside the returned generic — already correct on main.
  runOnce: (start: string) => Promise<Outcome>;
}

export const makeClient = (): ModelClient => {
  return {
    runTurn: async (start: string) => [{ body: start }],
    runOnce: async (start: string) => ({ summary: start }),
  };
};
