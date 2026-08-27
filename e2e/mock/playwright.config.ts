// RFC-TM-7 §2 (rfc-tm-7-diamond.md, S-CONS-WEB-1) — config for the playground
// headless smoke. webServer boots the site's own serve.js against the
// already-built lib/typed-mind-static-website — run.sh mounts that package's
// serve.js and dist/ into this directory's ./site/ before Playwright starts,
// so the smoke exercises the identical static-file layout `pnpm serve` and
// Cloudflare Pages both use, without needing the rest of the pnpm workspace
// inside the Docker image.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYGROUND_URL ?? 'http://127.0.0.1:8080',
  },
  webServer: {
    command: 'node ./site/serve.js',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
