// Resolve-first control: a project-declared `Headers` is a real DTO and
// keeps its output edge even though the name is also an ambient global.
// (Nothing else in this fixture uses the global `Headers`, so the flat
// entity namespace has exactly one referent for the name.)
export interface Headers {
  contentType: string;
}

export const makeLocalHeaders = (contentType: string): Headers => {
  return { contentType };
};
