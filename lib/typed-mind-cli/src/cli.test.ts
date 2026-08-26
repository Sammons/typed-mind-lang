import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from 'util';

// Options configuration matching the CLI
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

describe('CLI parseArgs utilities', () => {
  it('should parse --check flag with file path', () => {
    const args = ['--check', 'example.tmd'];

    const parsed = parseArgs({
      args,
      options,
      allowPositionals: true,
    });

    assert.equal(parsed.values.check, 'example.tmd');
    assert.equal(parsed.values.render, undefined);
    assert.deepEqual(parsed.positionals, []);
  });

  it('should parse --render flag with options', () => {
    const args = ['--render', 'example.tmd', '--output', 'output.html'];

    const parsed = parseArgs({
      args,
      options,
      allowPositionals: true,
    });

    assert.equal(parsed.values.render, 'example.tmd');
    assert.equal(parsed.values.output, 'output.html');
    assert.equal(parsed.values.check, undefined);
  });

  it('should handle --port option as number', () => {
    const args = ['--render', 'example.tmd', '--port', '8080'];

    const parsed = parseArgs({
      args,
      options,
      allowPositionals: true,
    });

    assert.equal(parsed.values.port, '8080');
    // Test the port conversion logic used in the CLI
    const portNumber = parseInt(parsed.values.port || '3000', 10);
    assert.equal(portNumber, 8080);
    assert.equal(typeof portNumber, 'number');
  });

  it('should parse --no-browser flag correctly', () => {
    const args = ['--render', 'example.tmd', '--no-browser'];

    const parsed = parseArgs({
      args,
      options,
      allowPositionals: true,
    });

    assert.equal(parsed.values['no-browser'], true);
    assert.equal(parsed.values.render, 'example.tmd');
  });

  it('should parse short flags correctly', () => {
    const args = ['-c', 'example.tmd'];

    const parsed = parseArgs({
      args,
      options,
      allowPositionals: true,
    });

    assert.equal(parsed.values.check, 'example.tmd');
  });

  it('should handle help flag', () => {
    const args = ['--help'];

    const parsed = parseArgs({
      args,
      options,
      allowPositionals: true,
    });

    assert.equal(parsed.values.help, true);
  });

  it('should handle mixed options', () => {
    const args = ['--render', 'example.tmd', '--port', '9000', '--no-browser', '--skip-orphan-check'];

    const parsed = parseArgs({
      args,
      options,
      allowPositionals: true,
    });

    assert.equal(parsed.values.render, 'example.tmd');
    assert.equal(parsed.values.port, '9000');
    assert.equal(parsed.values['no-browser'], true);
    assert.equal(parsed.values['skip-orphan-check'], true);
  });

  it('should handle positional arguments', () => {
    const args = ['example.tmd'];

    const parsed = parseArgs({
      args,
      options,
      allowPositionals: true,
    });

    assert.deepEqual(parsed.positionals, ['example.tmd']);
    assert.equal(parsed.values.check, undefined);
    assert.equal(parsed.values.render, undefined);
  });
});
