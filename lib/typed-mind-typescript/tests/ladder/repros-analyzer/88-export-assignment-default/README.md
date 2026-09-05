# 88 — canonical default identity and initializer references

Source corpus: `sammons/bens-almanac`, router modules declaring `const app` and
exporting that identifier by default. The original analyzer omitted the export
assignment; the converter also compared importer-local aliases with the source
name. Adding the export alone could not preserve identity across same-name routers.

RFC-TM-13 D resolves the local declaration and allocates one `HealthFile.default`
entity through the shared allocator. Named and default exposures of the same
source declaration use that identity; the original name remains in analyzer
metadata. Different importer-local aliases do not create separate entities.

RFC-TM-13 F retains the actual initializer call to `buildHealthStatus`. The
original fixture now checks with zero diagnostics. Removing that call restores
the helper orphan; removing the default import restores the owner/default orphan.
Tests in `default-identities.test.ts` and `rung-bens-almanac.test.ts` bind this
claim to source extraction, emitted edges, and parser/checker results.

Imported identifier assignments, unresolved identifiers and anonymous default
expressions receive an explicit unsupported-default-export analyzer diagnostic.
They do not synthesize a local declaration or rename a remote declaration.
Existing anonymous-expression modeling is outside this increment.

References: [RFC-TM-13](https://pages.tail4ea214.ts.net/rfc-tm-13/),
[declaration origins PR172](https://git.tail4ea214.ts.net/sammons/typed-mind-lang/pulls/172).
