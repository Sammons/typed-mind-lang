// The SECOND declarer of `Payload`. Renamed to `Storage__Payload`.
export type Payload = {
  bytes: number;
};

export const readPayload = (): Payload => {
  return { bytes: 0 };
};
