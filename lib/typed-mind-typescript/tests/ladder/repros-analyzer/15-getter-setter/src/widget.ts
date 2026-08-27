export class Widget {
  #name: string = 'x';

  get name(): string {
    return this.#name;
  }

  set name(value: string) {
    this.#name = value;
  }

  describe(): string {
    return this.name;
  }
}
