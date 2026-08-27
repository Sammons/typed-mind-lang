// X-AN-8 edge cases found by adversarial review of PR #49: (1) a
// setter-declared-before-getter pair must not lose the getter's return
// type or produce a stale `signature` string; (2) a static accessor and an
// instance accessor sharing the same name are two distinct class members,
// not one pair to fold together.
export class Widget {
  static #count = 0;
  #name = 'x';

  // Setter first: order must not matter to the fold.
  set name(value: string) {
    this.#name = value;
  }

  get name(): string {
    return this.#name;
  }

  // Same name as the instance accessor above, but static — must stay a
  // separate entry.
  static get name(): number {
    return Widget.#count;
  }

  // A lone setter with no paired getter.
  set writeOnly(value: string) {
    this.#name = value;
  }
}
