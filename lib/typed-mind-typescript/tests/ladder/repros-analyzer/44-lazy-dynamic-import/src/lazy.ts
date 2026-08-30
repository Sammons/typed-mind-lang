// RC-E repro fixture support — a minimal stand-in for preact-iso's `lazy`
// helper (or React.lazy). The shape that matters is the CALL SITE
// (`lazy(() => import('./pages/Home.ts'))`), not this function's own body.
export const lazy = <T>(loader: () => Promise<T>): T => loader() as unknown as T;
