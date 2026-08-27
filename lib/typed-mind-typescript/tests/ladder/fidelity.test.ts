// RFC-TM-9 Q1, check (1) — the FIRST check in the Diamond DAG's Q1 check
// list: every copied fixture's source is diffed verbatim against the code
// block quoted in its owning census note
// (knowledge/projects/typedmind/extraction-gap-census-analyzer.md in the
// claude-home repo). This proves continuity from the evidence to the
// regression suite and moots the census notes' stale "repros no longer
// exist" prose — the fixtures under tests/ladder/repros-analyzer/ ARE the
// documented evidence, not a re-derivation of it.
//
// The census lives in a separate repo (claude-home) that CI here has no
// access to, so the expected quoted blocks are embedded directly below,
// copied verbatim from the census note as read during this Quantum's
// implementation. Each entry names the fixture file and the exact
// substring the census note quotes for it; the assertion is
// substring-containment (the census sometimes quotes a fragment, e.g. a
// single function, out of a fixture file that also carries an unquoted
// sibling declaration), never a full-file byte-equal.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const testDir = dirname(fileURLToPath(import.meta.url));
const reprosDir = join(testDir, 'repros-analyzer');

interface FidelityCase {
  readonly fixture: string;
  readonly file: string;
  readonly quotedBlock: string;
}

// Verbatim from extraction-gap-census-analyzer.md, gaps 1-12 plus the
// tool-is-right controls (A/B/C). Gap numbers below refer to that note's
// section numbering, not the RFC's X-AN-n item numbers.
const cases: readonly FidelityCase[] = [
  {
    fixture: '13-jsdoc-desc',
    file: 'src/main.ts',
    quotedBlock: `/**
 * Adds two numbers together.
 */
export function addNums(a: number, b: number): number {
  return a + b;
}`,
  },
  {
    fixture: '01-js-ext',
    file: 'src/helper.ts',
    quotedBlock: `export function helperFn(): string { return 'hi'; }`,
  },
  {
    fixture: '01-js-ext',
    file: 'src/main.ts',
    quotedBlock: `import { helperFn } from './helper.js';`,
  },
  {
    fixture: '07b-barrel-noext',
    file: 'src/main.ts',
    quotedBlock: `import { makeWidget } from './lib'`,
  },
  {
    fixture: '02-dynamic-import',
    file: 'src/main.ts',
    quotedBlock: `export async function run(): Promise<string> {
  const mod = await import('./worker.js');
  return mod.doWork();
}`,
  },
  {
    fixture: '10-export-star',
    file: 'src/widget.ts',
    quotedBlock: `export function makeWidget(): string { return 'widget'; }`,
  },
  {
    fixture: '10-export-star',
    file: 'src/lib.ts',
    quotedBlock: `export * from './widget';`,
  },
  {
    fixture: '10-export-star',
    file: 'src/main.ts',
    quotedBlock: `import { makeWidget } from './lib';`,
  },
  {
    // The census note's excerpt is a minimal illustrative subset
    // (`{ "compilerOptions": { "baseUrl": ".", "paths": {...} } }`); the
    // committed fixture is a full runnable tsconfig carrying the same
    // baseUrl/paths configuration plus the compiler options a real project
    // needs. The fidelity gate checks the load-bearing part the note
    // quotes: the paths-alias configuration itself.
    fixture: '12-tsconfig-paths',
    file: 'tsconfig.json',
    quotedBlock: `"baseUrl": ".", "paths": { "@utils/*": ["src/utils/*"] }`,
  },
  {
    fixture: '12-tsconfig-paths',
    file: 'src/main.ts',
    quotedBlock: `import { formatIt } from '@utils/format';`,
  },
  {
    fixture: '11-commonjs',
    file: 'src/helper.ts',
    quotedBlock: `export = function helperFn(): string { return 'hi'; };`,
  },
  {
    fixture: '11-commonjs',
    file: 'src/main.ts',
    quotedBlock: `import helperFn = require('./helper');
export function mainFn(): string { return helperFn(); }`,
  },
  {
    fixture: '03-app-collision',
    file: 'src/App.tsx',
    quotedBlock: `export function App(): string { return 'app-root'; }`,
  },
  {
    // Census note quotes without the trailing comma; the committed fixture
    // has one (both are the same enum declaration — trailing commas are
    // insignificant TS syntax). The gate checks member content, not
    // incidental trailing-comma style.
    fixture: '14-enum',
    file: 'src/status.ts',
    quotedBlock: `export enum Status { Active = 'active', Inactive = 'inactive'`,
  },
  {
    fixture: '14-enum',
    file: 'src/main.ts',
    quotedBlock: `import { Status } from './status';
export interface Job { id: string; status: Status; }
export function describe(j: Job): string { return j.status; }`,
  },
  {
    fixture: '16-arrow-const-fn',
    file: 'src/helper.ts',
    quotedBlock: `export const helperFn = (x: string): string => { return \`[\${x}]\`; };`,
  },
  {
    fixture: '16-arrow-const-fn',
    file: 'src/main.ts',
    quotedBlock: `import { helperFn } from './helper';
export function mainFn(): string { return helperFn('hi'); }`,
  },
  {
    fixture: '15-getter-setter',
    file: 'src/widget.ts',
    quotedBlock: `export class Widget {
  #name: string = 'x';
  get name(): string { return this.#name; }
  set name(value: string) { this.#name = value; }
  describe(): string { return this.name; }
}`,
  },
  {
    fixture: '08b-type-only-noext',
    file: 'src/main.ts',
    quotedBlock: `import type`,
  },
  {
    fixture: '09b-namespace-noext',
    file: 'src/main.ts',
    quotedBlock: `import * as`,
  },
  {
    fixture: '17-default-export',
    file: 'src/helper.ts',
    quotedBlock: `export default function helperFn`,
  },
  {
    fixture: '17-default-export',
    file: 'src/main.ts',
    quotedBlock: `import helperFn from './helper'`,
  },
];

// Normalizes whitespace runs to single spaces so a note's inline-quoted
// snippet (single line) still matches a fixture file's multi-line
// formatting of the same code — the fidelity gate cares about content
// identity, not incidental line-wrap choices between the census prose and
// the committed fixture file.
const normalizeWhitespace = (text: string): string => text.replace(/\s+/g, ' ').trim();

describe('RFC-TM-9 Q1 check (1) — census repro fidelity gate', () => {
  for (const testCase of cases) {
    it(`${testCase.fixture}/${testCase.file} contains its census-quoted block verbatim`, () => {
      const filePath = join(reprosDir, testCase.fixture, testCase.file);
      const actual = readFileSync(filePath, 'utf8');

      const normalizedActual = normalizeWhitespace(actual);
      const normalizedExpected = normalizeWhitespace(testCase.quotedBlock);

      assert.ok(
        normalizedActual.includes(normalizedExpected),
        `${testCase.fixture}/${testCase.file} does not contain the census-quoted block.\nExpected substring: ${normalizedExpected}\nActual file content: ${normalizedActual}`,
      );
    });
  }

  it('every fixture directory named in the census inventory exists under tests/ladder/repros-analyzer/', () => {
    // Corrected inventory (RFC-TM-9 §8, r2 disposition table F7): 20
    // analyzer fixture directories total, including the labeled
    // tool-is-right controls (08/08b/09/09b/17).
    const expectedDirs = [
      '01-js-ext',
      '02-dynamic-import',
      '03-app-collision',
      '04-sst-config',
      '04-sst-config-included',
      '04-sst-config-noref',
      '07-barrel-reexport',
      '07b-barrel-noext',
      '08-type-only-import',
      '08b-type-only-noext',
      '09-namespace-import',
      '09b-namespace-noext',
      '10-export-star',
      '11-commonjs',
      '12-tsconfig-paths',
      '13-jsdoc-desc',
      '14-enum',
      '15-getter-setter',
      '16-arrow-const-fn',
      '17-default-export',
    ];
    assert.equal(expectedDirs.length, 20);

    for (const dir of expectedDirs) {
      const marker = join(reprosDir, dir, 'tsconfig.json');
      assert.ok(
        (() => {
          try {
            readFileSync(marker, 'utf8');
            return true;
          } catch {
            return false;
          }
        })(),
        `missing fixture directory or its tsconfig.json: ${dir}`,
      );
    }
  });
});
