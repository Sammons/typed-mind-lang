// RC-E repro — the lazy-loaded route target. Genuinely rendered by App.ts's
// route table, exactly like the real webhookstorage clone's `Dashboard`,
// `Endpoints`, etc. (issue #107's own disclosure). DEFAULT export, matching
// the real corpus shape exactly (`export default function Dashboard() {...}`)
// — a `lazy(() => import(...))` call has no bound import name, so the
// preact-iso/React.lazy contract always targets a module's DEFAULT export.
export default function Home(): string {
  return 'home';
}
