// Callgraph increment repro — entrypoint mirroring the real webhookstorage
// clone's `api/index.ts` importing the secrets module (only `createSecret`
// crosses the file boundary; `hashSecret`/`generateSecret`/`SecretWalker`
// are same-file-only, exactly the shape this increment targets).
import { createSecret } from './secrets.ts';

export const app = createSecret;
