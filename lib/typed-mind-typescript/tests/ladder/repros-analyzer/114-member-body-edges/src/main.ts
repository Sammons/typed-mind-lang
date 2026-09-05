import { Store } from './store.ts';

export const main = (): number => new Store().size;
