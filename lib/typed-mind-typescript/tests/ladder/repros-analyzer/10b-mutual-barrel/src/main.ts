import { fromA, fromB } from './a.ts';

export function mainFn(): string {
  return fromA() + fromB();
}
