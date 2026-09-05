// RFC-TM-13 H: a no-argument factory returns an existing named class.
// The analyzer retains the source call and records the returned declaration;
// the converter emits Widget as the base. Anonymous, structural and ambiguous
// constructor returns remain explicitly unresolved in the dedicated controls.
export class Widget {
  render(): string {
    return 'widget';
  }
}

export const makeWidget = (): typeof Widget => Widget;

export class SelfMadeWidget extends makeWidget() {
  label(): string {
    return 'self-made';
  }
}
