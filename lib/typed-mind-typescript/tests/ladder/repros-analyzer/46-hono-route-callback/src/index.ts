// RC-F repro — entrypoint mirroring the real clone's `api/index.ts`
// importing the route module.
import { accountRoutes } from './routes/account.ts';

export const app = accountRoutes;
