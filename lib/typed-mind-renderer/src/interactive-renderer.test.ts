// Regression test for issue #36: `generateInteractiveRendererJS` embeds the
// browser-side multi-field search source inside a PLAIN (non-raw) template
// literal. A plain template literal drops a single backslash at parse time
// for any escape it doesn't recognize (`\s` -> `s`), so the previous source
// spelling `query.toLowerCase().split(/\s+/)` shipped to the browser as
// `split(/s+/)` — the shipped search tokenized on runs of the letter "s",
// not on whitespace. Fixed by doubling the backslash in source
// (`split(/\\s+/)`): the outer template literal's escape processing
// consumes one backslash, leaving the correct `/\s+/` in the JS string the
// browser actually receives (verified directly by invoking
// `generateInteractiveRendererJS()` and inspecting the embedded regex
// source below).
//
// A `biome-ignore lint/suspicious/noUselessEscapeInString` sits on the
// source line: Biome's `noUselessEscapeInString` autofix re-strips this
// same backslash on every `--write` pass (the third recurrence of this
// clobber class — the same defect shape previously hit `\d` and other
// escaped character classes, fixed once already at main's 3b3f6e64) because
// it sees a doubled backslash inside what looks like plain string content
// and does not know it must survive one more layer of template-literal
// unescaping to reach the regex the browser runs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { InteractiveTypedMindRenderer } from './interactive-renderer.ts';

const SOURCE_PATH = join(dirname(fileURLToPath(import.meta.url)), 'interactive-renderer.ts');

describe('InteractiveTypedMindRenderer — multi-field search tokenization', () => {
  it('the performAdvancedSearch source line spells the whitespace-splitting regex with the doubled backslash the outer template literal requires', () => {
    const source = readFileSync(SOURCE_PATH, 'utf8');

    // The correct source spelling must be present verbatim — two literal
    // backslashes, since this line sits inside generateInteractiveRendererJS()'s
    // outer template literal, which will consume one of them.
    assert.ok(
      source.includes('query.toLowerCase().split(/\\\\s+/);'),
      'expected performAdvancedSearch to spell split(/\\\\s+/) in source (doubled backslash) so the outer template literal delivers /\\s+/ to the browser',
    );

    // Neither the single-backslash form (pre-fix, collapses to /s+/ once
    // embedded) nor the fully-escape-dropped form may appear.
    assert.ok(
      !source.includes('query.toLowerCase().split(/\\s+/);'),
      'performAdvancedSearch regressed to the single-backslash source form, which the outer template literal collapses to /s+/',
    );
    assert.ok(
      !source.includes('query.toLowerCase().split(/s+/);'),
      'performAdvancedSearch regressed to the escape-dropped split(/s+/) source form',
    );
  });

  it('generateInteractiveRendererJS() embeds the whitespace regex intact — the browser-shipped source contains /\\s+/, not /s+/', () => {
    // Exercises the real code path end to end: builds the renderer (no
    // graph set — getGraphData() degrades to empty entities/links/errors,
    // which is fine; this test only cares about the generated JS text) and
    // calls the private generator to inspect the actual JS string the
    // browser would receive, not just the .ts source spelling.
    const renderer = new InteractiveTypedMindRenderer({});
    const embeddedJs = (renderer as unknown as { generateInteractiveRendererJS: () => string }).generateInteractiveRendererJS();

    assert.ok(
      embeddedJs.includes('query.toLowerCase().split(/\\s+/);'),
      'the browser-shipped JS must contain the intact whitespace regex split(/\\s+/)',
    );
    assert.ok(
      !embeddedJs.includes('query.toLowerCase().split(/s+/);'),
      'the browser-shipped JS must not contain the escape-dropped split(/s+/)',
    );
  });

  it('the whitespace-splitting regex tokenizes multi-word search queries by whitespace, not by the letter "s"', () => {
    // Mirrors performAdvancedSearch's `query.toLowerCase().split(/\s+/)`
    // exactly — exercised directly (not through the browser bundle) so the
    // regex's actual behavior is pinned, not just its source spelling.
    const tokenize = (query: string): string[] => query.toLowerCase().split(/\s+/);

    assert.deepEqual(tokenize('user profile service'), ['user', 'profile', 'service']);
    assert.deepEqual(tokenize('  leading   and trailing  '), ['', 'leading', 'and', 'trailing', '']);
    assert.deepEqual(tokenize('single'), ['single']);

    // The defect regex (`/s+/`, missing the backslash) would instead split
    // on literal runs of "s" — e.g. "user service" contains no run of two-
    // or-more "s" characters, so it would NOT split at all under the
    // defect pattern. Assert the correct regex actually splits here.
    const words = tokenize('user service');
    assert.equal(words.length, 2, 'expected the query to split into 2 words on whitespace');
  });
});
