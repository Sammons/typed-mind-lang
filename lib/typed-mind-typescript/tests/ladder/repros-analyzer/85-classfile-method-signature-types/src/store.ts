// Mirrors sammons/s7-constructor tools/worktree-mediator/src/store.ts.
// `StoreConfig` is used ONLY as the constructor's parameter type and
// `AllocationFailure` ONLY in `allocate`'s return union. Neither name appears
// anywhere a ClassFile entity can record it.
export type Lease = {
  id: string;
  portBase: number;
};

export type StoreConfig = {
  rangeBase: number;
  rangeCount: number;
};

export type AllocationFailure = {
  kind: 'no_capacity';
};

export class LeaseStore {
  private readonly config: StoreConfig;
  private leases: Lease[];

  constructor(config: StoreConfig, leases: Lease[] = []) {
    this.config = config;
    this.leases = leases;
  }

  allocate(worktreePath: string): Lease | AllocationFailure {
    if (this.leases.length >= this.config.rangeCount) {
      return { kind: 'no_capacity' };
    }
    const lease = { id: worktreePath, portBase: this.config.rangeBase };
    this.leases.push(lease);
    return lease;
  }

  list(): readonly Lease[] {
    return this.leases;
  }
}
