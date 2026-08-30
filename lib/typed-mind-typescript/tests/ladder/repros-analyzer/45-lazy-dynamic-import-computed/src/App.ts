// RC-E sibling repro — a non-literal (computed template-string) specifier
// inside the SAME lazy()-wrapped call-argument nesting as fixture 44. This
// confirms the fix does not disturb the pre-existing non-literal-specifier
// diagnostic path (X-AN-2): a computed path cannot be followed, so it must
// still surface `non-literal-dynamic-import`, not silently do nothing.
import { lazy } from './lazy.ts';

const page = 'home';
const Home = lazy(() => import(`./pages/${page}.ts`));

export class App {
  render(): string {
    return Home;
  }
}
