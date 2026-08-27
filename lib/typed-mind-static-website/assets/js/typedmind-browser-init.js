// RFC-TM-7 §2 (rfc-tm-7-diamond.md, S-CONS-WEB-1) — the playground's module
// script. Replaces the deleted vendored regex parser
// (assets/js/typedmind-parser-browser.js): awaits the tsc-emitted browser
// entry (assets/dist-browser/browser.js), constructs it with the same-origin
// wasm paths, exposes window.typedMindBrowser = { check(source), parse(source) }
// for typedmind-monaco-simple.js to consume, and dispatches a
// `typedmind-ready` event once construction finishes. All paths are
// same-origin (no CDN, no bundler) per the doc's Q5 offline answer.
import { TypedMindBrowser } from '../dist-browser/browser.js';

(async () => {
  const instance = await TypedMindBrowser.create({
    wasmPath: 'assets/grammar.wasm',
    // web-tree-sitter's own runtime wasm (distinct from the grammar wasm
    // above) is resolved by the import map to the same-origin vendored
    // web-tree-sitter.js; that file's own findWasmBinary() locates
    // web-tree-sitter.wasm next to it by default same-directory URL
    // resolution (typed-mind-parser.ts's TypedMindParserOptions doc comment),
    // which holds here because both files are vendored into the same
    // assets/ directory — runtimeWasmPath is not needed on this layout.
  });

  window.typedMindBrowser = {
    check: (source) => instance.check(source),
    parse: (source) => instance.parse(source),
  };

  window.dispatchEvent(new CustomEvent('typedmind-ready'));
})().catch((error) => {
  console.error('Failed to initialize TypedMind browser runtime:', error);
});
