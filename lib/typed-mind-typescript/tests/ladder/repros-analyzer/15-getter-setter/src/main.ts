import { Widget } from './widget';

export function mainFn(): string {
  const w = new Widget();
  return w.describe();
}
