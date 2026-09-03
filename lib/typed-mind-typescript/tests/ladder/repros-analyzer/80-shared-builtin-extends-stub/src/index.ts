// Corpus: sammons/code-outline-cli packages/cli — `CLIArgumentError extends
// Error` (src/cli-argument-parser.ts:45) and `FileProcessorError extends
// Error` (src/file-processor.ts:13). The `Error` builtin stub is created
// ONCE (ensureBuiltinExtendsStub is idempotent), but EVERY ClassFile whose
// module extends it folds the stub name into its own `exports` list
// (typescript-to-typedmind-converter.ts:1469). Two such modules therefore
// both claim to export `Error`, and the checker fires
// `checker/multi-exported`.
import { CliArgumentParser } from './cli-argument-parser.ts';
import { FileProcessor } from './file-processor.ts';

export const run = (): string => {
  return new CliArgumentParser().parse() + new FileProcessor().process();
};
