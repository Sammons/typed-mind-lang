import { DSLChecker } from '@sammons/typed-mind';
import type { AnyEntity, ProgramGraph } from '@sammons/typed-mind';
import type { AssertionResult, Deviation, ConversionResult } from './types.ts';

export class AssertionEngine {
  private readonly checker = new DSLChecker();

  /**
   * Compare TypeScript-derived entities against a TypedMind file
   */
  assert(conversionResult: ConversionResult, tmdFilePath: string, tmdContent: string): AssertionResult {
    try {
      // Parse the expected TMD content
      const validationResult = this.checker.check(tmdContent, tmdFilePath);

      if (!validationResult.valid) {
        return {
          success: false,
          deviations: validationResult.errors.map((error) => ({
            entityName: '<parsing>',
            property: 'syntax',
            expected: 'valid syntax',
            actual: error.message,
            severity: 'error' as const,
          })),
          missingEntities: [],
          extraEntities: [],
        };
      }

      const expectedGraph = this.checker.parse(tmdContent, tmdFilePath);
      return this.compareGraphs(conversionResult.entities, expectedGraph);
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

  private compareGraphs(actualEntities: readonly AnyEntity[], expectedGraph: ProgramGraph): AssertionResult {
    const deviations: Deviation[] = [];
    const actualEntityMap = new Map(actualEntities.map((e) => [e.name, e]));
    const expectedEntityMap = expectedGraph.entities;

    // Find missing entities (in expected but not in actual)
    const missingEntities: string[] = [];
    for (const [name] of expectedEntityMap) {
      if (!actualEntityMap.has(name)) {
        missingEntities.push(name);
      }
    }

    // Find extra entities (in actual but not in expected)
    const extraEntities: string[] = [];
    for (const [name] of actualEntityMap) {
      if (!expectedEntityMap.has(name)) {
        extraEntities.push(name);
      }
    }

    // Compare entities that exist in both
    for (const [name, expectedEntity] of expectedEntityMap) {
      const actualEntity = actualEntityMap.get(name);

      if (actualEntity) {
        const entityDeviations = this.compareEntities(actualEntity, expectedEntity);
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

  private compareEntities(actual: AnyEntity, expected: AnyEntity): Deviation[] {
    const deviations: Deviation[] = [];

    // Compare entity type
    if (actual.type !== expected.type) {
      deviations.push({
        entityName: actual.name,
        property: 'type',
        expected: expected.type,
        actual: actual.type,
        severity: 'error',
      });
    }

    // Type-specific comparisons
    switch (expected.type) {
      case 'Program':
        this.compareProgramEntities(actual, expected, deviations);
        break;
      case 'File':
        this.compareFileEntities(actual, expected, deviations);
        break;
      case 'Function':
        this.compareFunctionEntities(actual, expected, deviations);
        break;
      case 'Class':
        this.compareClassEntities(actual, expected, deviations);
        break;
      case 'ClassFile':
        this.compareClassFileEntities(actual, expected, deviations);
        break;
      case 'DTO':
        this.compareDTOEntities(actual, expected, deviations);
        break;
      case 'Constants':
        this.compareConstantsEntities(actual, expected, deviations);
        break;
      // Add other entity types as needed
    }

    return deviations;
  }

  private compareProgramEntities(actual: AnyEntity, expected: AnyEntity, deviations: Deviation[]): void {
    const actualProg = actual as any;
    const expectedProg = expected as any;

    if (actualProg.entry !== expectedProg.entry) {
      deviations.push({
        entityName: actual.name,
        property: 'entry',
        expected: expectedProg.entry,
        actual: actualProg.entry,
        severity: 'error',
      });
    }

    if (actualProg.version !== expectedProg.version) {
      deviations.push({
        entityName: actual.name,
        property: 'version',
        expected: expectedProg.version,
        actual: actualProg.version,
        severity: 'warning',
      });
    }
  }

  private compareFileEntities(actual: AnyEntity, expected: AnyEntity, deviations: Deviation[]): void {
    const actualFile = actual as any;
    const expectedFile = expected as any;

    if (actualFile.path !== expectedFile.path) {
      deviations.push({
        entityName: actual.name,
        property: 'path',
        expected: expectedFile.path,
        actual: actualFile.path,
        severity: 'warning',
      });
    }

    this.compareArrayProperty(actual.name, 'imports', actualFile.imports, expectedFile.imports, deviations);
    this.compareArrayProperty(actual.name, 'exports', actualFile.exports, expectedFile.exports, deviations);
  }

  private compareFunctionEntities(actual: AnyEntity, expected: AnyEntity, deviations: Deviation[]): void {
    const actualFunc = actual as any;
    const expectedFunc = expected as any;

    // Compare signature (allowing some flexibility in formatting)
    if (!this.signaturesMatch(actualFunc.signature, expectedFunc.signature)) {
      deviations.push({
        entityName: actual.name,
        property: 'signature',
        expected: expectedFunc.signature,
        actual: actualFunc.signature,
        severity: 'error',
      });
    }

    this.compareStringProperty(actual.name, 'input', actualFunc.input, expectedFunc.input, deviations);
    this.compareStringProperty(actual.name, 'output', actualFunc.output, expectedFunc.output, deviations);
    this.compareArrayProperty(actual.name, 'calls', actualFunc.calls, expectedFunc.calls, deviations);
  }

  private compareClassEntities(actual: AnyEntity, expected: AnyEntity, deviations: Deviation[]): void {
    const actualClass = actual as any;
    const expectedClass = expected as any;

    this.compareStringProperty(actual.name, 'extends', actualClass.extends, expectedClass.extends, deviations);
    this.compareArrayProperty(actual.name, 'implements', actualClass.implements, expectedClass.implements, deviations);
    this.compareArrayProperty(actual.name, 'methods', actualClass.methods, expectedClass.methods, deviations);
  }

  private compareClassFileEntities(actual: AnyEntity, expected: AnyEntity, deviations: Deviation[]): void {
    const actualCF = actual as any;
    const expectedCF = expected as any;

    if (actualCF.path !== expectedCF.path) {
      deviations.push({
        entityName: actual.name,
        property: 'path',
        expected: expectedCF.path,
        actual: actualCF.path,
        severity: 'warning',
      });
    }

    this.compareStringProperty(actual.name, 'extends', actualCF.extends, expectedCF.extends, deviations);
    this.compareArrayProperty(actual.name, 'implements', actualCF.implements, expectedCF.implements, deviations);
    this.compareArrayProperty(actual.name, 'methods', actualCF.methods, expectedCF.methods, deviations);
    this.compareArrayProperty(actual.name, 'imports', actualCF.imports, expectedCF.imports, deviations);
    this.compareArrayProperty(actual.name, 'exports', actualCF.exports, expectedCF.exports, deviations);
  }

  private compareDTOEntities(actual: AnyEntity, expected: AnyEntity, deviations: Deviation[]): void {
    const actualDTO = actual as any;
    const expectedDTO = expected as any;

    const actualFieldMap = new Map(actualDTO.fields?.map((f: any) => [f.name, f]) || []);
    const expectedFieldMap = new Map(expectedDTO.fields?.map((f: any) => [f.name, f]) || []);

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

      if (
        actualField &&
        expectedField &&
        typeof expectedField === 'object' &&
        expectedField !== null &&
        'type' in expectedField &&
        'optional' in expectedField
      ) {
        const expectedFieldObj = expectedField as { type: string; optional: boolean };
        const actualFieldObj = actualField as { type: string; optional: boolean };

        if (actualFieldObj.type !== expectedFieldObj.type) {
          deviations.push({
            entityName: actual.name,
            property: `field.${fieldName}.type`,
            expected: expectedFieldObj.type,
            actual: actualFieldObj.type,
            severity: 'error',
          });
        }

        if (actualFieldObj.optional !== expectedFieldObj.optional) {
          deviations.push({
            entityName: actual.name,
            property: `field.${fieldName}.optional`,
            expected: expectedFieldObj.optional,
            actual: actualFieldObj.optional,
            severity: 'warning',
          });
        }
      }
    }
  }

  private compareConstantsEntities(actual: AnyEntity, expected: AnyEntity, deviations: Deviation[]): void {
    const actualConst = actual as any;
    const expectedConst = expected as any;

    if (actualConst.path !== expectedConst.path) {
      deviations.push({
        entityName: actual.name,
        property: 'path',
        expected: expectedConst.path,
        actual: actualConst.path,
        severity: 'warning',
      });
    }

    this.compareStringProperty(actual.name, 'schema', actualConst.schema, expectedConst.schema, deviations);
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

  private compareArrayProperty(
    entityName: string,
    propertyName: string,
    actual: string[] | undefined,
    expected: string[] | undefined,
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
    // Normalize signatures for comparison (remove extra whitespace, etc.)
    const normalize = (sig: string) => sig.replace(/\s+/g, ' ').trim();
    return normalize(actual) === normalize(expected);
  }
}
