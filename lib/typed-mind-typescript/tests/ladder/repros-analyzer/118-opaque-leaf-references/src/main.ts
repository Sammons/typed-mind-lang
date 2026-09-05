// Entry: reaches every exported surface through value imports and the `run`
// signature, so the fixture's only diagnostics come from the type-surface
// references under test (never from an unreached export or file).
import { Param } from './tenant.ts';
import type { AccessorControl, IndexControl, Persisted } from './tenant.ts';
import { codeCount } from './codes.ts';
import type { Code } from './codes.ts';

export const run = (record: Persisted, code: Code, index: IndexControl, accessor: AccessorControl): Param => {
  void code;
  void index;
  void accessor;
  void codeCount();
  return new Param({ id: 'x', name: 'y', kind: record.tier ?? 'basic' });
};
