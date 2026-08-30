// RC-D repro (ladder-diagnostic-disposition-2026-08-29.md rank 3, issue
// #101) — distilled from the real claude-home `.claude/skills/notion/
// scripts/notion-client.ts`'s `NotionPropertySchema.relation` field: a
// two-level-nested inline object literal authored across multiple source
// lines, on an INTERFACE property (not a function parameter/return type,
// which issue #72/#86 already cover). `convertInterfaceToDTO`'s field loop
// used to emit `prop.type` sanitized only by `.trim()`, preserving the
// source's own newlines verbatim and never recursing into the nested
// shape — the exact defect this fixture proves fixed.
export interface PropertySchema {
  status?: { options: string[] };
  relation?: {
    database_id?: string;
    single_property?: boolean;
    dual_property?: {
      synced_property_name?: string;
      synced_property_id?: string;
    };
  };
}
