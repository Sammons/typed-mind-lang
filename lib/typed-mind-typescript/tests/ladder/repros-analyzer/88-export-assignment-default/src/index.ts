// Corpus: sammons/bens-almanac src/api/index.ts, which imports all eight route
// modules by default binding and mounts each with `app.route(...)`.
//
// `analyzeModule`'s visitor has branches for isFunctionDeclaration /
// isClassDeclaration / isInterfaceDeclaration / isTypeAliasDeclaration /
// isVariableStatement, each gated on `hasExportModifier` — but NO branch for
// `ts.isExportAssignment`. A bare `export default <identifier>` carries no
// export MODIFIER (the export-ness lives in the ExportAssignment node itself),
// so the route module's default export was never parsed into a ParsedExport.
// `registerModuleExports` therefore never set `defaultExport`, and
// `resolveImportToEntity`'s `moduleExports.defaultExport === importName` check
// always failed — dropping the import edge and orphaning the route file plus
// everything reachable only through it.
//
// `namedHelper` is the control: an ordinary exported declaration in the same
// module graph, whose edge resolved correctly before the fix.
import health from './routes/health.ts';
import { namedHelper } from './routes/helper.ts';

export const createApi = (): string => {
  return `${health.get().status}:${namedHelper()}`;
};
