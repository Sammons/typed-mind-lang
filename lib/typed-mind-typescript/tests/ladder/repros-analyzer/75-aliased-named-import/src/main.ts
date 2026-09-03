// Distilled from itp-maker `cli/itp-cli.ts:51`
// (`import { adoptTemplate as adoptTemplateCmd } from
// "./commands/adopt-template.ts";`).
//
// `parseImportDeclaration` (typescript-analyzer.ts:999-1001) records
// `element.name.text` for every named-import specifier. For an ALIASED
// specifier `{ doWork as doWorkAliased }`, TypeScript's AST puts the
// LOCAL alias in `element.name` and the ORIGINAL exported name in
// `element.propertyName`. The analyzer reads only `element.name`, so the
// recorded import name is `doWorkAliased` — a name the target module
// never exports. `resolveImportToEntity`
// (typescript-to-typedmind-converter.ts:2712-2716) then looks that name
// up in the target module's export registry, misses, and contributes NO
// import edge. The imported file is reported orphaned and so is every
// entity it exports, even though the import is real and used.
//
// The unaliased sibling `alsoWork` is the in-fixture control: same file,
// same import statement, no alias — it must keep resolving, proving the
// defect is the alias specifically and not import resolution generally.
import { doWork as doWorkAliased, alsoWork } from './helper.ts';

export const main = (): string => {
  return doWorkAliased('hello') + alsoWork('world');
};
