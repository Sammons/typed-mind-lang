// Regression test for typed-mind-lang#126: toggleFormat silently corrupted
// Program.version (and produced a garbage `entry`) when the entry point was
// empty/unresolved (e.g. a longform document that used the wrong property
// key, `entryPoint:` instead of `entry:`, or a different path that leaves
// ProgramNode.entry === '').
//
// Root cause: programToShortform (in emit-shortform.ts, the file under test)
// unconditionally emitted `${name} -> ${entry}` then appended ` v${version}`.
// With entry === '' that produced `Name ->  v1.0.0` (double space, `v` glued
// straight onto the version digits with no separating token). On reparse, the
// shortform grammar's `Name -> Entry vVersion` production has no real Entry
// token to anchor on, so it mis-split the trailing `v1.0.0` blob at the first
// `.`, yielding entry: 'v1' / version: '.0.0' — silent data corruption, no
// diagnostic naming it.
//
// Fix: programToShortform now throws a descriptive Error when entry is
// empty, refusing to emit a lossy/ambiguous line rather than inventing one.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ProgramNode } from '../ast/program-node.ts';
import { emitShortform } from './emit-shortform.ts';

const makeProgram = (entry: string, version: string | undefined): ProgramNode =>
  new ProgramNode({
    name: 'TodoApp',
    raw: 'program TodoApp { ... }',
    sourceForm: 'longform',
    span: {
      start: { line: 1, column: 1 },
      end: { line: 1, column: 1 },
    },
    entry,
    version,
  });

describe('emitShortform: Program with unresolved entry point (#126)', () => {
  it('throws instead of emitting a corrupted `Name ->  vVersion` line when entry is empty', () => {
    const program = makeProgram('', '1.0.0');
    assert.throws(
      () => emitShortform(program),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /TodoApp/);
        assert.match(error.message, /entry point/i);
        return true;
      },
    );
  });

  it('still emits normally when entry resolves to a real value (control case)', () => {
    const program = makeProgram('models', '1.0.0');
    const lines = emitShortform(program);
    assert.deepEqual(lines, ['TodoApp -> models v1.0.0']);
  });

  it('throws even when version is undefined (entry alone is the invariant)', () => {
    const program = makeProgram('', undefined);
    assert.throws(() => emitShortform(program), /entry point/i);
  });
});
