# Playground browser smoke (e2e/mock)

RFC-TM-7 §2 (`rfc-tm-7-diamond.md`, S-CONS-WEB-1) — the headless browser half
of the playground's two-layer parity check. Loads the built site, waits for
`typedmind-ready`, and validates a known-good and known-bad snippet through
`window.typedMindBrowser`. The node-graph half (verdict parity between the
browser build and the CLI) lives at
`lib/typed-mind-test-suite/src/browser-graph-parity.test.ts`.

## Two run paths, one spec

The same `playground-smoke.spec.ts` + `playwright.config.ts` run in two
different layouts, selected by the `SERVE_JS_PATH` env var
(`playwright.config.ts`'s `webServer.command`):

- **Local dev — Docker** (`./run.sh`): builds `Dockerfile` (based on
  `mcr.microsoft.com/playwright:v1.56.1-noble`) and runs it with the
  already-built `lib/typed-mind-static-website/{serve.js,dist/}` mounted
  read-only as siblings under `./site/` inside the container.
  `SERVE_JS_PATH` defaults to `./site/serve.js`, matching that mount.
  Precondition: `pnpm --dir lib/typed-mind-static-website run build` first.

- **CI** (`.gitea/workflows/ci.yml`'s `playground-smoke` job): the job runs
  INSIDE the Playwright image via the job-level `container:` directive —
  `container: { image: mcr.microsoft.com/playwright:v1.56.1-noble }` — not
  via `docker build`/`docker run` steps. crankshaft-ci (the sole registered
  runner) spawns each job's container itself via host Docker (its
  `ubuntu-latest` label is `docker://.../runner-images:ubuntu-latest`); job
  containers on this runner are unprivileged with no docker socket
  (`knowledge/infrastructure/gitea-act-runner-cube.md`), so DinD
  (`docker build`/`docker run` as steps) is not available and never will be
  without a runner-host change. The job checks out the full repo, builds the
  site with mise (same toolchain steps as the `validate` job), then runs
  Playwright directly against `SERVE_JS_PATH=../../lib/typed-mind-static-website/serve.js`
  — the real relative path, since nothing is mounted.

Both paths exercise the identical static-file server `pnpm serve` and
Cloudflare Pages both use; only how `serve.js` is reached differs.

## Files

- `playground-smoke.spec.ts` — the Playwright spec.
- `playwright.config.ts` — shared config; `SERVE_JS_PATH` env var picks the
  server command.
- `Dockerfile` + `run.sh` — local-dev-only Docker path. Not used by CI.
- `package.json` — pins `@playwright/test` to the same version as the
  `mcr.microsoft.com/playwright` image tag used by both paths. Keep these in
  sync on any Playwright version bump.
