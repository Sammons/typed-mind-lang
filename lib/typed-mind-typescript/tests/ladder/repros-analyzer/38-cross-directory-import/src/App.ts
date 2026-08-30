// RC-A repro (ladder-diagnostic-disposition-2026-08-29.md rank 1, issue
// #99) — distilled from the real webhookstorage clone's `App.tsx`, which
// imports 14 real dependencies through subdirectory-crossing specifiers
// (`./pages/Home.js`, `./commands/tenant.js`, ...). Neither `pages/` nor
// `commands/` is `types`/`services`, so `registerModuleExports`'s fixed
// enumeration of guessed specifier shapes never covers them — the import
// edge silently drops with no diagnostic.
import { Home } from './pages/home.ts';
import { tenantCommand } from './commands/tenant.ts';

export class App {
  render(): string {
    return `${Home()} ${tenantCommand()}`;
  }
}
