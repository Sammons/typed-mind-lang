// Callgraph increment repro — distilled from the real webhookstorage
// clone's `packages/functions/src/api/db/endpoint-secrets.ts`. Two exported
// functions (`generateSecret`, `hashSecret`) are called ONLY from a third
// exported function in this same file (`createSecret`), never from another
// module. Pre-fix, both flag `checker/orphaned-entity` because the
// converter's `calls: []` stub never recorded the same-file call edge.
//
// `SecretWalker` is exported and `new`'d ONLY inside `createSecret`'s own
// body, mirroring core's `Cst*` AST-wrapper-class shape (`walkCstToAst`
// constructing `CstToAstWalker` internally) — a same-file `new` target, not
// a same-file plain call. `Secrets` exists ONLY so
// `convertToClassFile`'s primary-class selection (matches the module's own
// basename, `secrets.ts` -> `Secrets`) fuses IT into this module's
// ClassFile instead of `SecretWalker` — `SecretWalker` then converts as a
// plain Class, the only shape `calls.to` (valid-references.ts) legally
// allows a `new`-resolved same-file edge to name (never a ClassFile; see
// fixture 49 for the ClassFile-target regression this decoy class avoids).

/** Generate a random secret. */
export function generateSecret(): string {
  return `whse_${Math.random().toString(36).slice(2)}`;
}

/** Hash a plaintext secret. */
export function hashSecret(plaintext: string): string {
  return `hashed:${plaintext}`;
}

/** Decoy primary class — matches this module's own basename so the
 * converter's ClassFile fusion picks THIS class, leaving SecretWalker
 * below as a plain, non-fused Class entity. */
export class Secrets {
  ping(): string {
    return 'primary';
  }
}

/** Walks a secret's derived fields; only ever constructed same-file. */
export class SecretWalker {
  constructor(private readonly plaintext: string) {}

  digest(): string {
    return hashSecret(this.plaintext);
  }
}

/** Create a new secret record. Real cross-file entrypoint into this file. */
export function createSecret(): { plaintext: string; hash: string } {
  const plaintext = generateSecret();
  const hash = hashSecret(plaintext);
  const walker = new SecretWalker(plaintext);
  void walker;
  return { plaintext, hash };
}
