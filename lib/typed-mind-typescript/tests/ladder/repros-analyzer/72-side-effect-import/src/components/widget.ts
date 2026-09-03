// A custom-element module: its whole purpose is the registration side effect.
// It exports nothing that any consumer imports by name.
export class Widget {
  render(): string {
    return 'widget';
  }
}

customElements.define('x-widget', Widget);
