// RFC-TM-7 §2 (rfc-tm-7-diamond.md, S-CONS-WEB-1) — config for the playground
// headless smoke. webServer boots the site's own serve.js against the
// already-built lib/typed-mind-static-website.
//
// SERVE_JS_PATH picks which serve.js to boot, because this suite runs in two
// different layouts:
//   - local dev (e2e/mock/run.sh + Dockerfile): the site's serve.js + dist/
//     are mounted read-only as siblings under ./site/, so no image needs the
//     rest of the pnpm workspace.
//   - CI (.gitea/workflows/ci.yml's playground-smoke job): the job runs
//     inside a `container: mcr.microsoft.com/playwright:...` job image with
//     the full repo checked out at its real path — no docker-in-docker, no
//     mounts, so serve.js is reached via its real relative path instead.
// Both paths exercise the identical static-file server `pnpm serve` and
// Cloudflare Pages both use.
import { defineConfig } from '@playwright/test';

const SERVE_JS_PATH = process.env.SERVE_JS_PATH ?? './site/serve.js';

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYGROUND_URL ?? 'http://127.0.0.1:8080',
  },
  webServer: {
    command: `node ${SERVE_JS_PATH}`,
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
