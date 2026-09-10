import {
  ClassFileNode,
  ClassNode,
  ConstantsNode,
  DtoNode,
  type EntityNode,
  FileNode,
  FunctionNode,
  ProgramNode,
  printTypeExpr,
  TypedMind,
} from '@sammons/typed-mind';
import { ASSERTION_CODES, type AssertionCode } from './assertion-codes.ts';
import type { AssertionResult, ConversionResult, Deviation } from './types.ts';

const printSchema = (entity: ConstantsNode): string | undefined =>
  entity.schemaType === undefined ? undefined : printTypeExpr(entity.schemaType);

export class AssertionEngine {
  #typedMind: TypedMind | undefined;

  async #getTypedMind(): Promise<TypedMind> {
    if (this.#typedMind === undefined) {
      this.#typedMind = await TypedMind.create();
    }
    return this.#typedMind;
  }

  /**
   * Compare source-derived entities against a TypedMind file
   */
  async assert(conversionResult: ConversionResult, tmdFilePath: string, tmdContent: string): Promise<AssertionResult> {
    try {
      const typedMind = await this.#getTypedMind();

      // Parse the expected TMD content
      const validationResult = typedMind.check(tmdContent, tmdFilePath);

      if (!validationResult.valid) {
        return {
          success: false,
          deviations: validationResult.diagnostics
            .filter((diagnostic) => diagnostic.severity === 'error')
            .map((diagnostic) => this.deviation('assertion/parse-failure', '<parsing>', 'syntax', 'valid syntax', diagnostic.message)),
          missingEntities: [],
          extraEntities: [],
        };
      }

      const expectedOutput = typedMind.parse(tmdContent, tmdFilePath);
      return this.compareGraphs(conversionResult.entities, expectedOutput.entities);
    } catch (error) {
      return {
        success: false,
        deviations: [
          this.deviation(
            'assertion/engine-error',
            '<assertion>',
            'execution',
            'successful comparison',
            error instanceof Error ? error.message : String(error),
          ),
        ],
        missingEntities: [],
        extraEntities: [],
      };
    }
  }

  private compareGraphs(actualEntities: readonly EntityNode[], expectedEntities: readonly EntityNode[]): AssertionResult {
    const deviations: Deviation[] = [];
    const actualEntityMap = new Map(actualEntities.map((e) => [e.name, e]));
    const expectedEntityMap = new Map(expectedEntities.map((e) => [e.name, e]));

    // Find missing entities (in expected but not in actual)
    for (const name of expectedEntityMap.keys()) {
      if (!actualEntityMap.has(name)) {
        deviations.push(this.deviation('assertion/entity-missing', name, 'existence', 'entity exists', 'entity missing'));
      }
    }

    // Find extra entities (in actual but not in expected)
    for (const name of actualEntityMap.keys()) {
      if (!expectedEntityMap.has(name)) {
        deviations.push(this.deviation('assertion/entity-extra', name, 'existence', 'entity absent', 'entity present'));
      }
    }

    // Compare entities that exist in both
    for (const [name, expectedEntity] of expectedEntityMap) {
      const actualEntity = actualEntityMap.get(name);

      if (actualEntity) {
        const entityDeviations = this.compareEntities(actualEntity, expectedEntity, expectedEntityMap);
        deviations.push(...entityDeviations);
      }
    }

    const success = deviations.filter((d) => d.severity === 'error').length === 0;
    const missingEntities = deviations.filter((d) => d.code === 'assertion/entity-missing').map((d) => d.entityName);
    const extraEntities = deviations.filter((d) => d.code === 'assertion/entity-extra').map((d) => d.entityName);

    return {
      success,
      deviations,
      missingEntities,
      extraEntities,
    };
  }

  private compareEntities(actual: EntityNode, expected: EntityNode, expectedEntityMap: Map<string, EntityNode>): Deviation[] {
    const deviations: Deviation[] = [];

    if (actual.kind !== expected.kind) {
      const kindCode =
        this.kindDeviationSeverity(actual, expected) === 'warning'
          ? ('assertion/entity-kind-downgraded' as const)
          : ('assertion/entity-kind-mismatch' as const);
      deviations.push(this.deviation(kindCode, actual.name, 'type', expected.kind, actual.kind));
    }

    switch (expected.kind) {
      case 'Program':
        this.compareProgramEntities(actual, expected, deviations);
        break;
      case 'File':
        this.compareFileEntities(actual, expected, deviations, expectedEntityMap);
        break;
      case 'Function':
        this.compareFunctionEntities(actual, expected, deviations);
        break;
      case 'Class':
        this.compareClassEntities(actual, expected, deviations);
        break;
      case 'ClassFile':
        this.compareClassFileEntities(actual, expected, deviations, expectedEntityMap);
        break;
      case 'DTO':
        this.compareDTOEntities(actual, expected, deviations);
        break;
      case 'Constants':
        this.compareConstantsEntities(actual, expected, deviations);
        break;
    }

    return deviations;
  }

  private compareProgramEntities(actual: EntityNode, expected: EntityNode, deviations: Deviation[]): void {
    if (!(actual instanceof ProgramNode) || !(expected instanceof ProgramNode)) {
      return;
    }

    if (actual.entry !== expected.entry) {
      deviations.push(this.deviation('assertion/entry-mismatch', actual.name, 'entry', expected.entry, actual.entry));
    }

    if (actual.version !== expected.version) {
      deviations.push(this.deviation('assertion/version-mismatch', actual.name, 'version', expected.version, actual.version));
    }
  }

  private compareFileEntities(
    actual: EntityNode,
    expected: EntityNode,
    deviations: Deviation[],
    expectedEntityMap: Map<string, EntityNode>,
  ): void {
    if (!(actual instanceof FileNode) || !(expected instanceof FileNode)) {
      return;
    }

    if (actual.path !== expected.path) {
      deviations.push(this.deviation('assertion/path-mismatch', actual.name, 'path', expected.path, actual.path));
    }

    this.compareModuleBoundary(actual.name, 'imports', actual.imports, expected.imports, deviations, expectedEntityMap);
    this.compareModuleBoundary(actual.name, 'exports', actual.exports, expected.exports, deviations, expectedEntityMap);
  }

  private compareFunctionEntities(actual: EntityNode, expected: EntityNode, deviations: Deviation[]): void {
    if (!(actual instanceof FunctionNode) || !(expected instanceof FunctionNode)) {
      return;
    }

    if (!this.signaturesMatch(actual.signature, expected.signature)) {
      deviations.push(this.deviation('assertion/signature-mismatch', actual.name, 'signature', expected.signature, actual.signature));
    }

    this.compareOptionalStringProperty(actual.name, 'input', actual.input, expected.input, 'assertion/input-mismatch', deviations);
    this.compareOptionalStringProperty(actual.name, 'output', actual.output, expected.output, 'assertion/output-mismatch', deviations);
    this.compareArrayProperty(
      actual.name,
      'calls',
      actual.calls,
      expected.calls,
      'assertion/member-missing',
      'assertion/member-extra',
      deviations,
    );
  }

  private compareClassEntities(actual: EntityNode, expected: EntityNode, deviations: Deviation[]): void {
    if (!(actual instanceof ClassNode) || !(expected instanceof ClassNode)) {
      return;
    }

    this.compareOptionalStringProperty(actual.name, 'extends', actual.extends, expected.extends, 'assertion/extends-mismatch', deviations);
    this.compareArrayProperty(
      actual.name,
      'implements',
      actual.implements,
      expected.implements,
      'assertion/member-missing',
      'assertion/member-extra',
      deviations,
    );
    this.compareArrayProperty(
      actual.name,
      'methods',
      actual.methods,
      expected.methods,
      'assertion/member-missing',
      'assertion/member-extra',
      deviations,
    );
  }

  private compareClassFileEntities(
    actual: EntityNode,
    expected: EntityNode,
    deviations: Deviation[],
    expectedEntityMap: Map<string, EntityNode>,
  ): void {
    if (!(actual instanceof ClassFileNode) || !(expected instanceof ClassFileNode)) {
      return;
    }

    if (actual.path !== expected.path) {
      deviations.push(this.deviation('assertion/path-mismatch', actual.name, 'path', expected.path, actual.path));
    }

    this.compareOptionalStringProperty(actual.name, 'extends', actual.extends, expected.extends, 'assertion/extends-mismatch', deviations);
    this.compareArrayProperty(
      actual.name,
      'implements',
      actual.implements,
      expected.implements,
      'assertion/member-missing',
      'assertion/member-extra',
      deviations,
    );
    this.compareArrayProperty(
      actual.name,
      'methods',
      actual.methods,
      expected.methods,
      'assertion/member-missing',
      'assertion/member-extra',
      deviations,
    );
    this.compareModuleBoundary(actual.name, 'imports', actual.imports, expected.imports, deviations, expectedEntityMap);
    this.compareModuleBoundary(actual.name, 'exports', actual.exports, expected.exports, deviations, expectedEntityMap);
  }

  private compareDTOEntities(actual: EntityNode, expected: EntityNode, deviations: Deviation[]): void {
    if (!(actual instanceof DtoNode) || !(expected instanceof DtoNode)) {
      return;
    }

    const actualFieldMap = new Map(actual.fields.map((field) => [field.name, field] as const));
    const expectedFieldMap = new Map(expected.fields.map((field) => [field.name, field] as const));

    for (const [fieldName] of expectedFieldMap) {
      if (!actualFieldMap.has(fieldName)) {
        deviations.push(this.deviation('assertion/field-missing', actual.name, `field.${fieldName}`, 'field exists', 'field missing'));
      }
    }

    for (const [fieldName] of actualFieldMap) {
      if (!expectedFieldMap.has(fieldName)) {
        deviations.push(this.deviation('assertion/field-extra', actual.name, `field.${fieldName}`, 'field absent', 'field present'));
      }
    }

    for (const [fieldName] of expectedFieldMap) {
      const expectedField = expectedFieldMap.get(fieldName);
      const actualField = actualFieldMap.get(fieldName);

      if (actualField && expectedField) {
        const normActual = this.normalizeFieldType(actualField.type);
        const normExpected = this.normalizeFieldType(expectedField.type);
        if (normActual !== normExpected) {
          const typeCode =
            this.fieldTypeDeviationSeverity(expectedField.type, actualField.type) === 'warning'
              ? ('assertion/field-type-unrepresentable' as const)
              : ('assertion/field-type-mismatch' as const);
          deviations.push(this.deviation(typeCode, actual.name, `field.${fieldName}.type`, expectedField.type, actualField.type));
        }

        if (actualField.isOptional !== expectedField.isOptional) {
          deviations.push(
            this.deviation(
              'assertion/field-optionality-mismatch',
              actual.name,
              `field.${fieldName}.optional`,
              expectedField.isOptional,
              actualField.isOptional,
            ),
          );
        }
      }
    }
  }

  private compareConstantsEntities(actual: EntityNode, expected: EntityNode, deviations: Deviation[]): void {
    if (!(actual instanceof ConstantsNode) || !(expected instanceof ConstantsNode)) {
      return;
    }

    if (actual.path !== expected.path) {
      deviations.push(this.deviation('assertion/path-mismatch', actual.name, 'path', expected.path, actual.path));
    }

    this.compareOptionalStringProperty(
      actual.name,
      'schema',
      printSchema(actual),
      printSchema(expected),
      'assertion/schema-mismatch',
      deviations,
    );
    this.compareArrayProperty(
      actual.name,
      'calls',
      actual.calls,
      expected.calls,
      'assertion/member-missing',
      'assertion/member-extra',
      deviations,
    );
  }

  private compareOptionalStringProperty(
    entityName: string,
    propertyName: string,
    actual: string | undefined,
    expected: string | undefined,
    code: AssertionCode,
    deviations: Deviation[],
  ): void {
    if (actual !== expected) {
      deviations.push(this.deviation(code, entityName, propertyName, expected, actual));
    }
  }

  private compareModuleBoundary(
    entityName: string,
    propertyName: string,
    actual: readonly string[] | undefined,
    expected: readonly string[] | undefined,
    deviations: Deviation[],
    expectedEntityMap: Map<string, EntityNode>,
  ): void {
    const actualSet = new Set(actual || []);
    const expectedSet = new Set(expected || []);

    const expectedEntityNames = new Set<string>();
    for (const name of expectedSet) {
      if (expectedEntityMap.has(name)) expectedEntityNames.add(name);
    }

    const filteredExpected = new Set([...expectedSet].filter((n) => !expectedEntityNames.has(n)));

    const missing = [...filteredExpected].filter((item) => !actualSet.has(item));
    const extra = [...actualSet].filter((item) => !filteredExpected.has(item) && !expectedEntityNames.has(item));

    if (missing.length > 0) {
      deviations.push(
        this.deviation('assertion/boundary-missing', entityName, `${propertyName}.missing`, missing.join(', '), 'not present'),
      );
    }

    if (extra.length > 0) {
      deviations.push(this.deviation('assertion/boundary-extra', entityName, `${propertyName}.extra`, 'not present', extra.join(', ')));
    }
  }

  private compareArrayProperty(
    entityName: string,
    propertyName: string,
    actual: readonly string[] | undefined,
    expected: readonly string[] | undefined,
    missingCode: AssertionCode,
    extraCode: AssertionCode,
    deviations: Deviation[],
  ): void {
    const actualSet = new Set(actual || []);
    const expectedSet = new Set(expected || []);

    const missing = [...expectedSet].filter((item) => !actualSet.has(item));
    const extra = [...actualSet].filter((item) => !expectedSet.has(item));

    if (missing.length > 0) {
      deviations.push(this.deviation(missingCode, entityName, `${propertyName}.missing`, missing.join(', '), 'not present'));
    }

    if (extra.length > 0) {
      deviations.push(this.deviation(extraCode, entityName, `${propertyName}.extra`, 'not present', extra.join(', ')));
    }
  }

  private deviation(code: AssertionCode, entityName: string, property: string, expected: unknown, actual: unknown): Deviation {
    const entry = ASSERTION_CODES[code];
    return { code, entityName, property, expected, actual, severity: entry.severity, suggestion: entry.suggestion };
  }

  private signaturesMatch(actual: string, expected: string): boolean {
    const normalize = (sig: string) => {
      let s = sig.replace(/\s+/g, ' ').trim();
      s = s.replace(/^async\s+/, '');
      s = s.replace(/^[a-zA-Z_$][a-zA-Z0-9_$]*\s*(?=\()/, '');
      return s;
    };
    return normalize(actual) === normalize(expected);
  }

  private kindDeviationSeverity(actual: EntityNode, expected: EntityNode): 'error' | 'warning' {
    const kinds = new Set([actual.kind, expected.kind]);
    if (kinds.has('Class') && kinds.has('DTO')) {
      const classEntity = actual.kind === 'Class' ? actual : expected;
      if (classEntity instanceof ClassNode && classEntity.methods.length > 0) return 'warning';
    }
    if (kinds.has('ClassFile') && kinds.has('DTO')) {
      const cfEntity = actual.kind === 'ClassFile' ? actual : expected;
      if (cfEntity instanceof ClassFileNode && cfEntity.methods.length > 0) return 'warning';
    }
    return 'error';
  }

  private normalizeFieldType(type: string): string {
    let t = type.replace(/\s+/g, ' ').trim();
    t = t.replace(/^readonly\s+/, '');
    const dotIdx = t.lastIndexOf('.');
    if (dotIdx !== -1 && !t.includes('<')) t = t.slice(dotIdx + 1);
    return t;
  }

  private fieldTypeDeviationSeverity(expectedType: string, actualType: string): 'error' | 'warning' {
    const normExpected = this.normalizeFieldType(expectedType);
    const normActual = this.normalizeFieldType(actualType);

    if (normExpected === normActual) return 'warning';

    if (normExpected === 'string') {
      if (normActual.includes('=>')) return 'warning';
      if (normActual.includes('<')) return 'warning';
      if (normActual.includes('|')) return 'warning';
      if (/^[A-Z]/.test(normActual)) return 'warning';
      if (/^"[^"]*"$/.test(normActual)) return 'warning';
    }

    return 'error';
  }
}
