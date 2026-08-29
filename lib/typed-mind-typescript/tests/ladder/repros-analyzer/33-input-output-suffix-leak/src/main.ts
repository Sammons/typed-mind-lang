// issue #77 (rfc-tm-10-diamond.md follow-up) — isDTOLikeType classifies a
// type as DTO-like BY KIND (D-LEG-1/D-LEG-5), but extractInputDTO/
// extractOutputDTO returned the type text UNMODIFIED into `input`/`output`,
// which the shortform emitter writes verbatim after `<-`/`->` into the
// grammar's bare-entity_name-only input_name/output_name slots
// (grammar.js:811,815, /[A-Za-z_]\w*/). A DTO-like type is not always a
// bare identifier. Each function below exercises one non-bare-identifier
// shape that is DTO-like by isDTOLikeType's elimination branch:
//   - a union with `null` (`HydratedTenantRecord | null`, live evidence:
//     typed-mind core's `CstNamedNode | undefined`, webhookstorage's
//     ingest/functions-api)
//   - an array suffix (`OrganizationApiKey[]`, live evidence: typed-mind
//     core's `Diagnostic[]`)
//   - a generic-argument suffix (`MiddlewareHandler<IngestEnv>`, live
//     evidence: webhookstorage's ingest)
//   - a bare function type (`() => void`, live evidence: webhookstorage's
//     web-main/web-app)
// The fix: `isBareEntityName` guards both extraction functions, leaving
// input/output undefined for any of these shapes — the type stays visible
// in the signature text regardless.
export interface HydratedTenantRecord {
  id: string;
}

export interface OrganizationApiKey {
  key: string;
}

export interface IngestEnv {
  region: string;
}

export function lookupTenant(): HydratedTenantRecord | null {
  return null;
}

export function listApiKeys(): OrganizationApiKey[] {
  return [];
}

export function makeMiddleware(handler: MiddlewareHandler<IngestEnv>): void {
  void handler;
}

export type MiddlewareHandler<T> = (env: T) => void;

export function onReady(): () => void {
  return () => {};
}

// Control case: the ORIGINAL true-positive interface case (a bare
// identifier resolving to a real interface) must keep routing through
// input/output, unchanged by this fix.
export interface Widget {
  name: string;
}

export function makeWidget(input: Widget): Widget {
  return input;
}
