import type {
  AnyEntity,
  ProgramEntity,
  FileEntity,
  FunctionEntity,
  ClassEntity,
  ConstantsEntity,
  DTOEntity,
  DTOField,
  AssetEntity,
  UIComponentEntity,
  RunParameterEntity,
  DependencyEntity,
  Position,
} from './types.ts';

interface LongformBlock {
  type: string;
  name: string;
  properties: Map<string, any>;
  position: Position;
  raw: string;
}

// Type-safe interface for DTO field definitions
interface DTOFieldDefinition {
  type?: string;
  description?: string;
  optional?: boolean;
}

// Type guard for DTO field definitions
const isDTOFieldDefinition = (value: unknown): value is DTOFieldDefinition => {
  return typeof value === 'object' && value !== null;
};

export class LongformParser {
  private lines: string[] = [];
  private currentLine = 0;

  parseLongform(input: string, startLine: number): AnyEntity | null {
    this.lines = input.split('\n');
    this.currentLine = startLine;

    const firstLine = this.lines[startLine];
    if (!firstLine) return null;

    const match = firstLine
      .trim()
      .match(/^(program|file|function|class|dto|component|asset|constants|parameter|dependency)\s+(\w+)\s*\{?$/);
    if (!match) return null;

    const [_, type, name] = match;
    const block = this.parseBlock(type, name, startLine);

    return this.convertToEntity(block);
  }

  private parseBlock(type: string, name: string, startLine: number): LongformBlock {
    const properties = new Map<string, any>();
    const position: Position = { line: startLine + 1, column: 1 };
    const rawLines: string[] = [this.lines[startLine]];

    // Move past the opening line
    this.currentLine = startLine + 1;

    // Parse until we find the closing brace
    while (this.currentLine < this.lines.length) {
      const line = this.lines[this.currentLine];
      rawLines.push(line);
      const trimmed = line.trim();

      if (trimmed === '}') {
        break;
      }

      if (trimmed && !trimmed.startsWith('#')) {
        this.parseProperty(trimmed, properties);
      }

      this.currentLine++;
    }

    return {
      type,
      name,
      properties,
      position,
      raw: rawLines.join('\n'),
    };
  }

  private parseProperty(line: string, properties: Map<string, any>) {
    // Handle nested object properties (like DTO fields)
    if (line.includes('{') && !line.includes('}')) {
      const match = line.match(/^(\w+):\s*\{$/);
      if (match) {
        const propName = match[1];
        properties.set(propName, this.parseNestedObject());
        return;
      }
    }

    // Handle array properties
    const arrayMatch = line.match(/^(\w+):\s*\[([^\]]*)\]$/);
    if (arrayMatch) {
      const [_, key, value] = arrayMatch;
      const items = value
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s);
      properties.set(key, items);
      return;
    }

    // Handle string properties
    const stringMatch = line.match(/^(\w+):\s*"([^"]*)"$/);
    if (stringMatch) {
      const [_, key, value] = stringMatch;
      properties.set(key, value);
      return;
    }

    // Handle boolean properties
    const boolMatch = line.match(/^(\w+):\s*(true|false)$/);
    if (boolMatch) {
      const [_, key, value] = boolMatch;
      properties.set(key, value === 'true');
      return;
    }

    // Handle identifier properties
    const identMatch = line.match(/^(\w+):\s*(\w+)$/);
    if (identMatch) {
      const [_, key, value] = identMatch;
      properties.set(key, value);
      return;
    }
  }

  private parseNestedObject(): any {
    const obj: any = {};
    this.currentLine++;

    while (this.currentLine < this.lines.length) {
      const line = this.lines[this.currentLine];
      const trimmed = line.trim();

      if (trimmed === '}') {
        break;
      }

      if (trimmed && !trimmed.startsWith('#')) {
        // Parse nested properties
        const match = trimmed.match(/^(\w+):\s*\{$/);
        if (match) {
          obj[match[1]] = this.parseNestedObject();
        } else {
          // Simple property in nested object
          const propMatch = trimmed.match(/^(\w+):\s*(.+)$/);
          if (propMatch) {
            const [_, key, value] = propMatch;
            // Remove quotes if present
            const cleanValue = value.replace(/^"(.*)"$/, '$1');
            // Check for boolean
            if (cleanValue === 'true' || cleanValue === 'false') {
              obj[key] = cleanValue === 'true';
            } else {
              obj[key] = cleanValue;
            }
          }
        }
      }

      this.currentLine++;
    }

    return obj;
  }

  private convertToEntity(block: LongformBlock): AnyEntity | null {
    const { type, name, properties, position, raw } = block;
    const comment = properties.get('description');

    switch (type) {
      case 'program':
        return {
          name,
          type: 'Program',
          entry: properties.get('entry') || '',
          version: properties.get('version'),
          purpose: properties.get('purpose') || properties.get('description'),
          position,
          raw,
          comment,
        } as ProgramEntity;

      case 'file':
        return {
          name,
          type: 'File',
          path: properties.get('path') || '',
          imports: properties.get('imports') || [],
          exports: properties.get('exports') || [],
          purpose: properties.get('purpose') || properties.get('description'),
          position,
          raw,
          comment,
        } as FileEntity;

      case 'function':
        return {
          name,
          type: 'Function',
          signature: properties.get('signature') || '',
          description: properties.get('description'),
          calls: properties.get('calls') || [],
          input: properties.get('input'),
          output: properties.get('output'),
          affects: properties.get('affects') || [],
          consumes: properties.get('consumes') || [],
          position,
          raw,
          comment,
        } as FunctionEntity;

      case 'class':
        return {
          name,
          type: 'Class',
          extends: properties.get('extends'),
          implements: properties.get('implements') || [],
          methods: properties.get('methods') || [],
          imports: properties.get('imports') || [],
          purpose: properties.get('purpose') || properties.get('description'),
          position,
          raw,
          comment,
        } as ClassEntity;

      case 'dto':
        const fields: DTOField[] = [];
        const fieldsObj = properties.get('fields') || {};

        for (const [fieldName, fieldDef] of Object.entries(fieldsObj)) {
          if (isDTOFieldDefinition(fieldDef)) {
            const field: DTOField = {
              name: fieldName,
              type: fieldDef.type || 'any',
              optional: fieldDef.optional || false,
              ...(fieldDef.description && { description: fieldDef.description }),
            };
            fields.push(field);
          } else {
            // Fallback for malformed field definitions
            fields.push({
              name: fieldName,
              type: 'any',
              optional: false,
            });
          }
        }

        return {
          name,
          type: 'DTO',
          purpose: properties.get('purpose') || properties.get('description'),
          fields,
          position,
          raw,
          comment,
        } as DTOEntity;

      case 'component':
        return {
          name,
          type: 'UIComponent',
          purpose: properties.get('description') || '',
          root: properties.get('root') || false,
          contains: properties.get('contains') || [],
          containedBy: properties.get('containedBy') || [],
          affectedBy: properties.get('affectedBy') || [],
          position,
          raw,
          comment,
        } as UIComponentEntity;

      case 'asset':
        return {
          name,
          type: 'Asset',
          description: properties.get('description') || '',
          containsProgram: properties.get('containsProgram'),
          position,
          raw,
          comment,
        } as AssetEntity;

      case 'constants':
        return {
          name,
          type: 'Constants',
          path: properties.get('path') || '',
          schema: properties.get('schema'),
          purpose: properties.get('purpose') || properties.get('description'),
          position,
          raw,
          comment,
        } as ConstantsEntity;

      case 'parameter':
        const paramType = properties.get('type') || 'env';
        return {
          name,
          type: 'RunParameter',
          paramType,
          description: properties.get('description') || '',
          defaultValue: properties.get('default'),
          required: properties.get('required') || false,
          consumedBy: [],
          position,
          raw,
          comment,
        } as RunParameterEntity;

      case 'dependency':
        return {
          name,
          type: 'Dependency',
          purpose: properties.get('purpose') || properties.get('description') || '',
          version: properties.get('version'),
          importedBy: [],
          position,
          raw,
          comment,
        } as DependencyEntity;

      default:
        return null;
    }
  }

  getConsumedLines(): number {
    return this.currentLine;
  }
}
