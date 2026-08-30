// Adversarial-review blocker fix repro (PR #105 review comment) —
// `registerModuleExports`'s `withoutExt` used to strip only
// `ts|tsx|js|jsx`, while `stripKnownSourceExtension` (used on the read
// side of the RC-A moduleGraphResolution fast path) strips 8 extensions
// including `mts`. For an `.mts` source module the write-side key and the
// read-side lookup key disagreed, silently dropping the import edge for
// any `.mts`/`.cts`/`.mjs`/`.cjs` module — reproducing RC-A's own bug for
// those four extensions specifically.
import { Home } from './pages/home.mts';

export class App {
  render(): string {
    return Home();
  }
}
