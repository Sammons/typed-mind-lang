#!/usr/bin/env bash
# RFC-TM-7 §2 (rfc-tm-7-diamond.md, S-CONS-WEB-1) — host-side driver for the
# playground headless smoke, per the claude-home ui-testing skill's
# docker-first pattern: build the image, mount the already-built static site
# read-only, run Playwright inside the container.
#
# Precondition: lib/typed-mind-static-website/dist/ must already exist —
# `pnpm --dir lib/typed-mind-static-website run build` (which itself builds
# the browser bundle per build.js's Step 3). CI runs that build before this
# script; a stale or missing dist/ fails fast below rather than smoke-testing
# nothing.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SITE_DIST="$REPO_ROOT/lib/typed-mind-static-website/dist"
SITE_SERVE_JS="$REPO_ROOT/lib/typed-mind-static-website/serve.js"
SITE_PACKAGE_JSON="$(dirname "${BASH_SOURCE[0]}")/site-package.json"

if [ ! -d "$SITE_DIST" ]; then
  echo "error: $SITE_DIST does not exist. Run: pnpm --dir lib/typed-mind-static-website run build" >&2
  exit 1
fi

IMAGE_TAG="typedmind-e2e-mock:playground-smoke"

docker build -t "$IMAGE_TAG" "$(dirname "${BASH_SOURCE[0]}")"

# serve.js and dist/ are mounted read-only, as siblings under /work/site/, so
# playwright.config.ts's webServer (`node ./site/serve.js`, resolving
# ./site/dist relative to serve.js's own __dirname) finds both without the
# image needing the rest of the pnpm workspace. Read-only mounts: the
# container never writes into the host checkout.
#
# site-package.json ({"type":"commonjs"}) is ALSO mounted, as
# /work/site/package.json: Node's ESM/CJS detection for an extension-less
# `.js` file walks UP from the file looking for the nearest package.json,
# and without one under /work/site/, that walk lands on this image's own
# /work/package.json (`"type": "module"`, needed for the Playwright spec) —
# which wrongly makes serve.js's `require(...)` calls fail as ESM. A
# sibling package.json under site/ scopes serve.js back to CommonJS without
# touching the image's own module type.
docker run --rm \
  --cpus=2 \
  --memory=1g \
  -v "$SITE_SERVE_JS:/work/site/serve.js:ro" \
  -v "$SITE_DIST:/work/site/dist:ro" \
  -v "$SITE_PACKAGE_JSON:/work/site/package.json:ro" \
  -e PLAYGROUND_URL="http://127.0.0.1:8080" \
  "$IMAGE_TAG"
