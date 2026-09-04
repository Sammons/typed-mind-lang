// Corpus: sammons/slat products/slat/scripts/backup.ts (`RestoreFailure`,
// 7 variants) and src/utils/readBody.ts (`ReadBodyFailure`). The repo's
// failure-union stance (failures_are_local_tagged_unions) means these are
// everywhere, and prettier/biome spell a multi-line union with a LEADING `|`.
//
// Issue #114 already routes a union of object literals to the TypeDef path.
// This fixture pins the hole in that fix: the leading-bar spelling.

/** Single-line spelling — issue #114's own shape, always routed correctly. */
export type SingleLineUnion = { tagged: false } | { tagged: true; label: string };

/** Leading-bar multi-line spelling — the shape that fell through. */
export type RestoreFailure =
  | {
      readonly kind: 'restore_db_exists';
      readonly dbPath: string;
    }
  | {
      readonly kind: 'restore_hash_mismatch';
      readonly expected: string;
      readonly actual: string;
    };

export const describeRestoreFailure = (failure: RestoreFailure): string => {
  return failure.kind;
};
