// Distilled signature of packages/ingest/src/server.ts from the real
// webhookstorage clone. The real repo's root tsconfig excludes `packages/`
// entirely (its `include` is `["sst-env.d.ts", "infra/**/*.ts"]`), so this
// file is only ever compiled as part of `packages/ingest`'s own
// project (`composite: true`, `references: [{ path: "../core" }]`) — a
// package-rooted entrypoint is the ONLY way to exercise the composite
// project-references boundary (RFC-TM-9 §8, the r2 F1 finding). This
// cross-package import is the fixture's proof case.
import { signNotification } from '../../core/src/notification-signing.ts';

export function handleIngest(payload: string): string {
  return signNotification(payload, 'ingest-key');
}
