// The SECOND declarer of `DEFAULTS`. Renamed to `Limits__DEFAULTS`.
export const DEFAULTS = {
  maxBytes: 1024,
};

export const limitOf = (): number => {
  return DEFAULTS.maxBytes;
};
