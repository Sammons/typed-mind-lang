// RC-F repro (issue #108) — distilled from the real webhookstorage clone's
// `packages/functions/src/api/routes/account.ts`: every handler is an
// inline arrow callback passed as the second argument to
// `accountRoutes.openapi(...)`. There is not one top-level `function` or
// `class` declaration in this file — `getDpaRoute` is a `const` (a
// route-schema object, the same shape `createRoute`/`z` build in the real
// clone), so `isPureTypesFile`'s pre-fix `hasRealCode` check (which only
// ever inspected `module.classes`/`module.functions`) misclassified this
// file as "pure types" and routed it away from `convertImports` entirely,
// silently dropping the real `getDpaStatus` import.
import { getDpaStatus } from '../db.ts';
import { OpenApiApp } from '../hono-stand-in.ts';

export const accountRoutes = new OpenApiApp();

const getDpaRoute = { path: '/dpa', method: 'get' as const };

accountRoutes.openapi(getDpaRoute, async (c) => {
  void c;
  return getDpaStatus();
});
