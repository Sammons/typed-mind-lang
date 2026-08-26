import { copyFileSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { defineConfig } from 'tsup';

const require = createRequire(import.meta.url);

// RFC-TM-5 §2 (rfc-tm-5-diamond.md) — the bundled build must ship both wasm
// artifacts alongside dist-bundled/cli.js: grammar.wasm (the language) and
// web-tree-sitter.wasm (web-tree-sitter's own emscripten runtime, requested
// by its glue's locateFile hook — see TypedMindParserOptions.runtimeWasmPath
// in ../typed-mind/src/pipeline/typed-mind-parser.ts). web-tree-sitter stays
// bundled into cli.js (noExternal below, the doc's stated choice: one
// self-contained file, no node_modules in the vsix) and compensates via the
// explicit locateFile path rather than an `external` + adjacent-node_modules
// layout (Rejected Alternatives).
class BundledWasmCopyError extends Error {}

const copyWithSizeGuard = (source: string, destination: string, label: string): void => {
  if (!existsSync(source)) {
    throw new BundledWasmCopyError(`${label} not found at ${source}`);
  }
  copyFileSync(source, destination);
  const { size } = statSync(destination);
  if (size === 0) {
    throw new BundledWasmCopyError(`${label} copied to ${destination} but is empty`);
  }
  console.log(`[tsup.bundled.config] copied ${label} -> ${destination} (${size} bytes)`);
};

const copyBundledWasms = async (): Promise<void> => {
  const packageDir = import.meta.dirname;
  const outDir = join(packageDir, 'dist-bundled');

  // grammar.wasm: the core package's dev-layout build output
  // (lib/typed-mind/grammar/grammar.wasm, produced by its prebuild/pretest
  // wasm build — see ../typed-mind/scripts/build-wasm.mjs). Falls back to the
  // published-layout sibling-of-dist location so this also works against an
  // installed @sammons/typed-mind, not only the workspace dev layout.
  const typedMindPkgEntry = require.resolve('@sammons/typed-mind', { paths: [packageDir] });
  const typedMindPackageDir = dirname(dirname(typedMindPkgEntry));
  const grammarWasmCandidates = [join(typedMindPackageDir, 'grammar', 'grammar.wasm'), join(typedMindPackageDir, 'grammar.wasm')];
  const grammarWasmSource = grammarWasmCandidates.find((candidate) => existsSync(candidate));
  if (grammarWasmSource === undefined) {
    throw new BundledWasmCopyError(
      `grammar.wasm not found at ${grammarWasmCandidates.join(' or ')} — run \`pnpm run build\` in lib/typed-mind first`,
    );
  }
  copyWithSizeGuard(grammarWasmSource, join(outDir, 'grammar.wasm'), 'grammar.wasm');

  // web-tree-sitter.wasm: resolved through @sammons/typed-mind's own
  // resolution scope (web-tree-sitter is that package's dependency, not this
  // package's — pnpm's strict node_modules means it is not hoisted here).
  const webTreeSitterEntry = require.resolve('web-tree-sitter', { paths: [typedMindPackageDir] });
  const webTreeSitterWasmSource = join(dirname(webTreeSitterEntry), 'web-tree-sitter.wasm');
  copyWithSizeGuard(webTreeSitterWasmSource, join(outDir, 'web-tree-sitter.wasm'), 'web-tree-sitter.wasm');
};

// Bundled build configuration for VS Code extension
export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['cjs'],
  outDir: 'dist-bundled',
  dts: false,
  sourcemap: false,
  clean: true,
  bundle: true,
  platform: 'node',
  target: 'node18',
  noExternal: [/@sammons/, 'vscode-languageserver', 'vscode-languageserver-textdocument'],
  onSuccess: copyBundledWasms,
});
