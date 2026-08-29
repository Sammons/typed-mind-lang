// RFC-TM-10 Q3 amendment fixture — a sibling infra module with its OWN SST
// handler string, imported by api.ts, mirroring the real webhookstorage
// clone's `infra/auth.ts` relationship to `infra/api.ts`.
export const provisionFn = {
  handler: 'packages/functions/src/auth/provision-tenant.handler',
};
