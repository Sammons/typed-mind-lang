# Releasing

This is the single documented procedure for cutting a TypedMind release.
RFC-TM-7 §3 (`rfc-tm-7-diamond.md`, S-CI-2) froze this as the one entry
point; `version-bump.yml` implements it, and `scripts/check-version-lockstep.mjs`
enforces it on every PR.

## Published packages

Five packages publish to npm and move version-in-lockstep (RFC-TM-4 §3,
S-CORE-3):

- `@sammons/typed-mind` (`lib/typed-mind`)
- `@sammons/typed-mind-cli` (`lib/typed-mind-cli`)
- `@sammons/typed-mind-lsp` (`lib/typed-mind-lsp`)
- `@sammons/typed-mind-renderer` (`lib/typed-mind-renderer`)
- `@sammons/typed-mind-typescript` (`lib/typed-mind-typescript`)

The VS Code extension (`lib/typed-mind-vscode-extension`, package name
`typed-mind`) tracks the same version number but publishes to the VS Code
Marketplace, not npm — `version-sync.sh` updates its manifest in the same
step. `lib/typed-mind-static-website` and `lib/typed-mind-test-suite` are
private and never publish; they carry no independent version.

## Step 1: Bump the version

Run the **Version Bump** workflow (`.github/workflows/version-bump.yml`) from
the GitHub Actions tab (`workflow_dispatch`), with:

- `version`: the new semantic version, e.g. `1.2.3`.
- `create_pr`: `true` (default) to open a PR for review, or `false` to commit
  directly to `main`.

This is the **only** sanctioned way to change a package version. It runs
`.github/scripts/version-sync.sh <version>`, which:

1. Sets `.version` on the root `package.json`.
2. Sets `.version` on every `lib/*/package.json`, including all five
   published packages and the VS Code extension.
3. Rewrites the workspace-internal `dependencies` entries that pin
   `@sammons/typed-mind`, `-renderer`, `-cli`, `-lsp` to the new version.
4. Regenerates `pnpm-lock.yaml` (`pnpm install --lockfile-only`).

Do not hand-edit a package's `version` field. A hand-edit desyncs the
lockstep and fails `pnpm run ci`'s `check:version-lockstep` step on the next
PR touching any package.

If `create_pr` was `true`, review and merge that PR before continuing.

## Step 2: Tag the release

From `main`, at the commit that carries the bumped versions:

```bash
git tag v1.2.3
git push origin v1.2.3
```

The tag format is `v<semver>` (`v1.2.3` or a prerelease like
`v1.2.3-beta.1`) — `release.yml`'s tag-push trigger and its `validate` job
both parse this exact shape.

## Step 3: `release.yml` takes over

Pushing the tag triggers `.github/workflows/release.yml`, which:

1. **`validate`**: parses the tag, and its "Verify versions match" step
   confirms every `lib/*/package.json` version equals the tag version — the
   second, independent enforcement of lockstep (`check:version-lockstep`
   catches drift pre-merge; this step catches it at tag time).
2. **`test`**: lints, tests, and builds every package (mise-pinned wasm
   toolchain runs first — see below).
3. **`publish-npm`**: publishes the five npm packages in dependency order
   (`@sammons/typed-mind` first).
4. **`publish-vscode`**: packages and publishes the VS Code extension.
5. **`create-release`**: creates the GitHub release with changelog and
   artifacts.
6. **`deploy-docs`**: deploys the documentation site (skipped for
   prereleases).

No manual step runs between the tag push and a published release — a bad tag
is the only way to stop it, by not pushing one.

## Wasm toolchain in the release pipelines

`npm-publish.yml`, `release.yml`, and `vscode-publish.yml` each install the
mise-pinned toolchain (`tree-sitter` + `wasi-sdk`, pinned in the root
`mise.toml`) before any step that builds or packs `@sammons/typed-mind`.
Without it, that package's `prebuild`/`pretest`/`prepack` hooks
(`scripts/build-wasm.mjs`) fail for lack of the tree-sitter CLI and wasi-sdk
that compile `grammar/` to `grammar.wasm`. The steps mirror
`.gitea/workflows/deploy-static-site.yml`'s mise setup:

```yaml
- name: Install mise
  run: |
    curl https://mise.run | sh
    echo "$HOME/.local/bin" >> "$GITHUB_PATH"

- name: Install toolchain
  run: mise install
```

## Wasm packaging guard

Two independent layers stop a wasm-less publish:

1. **`prepack`** (`lib/typed-mind/package.json`) chains `build-wasm.mjs` then
   `stage-published-wasm.mjs`; the latter throws on a missing source wasm or
   a zero-byte staged copy.
2. **`pnpm run check:pack`** (`scripts/check-pack.mjs`, wired into
   `pnpm run ci`) runs `npm pack --dry-run` against `lib/typed-mind` and
   asserts `grammar.wasm` is listed in the tarball's file set — this catches
   a `files`/`.npmignore` misconfiguration that ships a wasm-less tarball
   even though `prepack` staged the file correctly on disk, and it catches a
   `prepack` bypass (e.g. `--ignore-scripts`).

## Publishing tool guard: pnpm, never npm

This is a pnpm workspace: internal dependencies between the five published
packages use the `workspace:*` protocol (e.g. `@sammons/typed-mind-cli`
depends on `"@sammons/typed-mind": "workspace:*"`). `npm publish` and
`npm pack` copy `package.json` into the tarball verbatim — npm does not
implement the workspace protocol and never rewrites it. Only `pnpm publish`
(and `pnpm pack`) rewrite `workspace:*` to the real version at pack time.

Three prior releases (`@sammons/typed-mind-renderer` 0.2.1,
`@sammons/typed-mind-lsp` 0.1.8, `@sammons/typed-mind-cli` 0.1.8) shipped to
npm with a literal `workspace:*` in their `dependencies`, making them
uninstallable (`EUNSUPPORTEDPROTOCOL`) for every npm consumer. Always
publish with `pnpm publish`, never `npm publish` or `npm pack`.

Three independent layers stop a repeat:

1. **`prepublishOnly` guard** on each of the five published packages
   (`lib/typed-mind`, `lib/typed-mind-cli`, `lib/typed-mind-lsp`,
   `lib/typed-mind-renderer`, `lib/typed-mind-typescript`) checks
   `npm_config_user_agent` and exits nonzero unless it starts with `pnpm/`.
   This fires the moment `npm publish` runs, before any build or test step.
2. **`pnpm run check:release-manifests`** (`scripts/check-release-manifests.ts`,
   wired into `pnpm run ci` right after `check:pack`) packs every published
   package with `pnpm pack`, extracts the tarball's `package/package.json`,
   and fails if any `dependencies` / `peerDependencies` /
   `optionalDependencies` value starts with `workspace:`, or if
   `publishConfig.access` is not `"public"`.
3. **`pnpm run release`** — the sanctioned top-level release command — runs
   `pnpm run validate && pnpm run check:release-manifests && pnpm -r --filter
   './lib/*' publish --access public`. It never shells out to `npm publish`.

`pnpm run check:release-manifests` does not check version equality across
packages — `pnpm run check:version-lockstep` already owns that check.

## What this procedure does not do

Neither `version-bump.yml` nor any check in `pnpm run ci` performs the bump
or the publish automatically. Both acts are operator-owned (RFC-TM-7 D-5):
a human decides when to cut a release and runs Step 1, and `release.yml`'s
publish jobs only run in response to that human pushing the tag in Step 2.
