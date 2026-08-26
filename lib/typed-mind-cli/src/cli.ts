#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { DSLChecker } from '@sammons/typed-mind';
import { TypedMindRenderer } from '@sammons/typed-mind-renderer';

const options = {
  help: {
    type: 'boolean' as const,
    short: 'h',
    description: 'Show help',
  },
  check: {
    type: 'string' as const,
    short: 'c',
    description: 'Check a DSL file for errors',
  },
  render: {
    type: 'string' as const,
    short: 'r',
    description: 'Render a DSL file interactively',
  },
  output: {
    type: 'string' as const,
    short: 'o',
    description: 'Output static HTML file',
  },
  port: {
    type: 'string' as const,
    short: 'p',
    description: 'Port for interactive renderer (default: 3000)',
  },
  'no-browser': {
    type: 'boolean' as const,
    description: 'Do not open browser automatically',
  },
  'skip-orphan-check': {
    type: 'boolean' as const,
    description: 'Skip orphan entity validation (for documentation)',
  },
};

function showHelp(): void {
  console.log(`
TypedMind - A domain-specific language for program architecture

Usage: typed-mind [options] <file>

Options:
  -h, --help           Show help
  -c, --check <file>   Check a DSL file for errors
  -r, --render <file>  Render a DSL file interactively
  -o, --output <file>  Output static HTML file
  -p, --port <port>    Port for interactive renderer (default: 3000)
  --no-browser         Do not open browser automatically

Examples:
  typed-mind --check examples/example.tmd
  typed-mind --render examples/example.tmd
  typed-mind --render examples/example.tmd --output output.html
  typed-mind --render examples/dto-example.tmd --port 8080 --no-browser
`);
}

async function main() {
  let parsed: ReturnType<typeof parseArgs<{ options: typeof options; allowPositionals: true }>>;

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

  const filePath = values.check || values.render || positionals[0];

  if (!filePath) {
    console.error('Error: No file specified');
    showHelp();
    process.exit(1);
  }

  try {
    const absolutePath = resolve(filePath as string);
    const content = readFileSync(absolutePath, 'utf-8');
    const checker = new DSLChecker({
      skipOrphanCheck: values['skip-orphan-check'] as boolean,
    });

    if (values.check) {
      console.log(`Checking ${filePath}...`);
      const result = checker.check(content, absolutePath);

      if (result.valid) {
        console.log('\u2713 No errors found!');
        process.exit(0);
      } else {
        // Display each error
        for (const error of result.errors) {
          const severity = error.severity === 'warning' ? 'WARNING' : 'ERROR';
          console.error(`${severity} at line ${error.position.line}, col ${error.position.column}: ${error.message}`);
          const errorLine = content.split('\n')[error.position.line - 1] || '';
          console.error(`  ${error.position.line} | ${errorLine}`);
          console.error(`     ${' '.repeat(String(error.position.line).length)}${''.padStart(error.position.column, ' ')}^`);
          if (error.suggestion) {
            console.error(`  Suggestion: ${error.suggestion}`);
          }
          console.error(''); // Empty line between errors
        }

        console.error(`\u2717 Found ${result.errors.length} error(s)`);
        process.exit(1);
      }
    } else if (values.render) {
      console.log(`Rendering ${filePath}...`);
      const programGraph = checker.parse(content, absolutePath);
      const validationResult = checker.check(content, absolutePath);

      const renderer = new TypedMindRenderer({
        port: parseInt(values.port || '3000', 10),
        openBrowser: !values['no-browser'],
        enableInteractive: true,
        enableMultiSelection: true,
        enableKeyboardNavigation: true,
        enableAccessibility: true,
        enablePerformanceMonitoring: true,
      });

      renderer.setProgramGraph(programGraph);
      renderer.setValidationResult(validationResult);

      if (values.output) {
        const html = renderer.generateStaticHTML();
        writeFileSync(values.output as string, html);
        console.log(`Static HTML written to ${values.output}`);
      } else {
        await renderer.serve();
      }
    } else {
      // Default to check
      console.log(`Checking ${filePath}...`);
      const result = checker.check(content, absolutePath);

      if (result.valid) {
        console.log('\u2713 No errors found!');
        process.exit(0);
      } else {
        // Display each error
        for (const error of result.errors) {
          const severity = error.severity === 'warning' ? 'WARNING' : 'ERROR';
          console.error(`${severity} at line ${error.position.line}, col ${error.position.column}: ${error.message}`);
          const errorLine = content.split('\n')[error.position.line - 1] || '';
          console.error(`  ${error.position.line} | ${errorLine}`);
          console.error(`     ${' '.repeat(String(error.position.line).length)}${''.padStart(error.position.column, ' ')}^`);
          if (error.suggestion) {
            console.error(`  Suggestion: ${error.suggestion}`);
          }
          console.error(''); // Empty line between errors
        }

        console.error(`\u2717 Found ${result.errors.length} error(s)`);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
