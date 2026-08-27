# RFC-TM-7 §2 (rfc-tm-7-diamond.md, S-CONS-WEB-1) — headless Playwright smoke
# for the TypedMind playground, run per the claude-home ui-testing skill's
# docker-first pattern (all pnpm/playwright execution happens inside this
# image, never on the host runner directly). The image version MUST match
# @playwright/test's pinned version in package.json — a mismatch is the
# single most common Playwright-in-Docker failure mode.
FROM mcr.microsoft.com/playwright:v1.56.1-noble

WORKDIR /work

# Only this smoke's own package.json is needed inside the image: the site
# under test is served as a pre-built, static dist/ (see run.sh), so no
# workspace source, no other package's node_modules, and no build step run
# inside the container.
COPY package.json ./
RUN npm install --no-audit --no-fund

COPY playwright.config.ts ./
COPY playground-smoke.spec.ts ./

CMD ["npx", "playwright", "test"]
