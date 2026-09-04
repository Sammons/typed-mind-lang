// Corpus: sammons/slat products/slat/src/infrastructure/clock.ts and
// src/types.ts. Every DTO in that codebase spells its fields `readonly`
// (the repo's own TypeScript stance), and the live extraction emitted 139 of
// 140 DTOs with an EMPTY field list because of it.
//
// `Edition` and `Port` are reachable ONLY through a field of `AliasConfig`.
// When the fields drop, both become `checker/orphaned-entity`.
export type Edition = 'self-host' | 'hosted';

export type Port = number;

/** A readonly-spelled type alias — the shape the whole slat corpus uses. */
export type AliasConfig = {
  readonly edition: Edition;
  readonly port: Port;
};

/** The same shape spelled as an interface — the AST path, always correct. */
export interface IfaceConfig {
  readonly edition: Edition;
  readonly port: Port;
}

/** A property legitimately NAMED `readonly` must keep parsing as a field. */
export type NamedReadonly = {
  readonly: boolean;
  edition: Edition;
};

/** Optionality must survive the modifier strip. */
export type OptionalReadonly = {
  readonly edition?: Edition;
};

export const describeConfig = (config: AliasConfig): string => {
  return `${config.edition}:${config.port}`;
};
