// RFC-TM-10 Q3 amendment fixture — the real webhookstorage shape that
// exposed the Function-entity naming collision: api.ts has its own SST
// handler string AND imports auth.ts, which has its own, independent SST
// handler string. Both resolved targets export a function literally named
// `handler`. Distilled from the live-clone finding (infra/api.ts +
// infra/auth.ts in the real clone).
import { provisionFn } from './auth.ts';

export const apiFn = {
  handler: 'packages/functions/src/api/index.handler',
};

export const usesAuth = provisionFn;
