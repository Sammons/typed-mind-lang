#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { TypedMind } from '@sammons/typed-mind';
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

    if (values.render) {
      // RFC-TM-6 \u00a72 (rfc-tm-6-diamond.md) \u2014 the renderer's input seam moved
      // to setGraph(ParseOutput); --render's one in-repo TypedMindRenderer
      // caller moves with it, off TypedMind.create()'s parse()/check().
      console.log(`Rendering ${filePath}...`);
      const typedMind = await TypedMind.create({
        skipOrphanCheck: values['skip-orphan-check'] as boolean,
      });
      const graph = typedMind.parse(content, absolutePath);
      const { diagnostics } = typedMind.check(content, absolutePath);

      const renderer = new TypedMindRenderer({
        port: parseInt(values.port || '3000', 10),
        openBrowser: !values['no-browser'],
        enableInteractive: true,
        enableMultiSelection: true,
        enableKeyboardNavigation: true,
        enableAccessibility: true,
        enablePerformanceMonitoring: true,
      });

      renderer.setGraph(graph);
      renderer.setValidationResult(diagnostics);

      if (values.output) {
        const html = renderer.generateStaticHTML();
        writeFileSync(values.output as string, html);
        console.log(`Static HTML written to ${values.output}`);
      } else {
        await renderer.serve();
      }
    } else {
      // RFC-TM-4 \u00a73 (S-CONS-CLI-1): --check and the default-to-check path
      // adopt the new surface \u2014 main() is already async, so awaiting
      // TypedMind.create() here is the only change the flip requires.
      // RFC-TM-10 \u00a713 (rfc-tm-10-diamond.md, D-LEG-13): --check is the CLI
      // boundary that adopts the parse-before-check gate \u2014 checkWithParseGate
      // skips the checker phase entirely when the extractor's output failed
      // to parse, so a malformed emission surfaces as a parse failure instead
      // of a checker-diagnostic storm built on top of unparsable input.
      console.log(`Checking ${filePath}...`);
      const typedMind = await TypedMind.create({
        skipOrphanCheck: values['skip-orphan-check'] as boolean,
      });
      const result = typedMind.checkWithParseGate(content, absolutePath);

      if (result.valid) {
        console.log('\u2713 No errors found!');
        process.exit(0);
      } else {
        // issue #92 \u2014 RFC-TM-8's "suppressed-not-silenced" design (X-SUPP-3)
        // keeps a suppressed finding in `diagnostics` with the SAME severity
        // and a `suppression` annotation, excluded only from the error count
        // that drives `valid`. Printing every diagnostic with the same
        // ERROR/WARNING label made a suppressed, previously-adjudicated
        // finding visually and numerically indistinguishable from a real,
        // actionable one. A suppressed diagnostic now prints as
        // `SUPPRESSED (reason)` instead of `ERROR`/`WARNING`, and the
        // summary line reports active vs suppressed counts separately,
        // surfacing the `suppressedCount` field `check()`/
        // `checkWithParseGate()` already return.
        let activeCount = 0;
        let suppressedCount = 0;
        for (const diagnostic of result.diagnostics) {
          const isSuppressed = diagnostic.suppression !== undefined;
          const label = isSuppressed
            ? `SUPPRESSED (${diagnostic.suppression?.reason})`
            : diagnostic.severity === 'warning'
              ? 'WARNING'
              : 'ERROR';
          if (isSuppressed) {
            suppressedCount += 1;
          } else {
            activeCount += 1;
          }
          const { line, column } = diagnostic.span.start;
          console.error(`${label} at line ${line}, col ${column}: ${diagnostic.message}`);
          const errorLine = content.split('\n')[line - 1] || '';
          console.error(`  ${line} | ${errorLine}`);
          console.error(`     ${' '.repeat(String(line).length)}${''.padStart(column, ' ')}^`);
          console.error(''); // Empty line between diagnostics
        }

        console.error(
          `\u2717 Found ${activeCount} active diagnostic(s), ${suppressedCount} suppressed diagnostic(s) (${result.diagnostics.length} total)`,
        );
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
