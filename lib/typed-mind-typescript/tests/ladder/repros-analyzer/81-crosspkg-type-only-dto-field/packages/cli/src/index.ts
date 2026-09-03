// Corpus: sammons/code-outline-cli packages/cli/src/cli-argument-parser.ts:4
// (`import type { OutputFormat } from '@sammons/code-outline-parser'`) and
// file-processor.ts:4 (`NodeInfo`). A pnpm `workspace:*` sibling resolves
// through a node_modules SYMLINK to the package's built `dist/index.d.ts`,
// so `resolveImportPath` (typescript-analyzer.ts:1805) classifies it as
// external on BOTH clauses (`isExternalLibraryImport === true` and
// `resolvedPath.includes('node_modules')`). The sibling package is never
// traversed, so `OutputFormat`/`NodeInfo` never become entities and the
// DTO fields typed by them emit `checker/dto-field-unknown-type`.
import type { NodeInfo, OutputFormat } from '@fixture/core';

export interface CliOptions {
  format: OutputFormat;
  depth: number;
}

export interface ProcessedFile {
  file: string;
  outline: NodeInfo | null;
}

export const describeOptions = (options: CliOptions, processed: ProcessedFile): string => {
  return `${options.format}:${options.depth}:${processed.file}`;
};
