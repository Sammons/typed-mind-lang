// issue #113 repro — distilled from the real slat-harness clone's
// packages/harness/src/api/types.ts: a JSDoc comment containing an inner
// double-quoted phrase, emitted verbatim into the grammar's single-line
// `string` token (which excludes `"`), corrupts the .tmd output at the
// description's own closing quote.

/** A "needs you" item — an agent waiting on the human in a thread. */
export interface NeedsItem {
  id: string;
  who: string;
}

export const app: NeedsItem = { id: '1', who: 'ben' };
