# RFC-TM-7 §2 (rfc-tm-7-diamond.md, S-CONS-WEB-1) — headless Playwright smoke
# for the TypedMind playground. LOCAL DEV ONLY (see README.md) — CI
# (.gitea/workflows/ci.yml's playground-smoke job) does not build or run this
# image; it runs the job itself inside the same base image via the job-level
# `container:` directive, since crankshaft-ci's job containers have no docker
# socket (no DinD). The image version MUST match @playwright/test's pinned
# version in package.json, and the tag here must match ci.yml's `container:`
# image tag — a mismatch is the single most common Playwright-in-Docker
# failure mode.
FROM mcr.microsoft.com/playwright:v1.56.1-noble

WORKDIR /work

# Only this smoke's own package.json is needed inside the image: the site
# under test is served as a pre-built, static dist/ (see run.sh), so no
# workspace source, no other package's node_modules, and no build step run
# inside the container.
COPY package.json ./
RUN corepack enable && corepack prepare pnpm@11.15.1 --activate && pnpm install --no-frozen-lockfile

COPY playwright.config.ts ./
COPY playground-smoke.spec.ts ./

CMD ["pnpm", "exec", "playwright", "test"]
