// The SECOND declarer of `Recorder`. Renamed to `Audit__Recorder`.
export class Recorder {
  record(event: string): void {
    void event;
  }
}

export const makeAuditRecorder = (): Recorder => {
  return new Recorder();
};
