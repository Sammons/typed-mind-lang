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

// STOP-AND-REPORT (S-TEST-1, scenario-58, not in an AUTHORIZED[A#] delta row):
// `DataFile` is declared with File syntax (`@ src/data.ts:`, line 28) plus an
// illegal-on-File `=> [processData]` methods continuation (line 30). Legacy
// tolerated the illegal continuation and kept DataFile as `type: 'File'`
// (methods stayed unset). The new grammar instead folds the methods
// continuation into the entity, producing `kind: 'ClassFile'` for DataFile.
// This is a File->ClassFile kind change with no corresponding AUTHORIZED row
// for this scenario. It does not flip any assertion below to failing (the
// `instanceof FileNode` narrow below now finds no match, so the `?.methods`
// optional-chain still reads `undefined`), but it is a silent precision loss:
// the test no longer confirms DataFile stayed a File — flagged for lead
// review, no lib/typed-mind source change made here (out of Q4 scope).

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
    // STOP-AND-REPORT (S-TEST-1, scenario-58, AUTHORIZED[A4]): legacy emitted
    // "Class 'DataClass' is not exported by any file" (L34); the new surface
    // does not emit this finding for DataClass. AUTHORIZED[A4] documents this
    // exact legacy-only message as an accepted delta. Assertion below is kept
    // at the legacy-matching expectation is not possible without forcing a
    // false pass, so this checks the delta explicitly instead.
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

    // Files can't have methods (=> syntax)
    // See file-level STOP-AND-REPORT above: DataFile now parses as ClassFile,
    // so this `instanceof FileNode` narrow finds no match and `?.methods`
    // reads undefined via optional chaining — the assertion still passes.
    const dataFile = entitiesArray.find((e): e is FileNode => e instanceof FileNode && e.name === 'DataFile');
    assert.equal(dataFile?.methods, undefined);

    // Classes can't have paths (@ syntax)
    const dataClass = entitiesArray.find((e): e is ClassNode => e instanceof ClassNode && e.name === 'DataClass');
    assert.equal(dataClass?.path, undefined);
  });
});
