// Distilled signature of packages/core/src/notification-signing.ts from the
// real webhookstorage clone (infra/api.ts imports notification-signing
// values via `./outbound`, which is the infra-layer wrapper — this
// packages/core file is what packages/ingest crosses the project-reference
// boundary to reach).
export function signNotification(payload: string, key: string): string {
  return `${payload}:${key}`;
}
