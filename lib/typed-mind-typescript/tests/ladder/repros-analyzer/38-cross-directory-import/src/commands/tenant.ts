// RC-A repro — lives in `commands/`, mirroring the real webhookstorage
// ops-cli clone's `./commands/tenant.js` import (cli.ts:2-13), another
// subdirectory shape the prior fixed specifier enumeration never covered.
export const tenantCommand = (): string => 'tenant';
