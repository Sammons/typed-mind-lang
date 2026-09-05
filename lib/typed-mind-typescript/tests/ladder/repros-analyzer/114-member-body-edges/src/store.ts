// RFC-TM-14 R1c / R2b — every class member body carries body references.
// `Store` is the file's primary class (fused ClassFile). Mirrors the live
// shapes: a private method constructing a class (converter.ts:5315), a static
// method reading a Constants property chain (webhookstorage ErrorCode), a
// constructor calling a helper (analyzer.ts:198), an accessor and a property
// initializer reading a Constants, and a static block calling a helper.
export function helper(): void {}

export const LIMIT = 3;

export const ErrorTable = { A: { code: 'A' } } as const;

class Cache {
  size = 0;
}

export class Store {
  private hidden(): Cache {
    return new Cache();
  }

  static code(): string {
    return ErrorTable.A.code;
  }

  constructor() {
    helper();
  }

  get size(): number {
    return LIMIT + this.hidden().size;
  }

  readonly initial = LIMIT;

  static {
    helper();
  }
}

// S2-8 control: a class constructing itself inside its own static factory is
// not an edge (self targets are skipped by the class fold) and stays orphaned.
export class Self {
  static make(): Self {
    return new Self();
  }
}
