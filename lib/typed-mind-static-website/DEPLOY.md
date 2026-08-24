# Deployment Guide

The TypedMind site deploys to Cloudflare Pages. The live URL is **https://typedmind.sammons.io** (project `typedmind`, also served at https://typedmind.pages.dev).

## Automatic Deployment

The Gitea Actions workflow `.gitea/workflows/deploy-static-site.yml` deploys on every push to `main` that touches the site or the packages it builds against.

Required repo secrets (set with `pnpm gitea-admin secrets set` from claude-home):

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | Scoped token `typedmind-pages-deploy` (Pages Read + Write). Canonical copy: `secrets/typedmind-cloudflare-pages-token.age` in claude-home. |
| `CLOUDFLARE_ACCOUNT_ID` | The Cloudflare account id. |

## Manual Deployment

1. Install dependencies from the repo root:
   ```bash
   pnpm install --ignore-scripts
   ```
2. Build the packages the site build validates against:
   ```bash
   pnpm --dir lib/typed-mind build
   pnpm --dir lib/typed-mind-renderer build
   pnpm --dir lib/typed-mind-cli build
   ```
3. Build the site:
   ```bash
   cd lib/typed-mind-static-website && node build.js
   ```
4. Deploy with wrangler (needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the environment):
   ```bash
   pnpm exec wrangler pages deploy dist --project-name=typedmind --branch=main --commit-dirty=true
   ```

WARNING: `--branch=main` targets the production deployment. Omitting it on a non-main checkout lands the deploy in preview, and the custom domain keeps serving the old build.

## Custom Domain

`typedmind.sammons.io` is a proxied CNAME to `typedmind.pages.dev` in the sammons.io Cloudflare zone, attached to the Pages project as a custom domain. Manage the DNS record with `pnpm cloudflare-dns` from claude-home.

## Troubleshooting

- **Snippet validation fails with every snippet red**: the site build shells out to `lib/typed-mind-cli/dist/cli.cjs`. Build the CLI first (step 2 above).
- **Deploy lands in preview instead of production**: pass `--branch=main` explicitly (see warning above).
- **401 from wrangler**: the token is scoped to Pages only; regenerate from claude-home secrets if rotated.
