import { Language, Parser, type Tree } from 'web-tree-sitter';

export interface TreeSitterParserOptions {
  wasmPath?: string;
  wasmBytes?: Uint8Array;
  runtimeWasmPath?: string;
}

export class TreeSitterParser {
  readonly #parser: Parser;
  readonly #language: Language;

  private constructor(parser: Parser, language: Language) {
    this.#parser = parser;
    this.#language = language;
  }

  static async create(grammarSource: string | Uint8Array, options?: TreeSitterParserOptions): Promise<TreeSitterParser> {
    if (options?.runtimeWasmPath === undefined) {
      await Parser.init();
    } else {
      const runtimeWasmPath = options.runtimeWasmPath;
      await Parser.init({ locateFile: () => runtimeWasmPath });
    }
    const language = await Language.load(grammarSource);
    const parser = new Parser();
    parser.setLanguage(language);
    return new TreeSitterParser(parser, language);
  }

  parse(source: string): Tree {
    const tree = this.#parser.parse(source);
    if (tree === null) {
      throw new Error('TreeSitterParser.parse(): tree-sitter returned no tree');
    }
    return tree;
  }

  getLanguage(): Language {
    return this.#language;
  }
}
