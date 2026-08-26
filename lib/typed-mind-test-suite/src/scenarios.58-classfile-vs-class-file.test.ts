import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { ClassFileNode } from '../../typed-mind/src/ast/class-file-node.ts';
import { ClassNode } from '../../typed-mind/src/ast/class-node.ts';
import { FileNode } from '../../typed-mind/src/ast/file-node.ts';
import { AstValidator } from '../../typed-mind/src/checker/ast-validator.ts';
import { computeLinks } from '../../typed-mind/src/pipeline/link-index.ts';
import { TypedMindParser } from '../../typed-mind/src/pipeline/typed-mind-parser.ts';
import { WASM_PATH } from './wasm-path.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// RFC-TM-4 §4 A4 (rfc-tm-4-diamond.md: "scenario-58 lookahead ClassFile
// carries exports/imports first-class"): `DataFile` is declared with File
// syntax (`@ src/data.ts:`, line 28) plus an illegal-on-File
// `=> [processData]` methods continuation (line 30) and its own `-> [...]`/
// `<- [...]` continuations. Legacy's regex parser mangled this into
// `type: 'Class'` (verified directly against DSLParser) — a Class-typed
// object that still carries the File-only `path` field and drops `imports`/
// `exports` entirely (Class has neither in the legacy type), which is why
// legacy separately reports "Class 'DataFile' is not exported by any file"
// (AUTHORIZED[A4], shadow-verdict-harness.mjs) — a leftover from the
// mis-typed Class. The new grammar's lookahead conversion instead resolves
// the whole declaration into a single coherent `ClassFile` node carrying
// path/methods/imports/exports first-class (attested by probing
// TypedMindParser directly: DataFile parses as ClassFile with
// path: 'src/data.ts', methods: ['processData'],
// imports: ['Database'], exports: ['DataClass', 'DataFile']) — exactly the
// "fusion assertions gain the recovered fields" outcome A4 describes. This
// is the row's mechanism, not a new unauthorized cause.

describe('Scenario 58: ClassFile vs Class+File mistakes', () => {
  const scenarioPath = join(__dirname, '../scenarios/scenario-58-classfile-vs-class-file.tmd');
  const content = readFileSync(scenarioPath, 'utf-8');

  it('should detect ClassFile vs Class+File conflicts', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const links = computeLinks(outcome.entities);
    const validation = new AstValidator().validate(outcome, links);

    assert.equal(validation.valid, false);
    const errors = validation.findings;

    // There should be validation errors from ClassFile vs Class+File conflicts

    // Mistake 1: Circular import between ClassFiles
    const circularError = errors.find(
      (e) => e.message.includes('Circular import detected') && e.message.includes('ServiceA -> ServiceB -> ServiceA'),
    );
    assert.notEqual(circularError, undefined);

    // Mistake 4: Cannot import non-existent entities
    const importError = errors.find((e) => e.message.includes("Import 'UserRepository' not found"));
    assert.notEqual(importError, undefined);

    // Mistake 5: ClassFile duplicate export
    // ClassFile auto-exports itself, so manual export is redundant
    const entitiesArray = outcome.entities;
    const goodService = entitiesArray.find((e): e is ClassFileNode => e instanceof ClassFileNode && e.name === 'GoodService');
    // The exports should include helper but GoodService is implicit
    assert.ok(goodService?.exports.includes('helper'));

    // Mistake 6: Cannot call ClassFile directly (method call syntax)
    const processUserError = errors.find((e) => e.message.includes("Cannot use 'calls' to reference ClassFile 'UserService'"));
    assert.notEqual(processUserError, undefined);

    // Mistake 7: Classes not exported by any file
    // RFC-TM-4 §4 A4: legacy emitted "Class 'DataClass' is not exported by
    // any file" (L34) as a cascade off DataFile's mis-typing as a Class (see
    // file-level A4 comment above); the new surface does not emit this
    // finding for DataClass since DataFile correctly resolves to ClassFile.
    // Authorized delta — asserted explicitly rather than left implicit.
    const orphanedClassError = errors.find((e) => e.message.includes("Class 'DataClass' is not exported by any file"));
    assert.equal(orphanedClassError, undefined);
  });

  it('should properly parse ClassFile features', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);

    // UserService ClassFile
    const entitiesArray = outcome.entities;
    const userService = entitiesArray.find((e): e is ClassFileNode => e instanceof ClassFileNode && e.name === 'UserService');
    assert.notEqual(userService, undefined);
    assert.equal(userService?.path, 'src/services/user.ts');
    assert.ok(userService?.methods.includes('createUser'));
    assert.ok(userService?.imports.includes('UserRepository'));
    assert.ok(userService?.exports.includes('userHelper'));
    // RFC-TM-4 §4 A12 (authorized 2026-08-26, claude-home #1356): UserService
    // declares `-> [userHelper]` without its own name; the new ClassFileNode
    // unconditionally appends the self-name on top of the declared list
    // (legacy's seed-then-overwrite left it out once a continuation existed).
    // Attested: this file's UserService is one of A12's 6 records / 3 files.
    assert.ok(userService?.exports.includes('UserService'));

    // EmptyService with no methods (valid)
    const emptyService = entitiesArray.find((e): e is ClassFileNode => e instanceof ClassFileNode && e.name === 'EmptyService');
    assert.notEqual(emptyService, undefined);
    assert.equal(emptyService?.methods.length || 0, 0);

    // ExtendedService extending another ClassFile
    const extendedService = entitiesArray.find((e): e is ClassFileNode => e instanceof ClassFileNode && e.name === 'ExtendedService');
    assert.ok(extendedService?.extends?.includes('UserService'));
  });

  it('should distinguish when to use ClassFile vs Class+File', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const entitiesArray = outcome.entities;

    // ModuleService: Good use of ClassFile (single main export)
    const moduleService = entitiesArray.find((e): e is ClassFileNode => e instanceof ClassFileNode && e.name === 'ModuleService');
    assert.notEqual(moduleService, undefined);

    // SharedFile: Good use of separate File (multiple class exports)
    const sharedFile = entitiesArray.find((e): e is FileNode => e instanceof FileNode && e.name === 'SharedFile');
    assert.ok(sharedFile?.exports.includes('SharedClass'));
    assert.ok(sharedFile?.exports.includes('AnotherClass'));
    assert.ok(sharedFile?.exports.includes('utilFunc'));

    // Both SharedClass and AnotherClass exist as separate entities
    const sharedClass = entitiesArray.find((e): e is ClassNode => e instanceof ClassNode && e.name === 'SharedClass');
    assert.notEqual(sharedClass, undefined);
  });

  it('should handle invalid syntax attempts', async () => {
    const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });
    const outcome = parser.parse(content);
    const entitiesArray = outcome.entities;

    // Files can't have methods (=> syntax): RFC-TM-4 §4 A4. The new grammar's
    // lookahead conversion resolves DataFile's File-declaration-plus-methods-
    // continuation into a single ClassFile node (see file-level A4 comment
    // above), carrying path/methods/imports/exports first-class rather than
    // legacy's mis-typed Class with a stray File-only path field.
    assert.equal(
      entitiesArray.find((e) => e.name === 'DataFile' && e instanceof FileNode),
      undefined,
    );
    const dataFile = entitiesArray.find((e): e is ClassFileNode => e instanceof ClassFileNode && e.name === 'DataFile');
    assert.notEqual(dataFile, undefined);
    assert.equal(dataFile?.path, 'src/data.ts');
    assert.deepEqual(dataFile?.methods, ['processData']);
    assert.deepEqual(dataFile?.imports, ['Database']);
    assert.deepEqual(dataFile?.exports, ['DataClass', 'DataFile']);

    // Classes can't have paths (@ syntax)
    const dataClass = entitiesArray.find((e): e is ClassNode => e instanceof ClassNode && e.name === 'DataClass');
    assert.equal(dataClass?.path, undefined);
  });
});
