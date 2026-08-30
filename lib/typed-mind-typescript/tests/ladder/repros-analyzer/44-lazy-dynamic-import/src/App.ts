// RC-E repro (issue #107) — distilled from the real webhookstorage clone's
// `App.tsx:22-28`: `const Dashboard = lazy(() => import('./pages/Dashboard.js'));`.
// A dynamic `import()` call nested inside a call/arrow argument (here,
// `lazy`'s loader callback) never produced an import-graph edge, even
// though TM-9 Q1 (X-AN-2) already made top-level/statement-level dynamic
// imports visible. `Home` is a genuine, real route target — not dead code.
import { lazy } from './lazy.ts';

const Home = lazy(() => import('./pages/home.ts'));

export class App {
  render(): string {
    return Home;
  }
}
