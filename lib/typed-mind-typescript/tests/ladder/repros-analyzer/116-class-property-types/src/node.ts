// RFC-TM-14 §S4 R3a (rfc-tm-14-diamond.md, fixture 116): class property types
// reach the emitted document as `property:` members. Mirrors the live core
// shapes `readonly slots: AccumulatorSlots = {}` (entity-accumulator.ts:98),
// `readonly optionalityMarker: OptionalityMarker` (dto-field-node.ts:22) and
// `readonly paramType: RunParameterType` (run-parameter-node.ts:11).
export interface Slots {
  a?: string;
}

export type Marker = 'none' | 'question';

export class Node {
  readonly slots: Slots = {};
  marker?: Marker;
  private hidden: Marker = 'none';

  run(): void {
    void this.hidden;
  }
}
