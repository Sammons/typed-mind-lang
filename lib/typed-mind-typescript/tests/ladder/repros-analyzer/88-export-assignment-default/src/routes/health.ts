// Corpus: sammons/bens-almanac src/routes/*.ts — eight Hono route modules,
// each building a router into a `const` and then exporting that identifier
// with a bare `export default app;`.
//
// The module carries a real function alongside the exported binding, matching
// the corpus shape (a router with handlers registered on it). That also keeps
// the module off `isPureTypesFile`'s branch, which routes types-and-constants-
// only modules away from File-entity creation for reasons unrelated to this
// gap.
export interface HealthStatus {
  status: string;
}

export const buildHealthStatus = (): HealthStatus => {
  return { status: 'ok' };
};

const app = {
  get: (): HealthStatus => buildHealthStatus(),
};

export default app;
