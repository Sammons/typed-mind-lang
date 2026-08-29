// D-LEG-2 (rfc-tm-10-diamond.md §2, issue #65) — Pick<S3Client, "send">
// never synthesized a Dependency-exports stub entity for S3Client, since
// ensureBuiltinExtendsStub only fires on `extends` clauses, never on a
// generic-kind TypeExprNode's argument list. This fixture exercises the
// exact outbound-delivery shape: the generic argument in a FUNCTION
// SIGNATURE return type, not only the DTO-field path.
import type { S3Client } from '@aws-sdk/client-s3';

export function getSender(): Pick<S3Client, 'send'> {
  return {} as Pick<S3Client, 'send'>;
}

export interface DeliveryOptions {
  client: Pick<S3Client, 'send'>;
}
