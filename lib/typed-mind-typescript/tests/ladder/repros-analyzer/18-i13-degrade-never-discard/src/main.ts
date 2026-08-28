// I-13 fixture — a real duplicate-entity-name collision (two classes named
// `Widget` declared in different files, both reachable from the entrypoint)
// that the converter cannot silently resolve. This is a genuine converter
// error distinct from the X-CONV-4 Program-name collision (which the naming
// fix now eliminates): entity-name collisions from real duplicate source
// names remain a live `addError` path this Quantum's degrade-never-discard
// policy covers.
import * as other from './other.ts';

export class Widget {
  render(): string {
    return 'main-widget';
  }
}

export const consumeOther = (): other.Widget => new other.Widget();
