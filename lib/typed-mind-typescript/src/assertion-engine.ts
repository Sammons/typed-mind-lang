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
import type { AssertionResult, ConversionResult, Deviation } from './types.ts';

const printSchema = (entity: ConstantsNode): string | undefined =>
  entity.schemaType === undefined ? undefined : printTypeExpr(entity.schemaType);

export class AssertionEngine {
  // RFC-TM-6 §3 (rfc-tm-6-diamond.md) — moved off the legacy sync DSLChecker
  // onto TypedMind.create() + check()/parse(). The new surface's construction
  // is async (wasm init), so #typedMind is created lazily on first use and
  // cached — no side effects in the constructor (no_side_effects_in_constructors).
  #typedMind: TypedMind | undefined;

  async #getTypedMind(): Promise<TypedMind> {
    if (this.#typedMind === undefined) {
      this.#typedMind = await TypedMind.create();
    }
    return this.#typedMind;
  }

  /**
   * Compare TypeScript-derived entities against a TypedMind file
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
            .map((diagnostic) => ({
              entityName: '<parsing>',
              property: 'syntax',
              expected: 'valid syntax',
              actual: diagnostic.message,
              severity: 'error' as const,
            })),
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
          {
            entityName: '<assertion>',
            property: 'execution',
            expected: 'successful comparison',
            actual: error instanceof Error ? error.message : String(error),
            severity: 'error' as const,
          },
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
    const missingEntities: string[] = [];
    for (const name of expectedEntityMap.keys()) {
      if (!actualEntityMap.has(name)) {
        missingEntities.push(name);
      }
    }

    // Find extra entities (in actual but not in expected)
    const extraEntities: string[] = [];
    for (const name of actualEntityMap.keys()) {
      if (!expectedEntityMap.has(name)) {
        extraEntities.push(name);
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

    const success =
      deviations.filter((d) => d.severity === 'error').length === 0 && missingEntities.length === 0 && extraEntities.length === 0;

    return {
      success,
      deviations,
      missingEntities,
      extraEntities,
    };
  }

  private compareEntities(
    actual: EntityNode,
    expected: EntityNode,
    expectedEntityMap: Map<string, EntityNode>,
  ): Deviation[] {
    const deviations: Deviation[] = [];

    if (actual.kind !== expected.kind) {
      const kindSeverity = this.kindDeviationSeverity(actual, expected);
      deviations.push({
        entityName: actual.name,
        property: 'type',
        expected: expected.kind,
        actual: actual.kind,
        severity: kindSeverity,
      });
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
      deviations.push({
        entityName: actual.name,
        property: 'entry',
        expected: expected.entry,
        actual: actual.entry,
        severity: 'error',
      });
    }

    if (actual.version !== expected.version) {
      deviations.push({
        entityName: actual.name,
        property: 'version',
        expected: expected.version,
        actual: actual.version,
        severity: 'warning',
      });
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
      deviations.push({
        entityName: actual.name,
        property: 'path',
        expected: expected.path,
        actual: actual.path,
        severity: 'warning',
      });
    }

    this.compareModuleBoundary(actual.name, 'imports', actual.imports, expected.imports, deviations, expectedEntityMap);
    this.compareModuleBoundary(actual.name, 'exports', actual.exports, expected.exports, deviations, expectedEntityMap);
  }

  private compareFunctionEntities(actual: EntityNode, expected: EntityNode, deviations: Deviation[]): void {
    if (!(actual instanceof FunctionNode) || !(expected instanceof FunctionNode)) {
      return;
    }

    // Compare signature (allowing some flexibility in formatting)
    if (!this.signaturesMatch(actual.signature, expected.signature)) {
      deviations.push({
        entityName: actual.name,
        property: 'signature',
        expected: expected.signature,
        actual: actual.signature,
        severity: 'error',
      });
    }

    this.compareStringProperty(actual.name, 'input', actual.input, expected.input, deviations);
    this.compareStringProperty(actual.name, 'output', actual.output, expected.output, deviations);
    this.compareArrayProperty(actual.name, 'calls', actual.calls, expected.calls, deviations);
  }

  private compareClassEntities(actual: EntityNode, expected: EntityNode, deviations: Deviation[]): void {
    if (!(actual instanceof ClassNode) || !(expected instanceof ClassNode)) {
      return;
    }

    this.compareStringProperty(actual.name, 'extends', actual.extends, expected.extends, deviations);
    this.compareArrayProperty(actual.name, 'implements', actual.implements, expected.implements, deviations);
    this.compareArrayProperty(actual.name, 'methods', actual.methods, expected.methods, deviations);
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
      deviations.push({
        entityName: actual.name,
        property: 'path',
        expected: expected.path,
        actual: actual.path,
        severity: 'warning',
      });
    }

    this.compareStringProperty(actual.name, 'extends', actual.extends, expected.extends, deviations);
    this.compareArrayProperty(actual.name, 'implements', actual.implements, expected.implements, deviations);
    this.compareArrayProperty(actual.name, 'methods', actual.methods, expected.methods, deviations);
    this.compareModuleBoundary(actual.name, 'imports', actual.imports, expected.imports, deviations, expectedEntityMap);
    this.compareModuleBoundary(actual.name, 'exports', actual.exports, expected.exports, deviations, expectedEntityMap);
  }

  private compareDTOEntities(actual: EntityNode, expected: EntityNode, deviations: Deviation[]): void {
    if (!(actual instanceof DtoNode) || !(expected instanceof DtoNode)) {
      return;
    }

    const actualFieldMap = new Map(actual.fields.map((field) => [field.name, field] as const));
    const expectedFieldMap = new Map(expected.fields.map((field) => [field.name, field] as const));

    // Check for missing fields
    for (const [fieldName] of expectedFieldMap) {
      if (!actualFieldMap.has(fieldName)) {
        deviations.push({
          entityName: actual.name,
          property: `field.${fieldName}`,
          expected: 'field exists',
          actual: 'field missing',
          severity: 'error',
        });
      }
    }

    // Check for extra fields
    for (const [fieldName] of actualFieldMap) {
      if (!expectedFieldMap.has(fieldName)) {
        deviations.push({
          entityName: actual.name,
          property: `field.${fieldName}`,
          expected: 'field absent',
          actual: 'field present',
          severity: 'warning',
        });
      }
    }

    // Compare common fields
    for (const [fieldName] of expectedFieldMap) {
      const expectedField = expectedFieldMap.get(fieldName);
      const actualField = actualFieldMap.get(fieldName);

      if (actualField && expectedField) {
        const normActual = this.normalizeFieldType(actualField.type);
        const normExpected = this.normalizeFieldType(expectedField.type);
        if (normActual !== normExpected) {
          deviations.push({
            entityName: actual.name,
            property: `field.${fieldName}.type`,
            expected: expectedField.type,
            actual: actualField.type,
            severity: this.fieldTypeDeviationSeverity(expectedField.type, actualField.type),
          });
        }

        if (actualField.isOptional !== expectedField.isOptional) {
          deviations.push({
            entityName: actual.name,
            property: `field.${fieldName}.optional`,
            expected: expectedField.isOptional,
            actual: actualField.isOptional,
            severity: 'warning',
          });
        }
      }
    }
  }

  private compareConstantsEntities(actual: EntityNode, expected: EntityNode, deviations: Deviation[]): void {
    if (!(actual instanceof ConstantsNode) || !(expected instanceof ConstantsNode)) {
      return;
    }

    if (actual.path !== expected.path) {
      deviations.push({
        entityName: actual.name,
        property: 'path',
        expected: expected.path,
        actual: actual.path,
        severity: 'warning',
      });
    }

    // RFC-TM-14 R6a: compare the whole schema type expression as printed
    // text, so `Record<string, Rule>` vs `Record<string, Other>` deviates.
    this.compareStringProperty(actual.name, 'schema', printSchema(actual), printSchema(expected), deviations);
    this.compareArrayProperty(actual.name, 'calls', actual.calls, expected.calls, deviations);
  }

  private compareStringProperty(
    entityName: string,
    propertyName: string,
    actual: string | undefined,
    expected: string | undefined,
    deviations: Deviation[],
  ): void {
    if (actual !== expected) {
      deviations.push({
        entityName,
        property: propertyName,
        expected,
        actual,
        severity: 'warning',
      });
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
      deviations.push({
        entityName,
        property: `${propertyName}.missing`,
        expected: missing.join(', '),
        actual: 'not present',
        severity: 'error',
      });
    }

    if (extra.length > 0) {
      deviations.push({
        entityName,
        property: `${propertyName}.extra`,
        expected: 'not present',
        actual: extra.join(', '),
        severity: 'warning',
      });
    }
  }

  private compareArrayProperty(
    entityName: string,
    propertyName: string,
    actual: readonly string[] | undefined,
    expected: readonly string[] | undefined,
    deviations: Deviation[],
  ): void {
    const actualSet = new Set(actual || []);
    const expectedSet = new Set(expected || []);

    const missing = [...expectedSet].filter((item) => !actualSet.has(item));
    const extra = [...actualSet].filter((item) => !expectedSet.has(item));

    if (missing.length > 0) {
      deviations.push({
        entityName,
        property: `${propertyName}.missing`,
        expected: missing.join(', '),
        actual: 'not present',
        severity: 'error',
      });
    }

    if (extra.length > 0) {
      deviations.push({
        entityName,
        property: `${propertyName}.extra`,
        expected: 'not present',
        actual: extra.join(', '),
        severity: 'warning',
      });
    }
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
