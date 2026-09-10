import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseCsproj, resolveProjectConfig } from './csharp-project.ts';

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(THIS_DIR, '..', 'tests', 'fixtures');

describe('parseCsproj', () => {
  it('extracts assembly name from .csproj', () => {
    const info = parseCsproj(resolve(FIXTURES_DIR, 'TestProject.csproj'));
    assert.equal(info.assemblyName, 'TestProject');
  });

  it('extracts package references from .csproj', () => {
    const info = parseCsproj(resolve(FIXTURES_DIR, 'TestProject.csproj'));
    assert.ok(info.packageReferences.length >= 2, 'should find at least 2 package references');

    const logging = info.packageReferences.find((r) => r.name === 'Microsoft.Extensions.Logging');
    assert.ok(logging !== undefined, 'should find Microsoft.Extensions.Logging');
    assert.equal(logging.version, '8.0.0');

    const newtonsoft = info.packageReferences.find((r) => r.name === 'Newtonsoft.Json');
    assert.ok(newtonsoft !== undefined, 'should find Newtonsoft.Json');
    assert.equal(newtonsoft.version, '13.0.3');
  });

  it('finds .cs source files in the project directory', () => {
    const info = parseCsproj(resolve(FIXTURES_DIR, 'TestProject.csproj'));
    assert.ok(info.sourceFiles.length >= 4, 'should find .cs files in fixtures dir');
    assert.ok(
      info.sourceFiles.some((f) => f.includes('basic-class.cs')),
      'should find basic-class.cs',
    );
  });
});

describe('resolveProjectConfig', () => {
  it('resolves a .csproj file path', () => {
    const csprojPath = resolve(FIXTURES_DIR, 'TestProject.csproj');
    const config = resolveProjectConfig(csprojPath);
    assert.equal(config.configPath, csprojPath);
    assert.equal(config.projectPath, FIXTURES_DIR);
  });

  it('resolves a directory containing a .csproj', () => {
    const config = resolveProjectConfig(FIXTURES_DIR);
    assert.equal(config.projectPath, FIXTURES_DIR);
    assert.ok(config.configPath.endsWith('.csproj'), 'should find .csproj in directory');
  });
});
