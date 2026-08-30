// issue #87 — `registerModuleExports` (typescript-to-typedmind-converter.ts)
// indexes `exportRegistry` under extension-LESS specifier guesses only
// (`./checkHelper`, never `./checkHelper.ts`). This codebase's own
// `module_is_nodenext`/`verbatimModuleSyntax` convention writes internal
// imports WITH an explicit extension, so `imp.specifier` is
// `'./checkHelper.ts'` verbatim, never the extension-less key the registry
// was indexed under — the lookup misses and the import edge is silently
// dropped. Fixed by stripping a known source extension before the lookup.
import { checkOrphans } from './checkHelper.ts';

export class AstValidatorLike {
  validate(name: string): boolean {
    return checkOrphans(name);
  }
}
