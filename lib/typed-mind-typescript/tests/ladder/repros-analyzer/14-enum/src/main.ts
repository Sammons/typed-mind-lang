import { Status } from './status';

export interface Job {
  id: string;
  status: Status;
}

export function describe(j: Job): string {
  return j.status;
}
