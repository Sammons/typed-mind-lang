// The SECOND declarer of `Status`. Renamed to `Worker__Status`.
export enum Status {
  Idle = 'idle',
  Busy = 'busy',
}

export const workerStatus = (): Status => {
  return Status.Idle;
};
