import { BROKEN, LIST, MODE, NAMES, RULES } from './rules.ts';

export const main = (): number => {
  return Object.keys(RULES).length + NAMES.size + MODE.length + LIST.length + Object.keys(BROKEN).length;
};
