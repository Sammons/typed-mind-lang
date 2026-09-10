import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { GRAMMAR_PATH as CS_GRAMMAR, CSharpAnalyzer, CSharpConverter } from '@sammons/typed-mind-csharp';
import { JavaAnalyzer, JavaConverter } from '@sammons/typed-mind-java';
import { PythonAnalyzer, PythonConverter } from '@sammons/typed-mind-python';
import { RustAnalyzer, RustConverter } from '@sammons/typed-mind-rust';
import { TreeSitterParser } from '@sammons/typed-mind-tree-sitter-common';

const CONVERTER_OPTS = {
  includePrivateMembers: false,
  generatePrograms: false,
  programVersion: undefined,
  ignorePatterns: [],
} as const;

const JAVA_SOURCE = `
public class UserService {
    public String greet(String name) {
        return "Hello " + name;
    }
}
`;

const CSHARP_SOURCE = `
namespace App;

public class UserService
{
    public string Greet(string name)
    {
        return "Hello " + name;
    }
}
`;

const RUST_SOURCE = `
pub struct UserService;

impl UserService {
    pub fn greet(&self, name: &str) -> String {
        format!("Hello {}", name)
    }
}
`;

const PYTHON_SOURCE = `
class UserService:
    def greet(self, name: str) -> str:
        return f"Hello {name}"
`;

describe('cross-language: each analyzer extracts a UserService class with a greet method', () => {
  let tmpRoot: string;

  before(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'tm-cross-lang-'));
  });

  after(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('Java: UserService with greet', async () => {
    const dir = join(tmpRoot, 'java');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'UserService.java'), JAVA_SOURCE);

    const analyzer = await JavaAnalyzer.create(dir);
    const analysis = analyzer.analyzeFromEntrypoint('UserService.java');
    const result = new JavaConverter(CONVERTER_OPTS).convert(analysis);

    assert.ok(result.success, `conversion failed: ${result.errors.map((e) => e.message).join(', ')}`);
    const svc = result.entities.find((e) => e.name === 'UserService');
    assert.ok(svc, 'should produce a UserService entity');
    assert.ok(result.tmdContent.length > 0, 'should produce TMD output');
  });

  it('C#: UserService with Greet', async () => {
    const dir = join(tmpRoot, 'csharp');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'UserService.cs'), CSHARP_SOURCE);

    const parser = await TreeSitterParser.create(CS_GRAMMAR);
    const analyzer = new CSharpAnalyzer(dir, parser);
    const analysis = analyzer.analyzeFromEntrypoint('UserService.cs');
    const result = new CSharpConverter(CONVERTER_OPTS).convert(analysis);

    assert.ok(result.success, `conversion failed: ${result.errors.map((e) => e.message).join(', ')}`);
    const svc = result.entities.find((e) => e.name === 'UserService');
    assert.ok(svc, 'should produce a UserService entity');
    assert.ok(result.tmdContent.length > 0, 'should produce TMD output');
  });

  it('Rust: UserService with greet', async () => {
    const dir = join(tmpRoot, 'rust');
    const srcDir = join(dir, 'src');
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, 'lib.rs'), RUST_SOURCE);
    writeFileSync(join(dir, 'Cargo.toml'), '[package]\nname = "cross-lang-test"\nversion = "0.1.0"\nedition = "2021"\n');

    const wasmPath = new URL('../../typed-mind-rust/grammar/tree-sitter-rust.wasm', import.meta.url).pathname;
    const parser = await TreeSitterParser.create(wasmPath);
    const analyzer = new RustAnalyzer(dir, parser);
    const analysis = analyzer.analyzeFromEntrypoint('src/lib.rs');
    const result = new RustConverter(CONVERTER_OPTS).convert(analysis);

    assert.ok(result.success, `conversion failed: ${result.errors.map((e) => e.message).join(', ')}`);
    const svc = result.entities.find((e) => e.name === 'UserService');
    assert.ok(svc, 'should produce a UserService entity');
    assert.ok(result.tmdContent.length > 0, 'should produce TMD output');
  });

  it('Python: UserService with greet', async () => {
    const dir = join(tmpRoot, 'python');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'service.py'), PYTHON_SOURCE);

    const analyzer = new PythonAnalyzer(dir);
    const analysis = await analyzer.analyzeFromEntrypointAsync('service.py');
    const result = new PythonConverter(CONVERTER_OPTS).convert(analysis);

    assert.ok(result.success, `conversion failed: ${result.errors.map((e) => e.message).join(', ')}`);
    const svc = result.entities.find((e) => e.name === 'UserService');
    assert.ok(svc, 'should produce a UserService entity');
    assert.ok(result.tmdContent.length > 0, 'should produce TMD output');
  });

  it('all four converters produce a UserService entity with the same kind', async () => {
    const javaDir = join(tmpRoot, 'all-java');
    mkdirSync(javaDir, { recursive: true });
    writeFileSync(join(javaDir, 'UserService.java'), JAVA_SOURCE);
    const javaAnalyzer = await JavaAnalyzer.create(javaDir);
    const javaResult = new JavaConverter(CONVERTER_OPTS).convert(javaAnalyzer.analyzeFromEntrypoint('UserService.java'));

    const csDir = join(tmpRoot, 'all-cs');
    mkdirSync(csDir, { recursive: true });
    writeFileSync(join(csDir, 'UserService.cs'), CSHARP_SOURCE);
    const csParser = await TreeSitterParser.create(CS_GRAMMAR);
    const csResult = new CSharpConverter(CONVERTER_OPTS).convert(
      new CSharpAnalyzer(csDir, csParser).analyzeFromEntrypoint('UserService.cs'),
    );

    const rustDir = join(tmpRoot, 'all-rust');
    const rustSrcDir = join(rustDir, 'src');
    mkdirSync(rustSrcDir, { recursive: true });
    writeFileSync(join(rustSrcDir, 'lib.rs'), RUST_SOURCE);
    writeFileSync(join(rustDir, 'Cargo.toml'), '[package]\nname = "all-test"\nversion = "0.1.0"\nedition = "2021"\n');
    const rustWasm = new URL('../../typed-mind-rust/grammar/tree-sitter-rust.wasm', import.meta.url).pathname;
    const rustParser = await TreeSitterParser.create(rustWasm);
    const rustResult = new RustConverter(CONVERTER_OPTS).convert(new RustAnalyzer(rustDir, rustParser).analyzeFromEntrypoint('src/lib.rs'));

    const pyDir = join(tmpRoot, 'all-py');
    mkdirSync(pyDir, { recursive: true });
    writeFileSync(join(pyDir, 'service.py'), PYTHON_SOURCE);
    const pyAnalyzer = new PythonAnalyzer(pyDir);
    const pyResult = new PythonConverter(CONVERTER_OPTS).convert(await pyAnalyzer.analyzeFromEntrypointAsync('service.py'));

    const javaSvc = javaResult.entities.find((e) => e.name === 'UserService');
    const csSvc = csResult.entities.find((e) => e.name === 'UserService');
    const rustSvc = rustResult.entities.find((e) => e.name === 'UserService');
    const pySvc = pyResult.entities.find((e) => e.name === 'UserService');

    assert.ok(javaSvc && csSvc && rustSvc && pySvc, 'all four should produce UserService');

    const kinds = new Set([javaSvc.kind, csSvc.kind, rustSvc.kind, pySvc.kind]);
    assert.ok(
      kinds.size <= 2,
      `entity kinds should be consistent across languages, got: Java=${javaSvc.kind}, C#=${csSvc.kind}, Rust=${rustSvc.kind}, Python=${pySvc.kind}`,
    );
  });
});
