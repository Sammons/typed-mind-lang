import { BaseWidget } from './base.ts';

// A mixin factory: returns an anonymous class. `WithLogging(BaseWidget)` is a
// CallExpression, so it names no class entity in the extracted graph.
export const WithLogging = (Base: typeof BaseWidget): typeof BaseWidget => {
  return class extends Base {};
};
