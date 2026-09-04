// decision-same-named-entities PR 1, declaration form: TYPE ALIAS.
//
// Two modules each declare `export type Payload = { ... }`. Before PR 1,
// `convertTypeAliasToDTO` hit `Duplicate entity name` on the second and
// aborted the whole conversion. Now the second is renamed to
// `Storage__Payload` and both DTOs survive with their own fields.
import { readPayload } from './storage.ts';

export type Payload = {
  id: string;
};

export const makePayload = (): Payload => {
  readPayload();
  return { id: 'a' };
};
