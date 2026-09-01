// Regression test for issue #36: the browser-side multi-field search must
// split on whitespace (`/\s+/`), not on the letter "s" (`/s+/`).
//
// The search JS now lives in static/client-js/search.js as raw browser JS
// (no template-literal wrapping), so the source file contains the regex
// spelled naturally: `/\s+/`. The second test exercises the full
// generateInteractiveRendererJS() pipeline end to end.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { InteractiveTypedMindRenderer } from './interactive-renderer.ts';

const SEARCH_JS_PATH = join(dirname(fileURLToPath(import.meta.url)), 'static', 'client-js', 'search.js');

describe('InteractiveTypedMindRenderer — multi-field search tokenization', () => {
  it('search.js source spells the whitespace-splitting regex correctly', () => {
    const source = readFileSync(SEARCH_JS_PATH, 'utf8');

    assert.ok(
      source.includes('query.toLowerCase().split(/\\s+/);'),
      'expected search.js to contain split(/\\s+/) — the correct whitespace regex',
    );

    assert.ok(
      !source.includes('query.toLowerCase().split(/s+/);'),
      'search.js contains split(/s+/) — the escape-dropped form that splits on the letter "s"',
    );
  });

  it('generateInteractiveRendererJS() embeds the whitespace regex intact — the browser-shipped source contains /\\s+/, not /s+/', () => {
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
    const tokenize = (query: string): string[] => query.toLowerCase().split(/\s+/);

    assert.deepEqual(tokenize('user profile service'), ['user', 'profile', 'service']);
    assert.deepEqual(tokenize('  leading   and trailing  '), ['', 'leading', 'and', 'trailing', '']);
    assert.deepEqual(tokenize('single'), ['single']);

    const words = tokenize('user service');
    assert.equal(words.length, 2, 'expected the query to split into 2 words on whitespace');
  });
});
