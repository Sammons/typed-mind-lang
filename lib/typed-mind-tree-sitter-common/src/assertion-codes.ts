// Frozen assertion-code registry shared across all tree-sitter language analyzers.
// Every deviations.push() call site in assertion-engine.ts must reference
// a code from this registry.

export interface AssertionCodeEntry {
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly suggestion: string;
  readonly docBody: string;
}

export const ASSERTION_CODES = {
  'assertion/parse-failure': {
    severity: 'error',
    message: 'TMD file has syntax errors.',
    suggestion: 'Fix the syntax errors in the TMD file. Run `typed-mind check` for details.',
    docBody:
      'The TMD file failed validation before the assertion engine could compare entities. ' +
      'The checker found one or more syntax or semantic errors. Fix these errors first; ' +
      'the assertion engine cannot compare graphs against an invalid TMD.',
  },
  'assertion/engine-error': {
    severity: 'error',
    message: 'Assertion engine encountered a runtime error.',
    suggestion: 'Check that the TMD file path is correct and the WASM grammar is built.',
    docBody:
      'An unexpected error occurred during assertion. This is not a TMD authoring error. ' +
      'Common causes: the WASM grammar is not built (run `pnpm prebuild`), the TMD file ' +
      'path is incorrect, or the TypedMind parser threw an internal error.',
  },
  'assertion/entity-missing': {
    severity: 'error',
    message: 'Entity declared in TMD but not found in source.',
    suggestion: 'Add the missing entity to the source, or remove it from the TMD.',
    docBody:
      'The TMD declares an entity (file, class, function, DTO, etc.) that the converter ' +
      'did not produce from the source. Either the source is missing the ' +
      'declaration, or the converter could not extract it (check converter warnings).',
  },
  'assertion/entity-extra': {
    severity: 'warning',
    message: 'Entity found in source but not declared in TMD.',
    suggestion: 'Add the entity to the TMD if it is part of the architecture, or ignore this warning for partial specifications.',
    docBody:
      'The converter extracted an entity from the source that has no ' +
      'corresponding declaration in the TMD. This is a warning because TMD files ' +
      'may intentionally describe only a subset of the architecture. Add the entity ' +
      'to the TMD if it should be tracked.',
  },
  'assertion/entity-kind-mismatch': {
    severity: 'error',
    message: 'Entity kind differs between TMD and source.',
    suggestion: 'Change the entity declaration in the TMD to match the source kind.',
    docBody:
      'The TMD declares the entity as one kind (e.g., DTO) but the converter classified ' +
      'it as another kind (e.g., Class). This is an error when the mismatch is not ' +
      'explained by a representational limit of the TMD type system.',
  },
  'assertion/entity-kind-downgraded': {
    severity: 'warning',
    message: 'Entity kind differs, but the TMD modeling choice is intentional.',
    suggestion: 'No action needed. The TMD uses Class for method ownership even though the source is a type alias.',
    docBody:
      'The TMD declares the entity as a Class (to own methods) but the converter ' +
      'classified it as a DTO (the source is a type alias or interface). ' +
      'TMD DTOs cannot own methods, so the Class declaration is an intentional modeling ' +
      'choice. This is downgraded to a warning because the mismatch is structural, not semantic.',
  },
  'assertion/entry-mismatch': {
    severity: 'error',
    message: 'Program entry point differs between TMD and source.',
    suggestion: 'Update the entry point in the TMD Program declaration to match the source.',
    docBody:
      'The TMD Program declaration names a different entry-point entity than the ' +
      'converter produced. The entry point is the root file that the program starts from.',
  },
  'assertion/version-mismatch': {
    severity: 'warning',
    message: 'Program version differs between TMD and source.',
    suggestion: 'Update the version in the TMD Program declaration.',
    docBody:
      'The TMD Program declaration carries a version string that does not match the ' +
      'converter output. Version mismatches are warnings because the version is metadata, ' +
      'not structure.',
  },
  'assertion/path-mismatch': {
    severity: 'warning',
    message: 'Entity file path differs between TMD and source.',
    suggestion: 'Update the file path in the TMD entity declaration.',
    docBody:
      'The TMD declares a file path for this entity (File, ClassFile, or Constants) ' +
      'that does not match the path the converter derived from the source. ' +
      'Path mismatches are warnings because they may reflect project reorganization.',
  },
  'assertion/signature-mismatch': {
    severity: 'error',
    message: 'Function signature differs between TMD and source.',
    suggestion: 'Update the function signature in the TMD to match the source.',
    docBody:
      'The TMD declares a function signature that does not match the source ' +
      'after normalization (whitespace, async prefix, and function name are stripped ' +
      "before comparison). This is an error because the signature is the function's " +
      'contract.',
  },
  'assertion/input-mismatch': {
    severity: 'warning',
    message: 'Function input type differs between TMD and source.',
    suggestion: 'Update the input type annotation in the TMD function declaration.',
    docBody:
      'The TMD function declaration names an input type that does not match the ' +
      'converter output. Input types are optional metadata in TMD function declarations.',
  },
  'assertion/output-mismatch': {
    severity: 'warning',
    message: 'Function output type differs between TMD and source.',
    suggestion: 'Add or update the output type in the TMD function signature (e.g., `=> ReturnType`).',
    docBody:
      'The TMD function declaration names an output type that does not match the ' +
      'converter output, or the TMD omits the output type entirely. Add `=> TypeName` ' +
      'to the TMD signature to declare the return type.',
  },
  'assertion/extends-mismatch': {
    severity: 'warning',
    message: 'Class extends clause differs between TMD and source.',
    suggestion: 'Update the extends clause in the TMD class declaration.',
    docBody:
      'The TMD class or class-file entity declares a different base class (or no base ' + 'class) than the converter found in the source.',
  },
  'assertion/schema-mismatch': {
    severity: 'warning',
    message: 'Constants schema type differs between TMD and source.',
    suggestion: 'Update the schema type expression in the TMD constants declaration.',
    docBody:
      'The TMD constants entity declares a schema type expression that does not match ' +
      'the printed type expression from the converter. The comparison uses the full ' +
      'printed type expression (e.g., `Record<string, Rule>`).',
  },
  'assertion/field-missing': {
    severity: 'error',
    message: 'Field declared in TMD but not found in source.',
    suggestion: 'Add the missing field to the source type, or remove it from the TMD.',
    docBody:
      'The TMD DTO entity declares a field that the converter did not find in the ' +
      'source. Either the field was removed from the source or renamed.',
  },
  'assertion/field-extra': {
    severity: 'warning',
    message: 'Field found in source but not declared in TMD.',
    suggestion: 'Add the field to the TMD DTO declaration if it is part of the contract.',
    docBody:
      'The converter found a field in the source that the TMD DTO entity ' +
      'does not declare. This is a warning because TMD DTOs may intentionally list ' +
      'only the architecturally significant fields.',
  },
  'assertion/field-type-mismatch': {
    severity: 'error',
    message: 'Field type differs between TMD and source.',
    suggestion: 'Update the field type in the TMD DTO declaration to match the source.',
    docBody:
      'The TMD DTO entity declares a field type that does not match the ' +
      'source after normalization (readonly prefix and module qualifiers are stripped). ' +
      'This is an error because the type mismatch is not explained by a TMD ' +
      'representational limit.',
  },
  'assertion/field-type-unrepresentable': {
    severity: 'warning',
    message: 'Field type differs, but TMD cannot express the source type.',
    suggestion:
      'No action needed. TMD cannot express this type (arrow functions, generics, ' +
      'unions, type aliases, or string literals). Use "string" as the TMD type.',
    docBody:
      'The TMD DTO field type differs from the source, but the mismatch ' +
      'is caused by a TMD representational limit. TMD field types cannot express ' +
      'inline arrow functions (`(x: T) => R`), generic containers (`Map<K, V>`), ' +
      'union types (`A | B`), type aliases (`Edition`), or string literal types ' +
      '(`"active"`). The TMD author used `string` as a fallback, which is the ' +
      'correct approach. This deviation is downgraded to a warning.',
  },
  'assertion/field-optionality-mismatch': {
    severity: 'warning',
    message: 'Field optionality differs between TMD and source.',
    suggestion: 'Update the field optionality marker in the TMD (add or remove `?`).',
    docBody:
      'The TMD DTO field is marked as optional (or required) but the source ' +
      'declares the opposite. Optionality mismatches are warnings because the TMD ' +
      'optionality marker is metadata that does not affect graph structure.',
  },
  'assertion/boundary-missing': {
    severity: 'error',
    message: 'Import or export declared in TMD but not found in source.',
    suggestion: 'Add the missing import/export to the source, or remove it from the TMD.',
    docBody:
      'The TMD file or class-file entity declares an import or export that the converter ' +
      'did not find in the source. Entity-level names (names that match other ' +
      'TMD entities) are filtered out before comparison.',
  },
  'assertion/boundary-extra': {
    severity: 'warning',
    message: 'Import or export found in source but not declared in TMD.',
    suggestion: 'Add the import/export to the TMD entity declaration if it is architecturally significant.',
    docBody:
      'The converter found an import or export in the source that the TMD ' +
      'entity does not declare. Entity-level names are filtered out before comparison. ' +
      'This is a warning because TMD module boundaries may intentionally omit ' +
      'non-architectural imports.',
  },
  'assertion/member-missing': {
    severity: 'error',
    message: 'Method, call, or implements entry declared in TMD but not found in source.',
    suggestion: 'Add the missing member to the source, or remove it from the TMD.',
    docBody:
      'The TMD entity declares a method, function call, or implements entry that the ' +
      'converter did not find in the source. This covers the `methods`, ' +
      '`calls`, and `implements` array properties on class, class-file, function, ' +
      'and constants entities.',
  },
  'assertion/member-extra': {
    severity: 'warning',
    message: 'Method, call, or implements entry found in source but not declared in TMD.',
    suggestion: 'Add the member to the TMD entity declaration if it is part of the architecture.',
    docBody:
      'The converter found a method, function call, or implements entry in the ' +
      'source that the TMD entity does not declare. This is a warning ' +
      'because TMD entities may intentionally list only architecturally significant members.',
  },
} as const satisfies Record<string, AssertionCodeEntry>;

export type AssertionCode = keyof typeof ASSERTION_CODES;
