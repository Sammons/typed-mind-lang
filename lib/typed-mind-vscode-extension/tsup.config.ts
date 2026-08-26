import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/extension.ts'],
  format: ['cjs'],
  external: ['vscode'],
  noExternal: ['vscode-languageclient'],
  sourcemap: true,
  clean: true,
  bundle: true,
  platform: 'node',
  target: 'node16',
  // Fix vscode import issues
  esbuildOptions(options) {
    options.mainFields = ['main', 'module'];
    options.conditions = ['node'];
  },
});
