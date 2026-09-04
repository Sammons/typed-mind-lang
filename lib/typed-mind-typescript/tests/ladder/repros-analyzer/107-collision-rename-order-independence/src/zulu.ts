// Sorts SECOND, so this declaration is the one renamed — to `Zulu__Shared`.
export interface Shared {
  fromZulu: number;
}

export const readZulu = (): Shared => {
  return { fromZulu: 1 };
};
