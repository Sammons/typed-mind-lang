// decision-same-named-entities PR 1, declaration form: ENUM.
//
// Two modules each declare `export enum Status`. Before PR 1,
// `convertEnumToTypeDef` hit `Duplicate entity name` on the second and
// aborted the whole conversion. Now the second becomes `Worker__Status`
// and both TypeDef entities survive with their own member lists.
import { workerStatus } from './worker.ts';

export enum Status {
  Pending = 'pending',
  Done = 'done',
}

export const currentStatus = (): Status => {
  workerStatus();
  return Status.Pending;
};
