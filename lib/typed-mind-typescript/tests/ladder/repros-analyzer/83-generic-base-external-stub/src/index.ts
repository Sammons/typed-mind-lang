// Corpus: sammons/s7-constructor services/app/src/db-types.ts, whose kysely
// table types spell every generated column Generated<string> / Generated<Date>
// (the import is a type-only named import of Generated from the kysely
// package). The live extraction reports 8 "references undefined type
// 'Generated'" errors across the app-server and app-migrate entrypoints.
//
// TWO defects compose here, and this fixture pins both.
//
// (1) Converter, `walkGenericArgsForExternalStubs`
//     (typescript-to-typedmind-converter.ts:3648-3658): the `generic` case
//     walks `node.args` and stubs each `named` argument through
//     `addExternalTypeToDepExports`, but it never inspects `node.base`. An
//     external type in the generic's BASE position is therefore never offered
//     to the stub mechanism, while one in the ARGUMENT position is. The
//     asymmetry is visible in the emitted .tmd: the Dependency entity carries
//     `-> [ExternalThing]` but never `Generated`.
//
// (2) Checker, `check-dto-fields.ts` `checkNamedPart`: a Dependency's `-> [..]`
//     export list never enters `CheckContext.byName` (check-context.ts:38-42
//     maps ENTITY names only), and `checkNamedPart` resolves a field's type
//     name solely through `context.byName`. So even the argument-position stub
//     that D-LEG-2 does emit fails to satisfy the field reference.
//
// Consequence: fixing (1) alone changes nothing observable, because (2)
// discards the stub. Both fields below therefore error on main, and the
// argument-position field is NOT a passing control — it is the evidence that
// the D-LEG-2 stub mechanism is inert at the checker boundary.
import type { Generated, ExternalThing } from 'external-lib';

export type AccountsTable = {
  id: Generated<string>;
  picked: Pick<ExternalThing, "id">;
  name: string;
};

export const describeAccount = (row: AccountsTable): string => {
  return row.name;
};
