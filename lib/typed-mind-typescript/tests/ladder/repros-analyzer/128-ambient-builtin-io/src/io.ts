// storage-usage.ts:16 shape — a bare ambient parameter type.
export const formatUtcDate = (date: Date): string => {
  return date.toISOString().slice(0, 10);
};

// web-main/web-app handler shape — an ambient wrapped in Promise.
export const fetchThing = (): Promise<Response> => {
  return fetch('https://example.invalid/thing');
};

export const readBody = (response: Response): Promise<string> => {
  return response.text();
};

// An ambient wrapper whose argument is a project type.
export interface Thing {
  id: string;
}

export const byId = (things: Map<string, Thing>): Map<string, Thing> => {
  return things;
};
