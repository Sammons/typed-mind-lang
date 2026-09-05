import { scan } from './cursor.ts';
import { walk } from './walker.ts';

export const main = (): number => walk('.') + (scan() === undefined ? 0 : 1);
