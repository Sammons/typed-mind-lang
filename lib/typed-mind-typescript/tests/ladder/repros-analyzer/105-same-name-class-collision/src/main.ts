// decision-same-named-entities PR 1, declaration form: CLASS.
//
// Two modules each declare `export class Recorder`. Before PR 1, the class
// lane aborted with `Duplicate entity name` at whichever of the two class
// sites the module routed through (`convertToClassFile` for a
// ClassFile-fused module, `convertClass` for a plain one). Now the second
// declaration becomes `Audit__Recorder` and both survive.
import { makeAuditRecorder } from './audit.ts';

export class Recorder {
  capture(metric: string): void {
    void metric;
  }
}

export const makeMainRecorder = (): Recorder => {
  makeAuditRecorder();
  return new Recorder();
};
