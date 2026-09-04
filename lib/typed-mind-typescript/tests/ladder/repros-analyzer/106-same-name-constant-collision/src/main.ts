// decision-same-named-entities PR 1, declaration form: CONSTANT.
//
// Two modules each declare `export const DEFAULTS`. This form's pre-PR-1
// behavior was the WORST of the seven sites: `createConstantEntity` did not
// error, it SILENTLY returned. The surviving Constants entity carried the
// first module's `path` and `schema` while BOTH Files still listed
// `DEFAULTS` in their `exports:`, so the emitted document claimed one entity
// was exported twice (`checker/multi-exported`) AND described the wrong
// module's shape. Now the second becomes `Limits__DEFAULTS`: two real
// entities, two real paths, no multi-exported finding.
import { limitOf } from './limits.ts';

export const DEFAULTS = {
  timeoutMs: 5000,
};

export const timeoutOf = (): number => {
  limitOf();
  return DEFAULTS.timeoutMs;
};
