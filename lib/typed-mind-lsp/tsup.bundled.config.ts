import { defineConfig } from 'tsup';

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
});
