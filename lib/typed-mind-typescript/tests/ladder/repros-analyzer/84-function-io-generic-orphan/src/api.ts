// Mirrors sammons/s7-constructor lib/ui/src/api.ts: `ApiResult` is exported
// from this module and consumed ONLY as a generic argument inside these two
// functions' return types.
export type Wrapped = {
  value: string;
};

export type Boxed = {
  count: number;
};

// `Wrapped` is reachable ONLY through this function's generic return type.
export const fetchWrapped = async (): Promise<Wrapped[]> => {
  return [{ value: 'a' }];
};

// `Boxed` is reachable ONLY through this function's generic parameter type.
export const countBoxes = (boxes: ReadonlyArray<Boxed>): number => {
  return boxes.length;
};
