// Corpus: sammons/s7-constructor services/app/src/db-types.ts.
// RFC-TM-13 B2 closes both original defects: Generated, the generic base,
// now joins ExternalThing in Dependency.exports, and DTO field validation
// resolves those exports when no local entity owns the name.
// The ladder test removes the exports and reproduces both original findings.
import type { Generated, ExternalThing } from 'external-lib';

export type AccountsTable = {
  id: Generated<string>;
  picked: Pick<ExternalThing, "id">;
  name: string;
};

export const describeAccount = (row: AccountsTable): string => {
  return row.name;
};
