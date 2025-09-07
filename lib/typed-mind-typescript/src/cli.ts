#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, statSync } from 'fs';
import { resolve, extname, dirname } from 'path';
import { parseArgs } from 'util';
import { TypeScriptAnalyzer } from './typescript-analyzer';
import { TypeScriptToTypedMindConverter } from './typescript-to-typedmind-converter';
import { AssertionEngine } from './assertion-engine';
import { DSLChecker } from '@sammons/typed-mind';
import type { ConversionOptions } from './types';

const options = {
  help: {
    type: 'boolean' as const,
    short: 'h',
    description: 'Show help',
  },
  project: {
    type: 'string' as const,
    description: 'Project directory or tsconfig.json path (required)',
  },
  input: {
    type: 'string' as const,
    description: 'Input TypedMind file for assert command',
  },
  entrypoint: {
    type: 'string' as const,
    description: 'Entry point file relative to project directory or current directory (required)',
  },
  output: {
    type: 'string' as const,
    short: 'o',
    description: 'Output file path for export',
  },
  config: {
    type: 'string' as const,
    description: 'Path to tsconfig.json',
  },
  'prefer-class-file': {
    type: 'boolean' as const,
    description: 'Use ClassFile fusion for services/controllers (default: true)',
  },
  'include-private': {
    type: 'boolean' as const,
    description: 'Include private members in analysis',
  },
  'no-programs': {
    type: 'boolean' as const,
    description: 'Do not generate Program entities',
  },
  version: {
    type: 'string' as const,
    description: 'Version for generated Program entities (default: 1.0.0)',
  },
  verbose: {
    type: 'boolean' as const,
    short: 'v',
    description: 'Verbose output',
  },
};

function showHelp(): void {
  console.log(`
TypedMind TypeScript Bridge - Extract architecture from TypeScript codebases

Usage: typed-mind-ts <command> --project <dir|tsconfig.json> --entrypoint <file> [options]

Commands:
  export   Export TypeScript project to TypedMind DSL
  assert   Assert TypeScript project matches TypedMind file
  check    Check TypeScript project with TypedMind validator

Required Options:
  --project <path>       Project directory or tsconfig.json path
  --entrypoint <file>    Entry point file relative to project directory or current directory

Command-Specific Options:
  --input <file>         Input TypedMind file for assert command (required for assert)
  --output <file>        Output file for export command (optional, defaults to stdout)

General Options:
  -h, --help             Show help
  --config <path>        Path to tsconfig.json (deprecated, use --project)
  --prefer-class-file    Use ClassFile fusion (default: true)
  --include-private      Include private members in analysis
  --no-programs          Do not generate Program entities
  --version <version>    Version for generated programs (default: 1.0.0)
  -v, --verbose          Verbose output

Examples:
  # Export project to TypedMind DSL
  typed-mind-ts export --project ../typed-mind-cli --entrypoint src/cli.ts --output architecture.tmd
  
  # Assert TypeScript matches expected architecture
  typed-mind-ts assert --project src/ --entrypoint index.ts --input expected.tmd
  
  # Check project architecture
  typed-mind-ts check --project . --entrypoint src/main.ts --verbose
  
  # Use tsconfig.json directly
  typed-mind-ts export --project ./tsconfig.build.json --entrypoint src/app.ts
`);
}

async function main() {
  let parsed;
  
  try {
    parsed = parseArgs({
      options,
      allowPositionals: true,
    });
  } catch (error) {
    console.error('Error parsing arguments:', error);
    showHelp();
    process.exit(1);
  }

  const { values, positionals } = parsed;

  if (values.help) {
    showHelp();
    process.exit(0);
  }

  const [command] = positionals;

  if (!command) {
    console.error('Error: No command specified');
    showHelp();
    process.exit(1);
  }

  // Validate required parameters
  if (!values.project) {
    console.error('Error: --project parameter is required');
    showHelp();
    process.exit(1);
  }

  if (!values.entrypoint) {
    console.error('Error: --entrypoint parameter is required');
    showHelp();
    process.exit(1);
  }

  try {
    switch (command) {
      case 'export':
        await handleExport(values);
        break;
      case 'assert':
        await handleAssert(values);
        break;
      case 'check':
        await handleCheck(values);
        break;
      default:
        console.error(`Error: Unknown command '${command}'`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    if (values.verbose) {
      console.error('Stack trace:', error instanceof Error ? error.stack : String(error));
    }
    process.exit(1);
  }
}

function resolveProjectPath(projectInput: string): { projectPath: string; configPath?: string } {
  const inputPath = resolve(projectInput);

  if (!existsSync(inputPath)) {
    throw new Error(`Project path does not exist: ${inputPath}`);
  }

  const stats = statSync(inputPath);

  if (stats.isFile()) {
    // If it's a file, it should be tsconfig.json
    if (extname(inputPath) === '.json' && inputPath.includes('tsconfig')) {
      return {
        projectPath: dirname(inputPath),
        configPath: inputPath,
      };
    } else {
      throw new Error(`File must be a tsconfig.json file: ${inputPath}`);
    }
  } else if (stats.isDirectory()) {
    // If it's a directory, use it as project path
    return {
      projectPath: inputPath,
    };
  } else {
    throw new Error(`Invalid project path: ${inputPath}`);
  }
}

function resolveEntrypoint(projectPath: string, entrypointParam: string): string {
  // 1. Try relative to project directory
  const projectRelativePath = resolve(projectPath, entrypointParam);
  if (existsSync(projectRelativePath)) {
    return projectRelativePath;
  }
  
  // 2. Try relative to current working directory  
  const cwdRelativePath = resolve(process.cwd(), entrypointParam);
  if (existsSync(cwdRelativePath)) {
    return cwdRelativePath;
  }
  
  // 3. Error with helpful message showing both attempted paths
  const errorMessage = [
    `Entry point file not found: ${entrypointParam}`,
    '',
    'Attempted paths:',
    `  1. Relative to project directory: ${projectRelativePath}`,
    `  2. Relative to current directory:  ${cwdRelativePath}`,
    '',
    'Ensure the entry point file exists and is specified correctly.',
    'Entry points can be relative to either:',
    '  - The project directory (--project flag)',
    '  - Your current working directory',
    '',
    'Examples:',
    '  --entrypoint src/cli.ts          (relative to project)',
    '  --entrypoint lib/my-pkg/src/cli.ts  (relative to cwd)',
  ].join('\n');
  
  throw new Error(errorMessage);
}

async function handleExport(values: any): Promise<void> {
  const { projectPath, configPath } = resolveProjectPath(values.project as string);
  const resolvedEntrypoint = resolveEntrypoint(projectPath, values.entrypoint as string);
  const outputPath = values.output as string | undefined;

  if (values.verbose) {
    console.log(`Analyzing TypeScript project: ${projectPath}`);
    console.log(`Entry point: ${resolvedEntrypoint}`);
  }

  // Analyze TypeScript project starting from entrypoint
  const analyzer = new TypeScriptAnalyzer(projectPath, configPath || values.config as string | undefined);
  const analysis = analyzer.analyzeFromEntrypoint(resolvedEntrypoint);

  if (values.verbose) {
    console.log(`Found ${analysis.modules.length} modules`);
    console.log(`Entry points: ${analysis.entryPoints.join(', ')}`);
  }

  // Convert to TypedMind
  const conversionOptions: ConversionOptions = {
    preferClassFile: values['prefer-class-file'] !== false, // Default true
    includePrivateMembers: values['include-private'] || false,
    generatePrograms: !values['no-programs'],
    programVersion: (values.version as string) || '1.0.0',
    ignorePatterns: ['node_modules/**', '**/*.d.ts', '**/*.test.ts', '**/*.spec.ts'],
  };

  const converter = new TypeScriptToTypedMindConverter(conversionOptions);
  const result = converter.convert(analysis);

  // Report conversion results
  if (result.warnings.length > 0) {
    console.warn(`\nWarnings (${result.warnings.length}):`);
    for (const warning of result.warnings) {
      console.warn(`  ${warning.message}`);
      if (warning.suggestion) {
        console.warn(`    Suggestion: ${warning.suggestion}`);
      }
    }
  }

  if (!result.success) {
    console.error(`\nConversion failed with ${result.errors.length} error(s):`);
    for (const error of result.errors) {
      console.error(`  ${error.message}`);
      if (error.filePath) {
        console.error(`    File: ${error.filePath}`);
      }
    }
    process.exit(1);
  }

  // Output results
  if (outputPath) {
    writeFileSync(outputPath, result.tmdContent);
    console.log(`\n✓ Exported ${result.entities.length} entities to ${outputPath}`);
  } else {
    console.log('\n' + result.tmdContent);
  }

  if (values.verbose) {
    console.log(`\nEntity summary:`);
    const entityCounts = result.entities.reduce((counts, entity) => {
      counts[entity.type] = (counts[entity.type] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
    
    for (const [type, count] of Object.entries(entityCounts)) {
      console.log(`  ${type}: ${count}`);
    }
  }
}

async function handleAssert(values: any): Promise<void> {
  if (!values.input) {
    throw new Error('Assert command requires --input <file> parameter');
  }

  const { projectPath, configPath } = resolveProjectPath(values.project as string);
  const tmdFilePath = resolve(values.input as string);
  const resolvedEntrypoint = resolveEntrypoint(projectPath, values.entrypoint as string);

  if (values.verbose) {
    console.log(`Comparing TypeScript project ${projectPath} against ${tmdFilePath}`);
    console.log(`Entry point: ${resolvedEntrypoint}`);
  }

  // Read expected TypedMind file
  const tmdContent = readFileSync(tmdFilePath, 'utf-8');

  // Analyze TypeScript project starting from entrypoint
  const analyzer = new TypeScriptAnalyzer(projectPath, configPath || values.config as string | undefined);
  const analysis = analyzer.analyzeFromEntrypoint(resolvedEntrypoint);

  // Convert to TypedMind
  const conversionOptions: ConversionOptions = {
    preferClassFile: values['prefer-class-file'] !== false,
    includePrivateMembers: values['include-private'] || false,
    generatePrograms: !values['no-programs'],
    programVersion: (values.version as string) || '1.0.0',
    ignorePatterns: ['node_modules/**', '**/*.d.ts', '**/*.test.ts', '**/*.spec.ts'],
  };

  const converter = new TypeScriptToTypedMindConverter(conversionOptions);
  const conversionResult = converter.convert(analysis);

  if (!conversionResult.success) {
    console.error(`Conversion failed:`);
    for (const error of conversionResult.errors) {
      console.error(`  ${error.message}`);
    }
    process.exit(1);
  }

  // Assert against expected
  const assertionEngine = new AssertionEngine();
  const assertionResult = assertionEngine.assert(conversionResult, tmdFilePath, tmdContent);

  // Report results
  if (assertionResult.success) {
    console.log('✓ TypeScript project matches expected TypedMind architecture');
    process.exit(0);
  } else {
    console.error('✗ TypeScript project deviates from expected architecture');
    
    if (assertionResult.missingEntities.length > 0) {
      console.error(`\nMissing entities (${assertionResult.missingEntities.length}):`);
      for (const entity of assertionResult.missingEntities) {
        console.error(`  - ${entity}`);
      }
    }
    
    if (assertionResult.extraEntities.length > 0) {
      console.error(`\nExtra entities (${assertionResult.extraEntities.length}):`);
      for (const entity of assertionResult.extraEntities) {
        console.error(`  + ${entity}`);
      }
    }
    
    if (assertionResult.deviations.length > 0) {
      const errors = assertionResult.deviations.filter(d => d.severity === 'error');
      const warnings = assertionResult.deviations.filter(d => d.severity === 'warning');
      
      if (errors.length > 0) {
        console.error(`\nErrors (${errors.length}):`);
        for (const deviation of errors) {
          console.error(`  ${deviation.entityName}.${deviation.property}:`);
          console.error(`    Expected: ${JSON.stringify(deviation.expected)}`);
          console.error(`    Actual:   ${JSON.stringify(deviation.actual)}`);
        }
      }
      
      if (warnings.length > 0 && values.verbose) {
        console.warn(`\nWarnings (${warnings.length}):`);
        for (const deviation of warnings) {
          console.warn(`  ${deviation.entityName}.${deviation.property}:`);
          console.warn(`    Expected: ${JSON.stringify(deviation.expected)}`);
          console.warn(`    Actual:   ${JSON.stringify(deviation.actual)}`);
        }
      }
    }
    
    process.exit(1);
  }
}

async function handleCheck(values: any): Promise<void> {
  const { projectPath, configPath } = resolveProjectPath(values.project as string);
  const resolvedEntrypoint = resolveEntrypoint(projectPath, values.entrypoint as string);

  if (values.verbose) {
    console.log(`Checking TypeScript project: ${projectPath}`);
    console.log(`Entry point: ${resolvedEntrypoint}`);
  }

  // Analyze TypeScript project starting from entrypoint
  const analyzer = new TypeScriptAnalyzer(projectPath, configPath || values.config as string | undefined);
  const analysis = analyzer.analyzeFromEntrypoint(resolvedEntrypoint);

  // Convert to TypedMind
  const conversionOptions: ConversionOptions = {
    preferClassFile: values['prefer-class-file'] !== false,
    includePrivateMembers: values['include-private'] || false,
    generatePrograms: !values['no-programs'],
    programVersion: (values.version as string) || '1.0.0',
    ignorePatterns: ['node_modules/**', '**/*.d.ts', '**/*.test.ts', '**/*.spec.ts'],
  };

  const converter = new TypeScriptToTypedMindConverter(conversionOptions);
  const conversionResult = converter.convert(analysis);

  // Report conversion issues
  if (conversionResult.warnings.length > 0) {
    console.warn(`Conversion warnings (${conversionResult.warnings.length}):`);
    for (const warning of conversionResult.warnings) {
      console.warn(`  ${warning.message}`);
      if (warning.suggestion) {
        console.warn(`    Suggestion: ${warning.suggestion}`);
      }
    }
    console.warn('');
  }

  if (!conversionResult.success) {
    console.error(`Conversion failed with ${conversionResult.errors.length} error(s):`);
    for (const error of conversionResult.errors) {
      console.error(`  ${error.message}`);
    }
    console.error('');
  }

  // Validate with TypedMind checker
  const checker = new DSLChecker();
  const validationResult = checker.check(conversionResult.tmdContent);

  if (validationResult.valid) {
    console.log('✓ TypeScript project architecture is valid');
    
    if (values.verbose) {
      console.log(`\nValidated ${conversionResult.entities.length} entities:`);
      const entityCounts = conversionResult.entities.reduce((counts, entity) => {
        counts[entity.type] = (counts[entity.type] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);
      
      for (const [type, count] of Object.entries(entityCounts)) {
        console.log(`  ${type}: ${count}`);
      }
    }
    
    process.exit(0);
  } else {
    console.error(`✗ Architecture validation failed with ${validationResult.errors.length} error(s):`);
    
    for (const error of validationResult.errors) {
      const severity = error.severity === 'warning' ? 'WARNING' : 'ERROR';
      console.error(`  ${severity}: ${error.message}`);
      if (error.suggestion) {
        console.error(`    Suggestion: ${error.suggestion}`);
      }
    }
    
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});