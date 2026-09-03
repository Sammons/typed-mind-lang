// Mixin-application base class: `class X extends Mixin(Base)`. The heritage
// clause's expression is a CallExpression, not an identifier — the shape Lit
// (`SignalWatcher(LitElement)`), and every other mixin-factory library, uses.
import { BaseWidget } from './base.ts';
import { WithLogging } from './mixin.ts';

// Control: a plain subclass whose heritage expression is an Identifier. Its
// inheritance edge must survive unchanged.
export class PlainWidget extends BaseWidget {
  describe(): string {
    return 'plain';
  }
}

// The repro: the heritage expression is a CallExpression.
export class LoggedWidget extends WithLogging(BaseWidget) {
  describe(): string {
    return 'logged';
  }
}
