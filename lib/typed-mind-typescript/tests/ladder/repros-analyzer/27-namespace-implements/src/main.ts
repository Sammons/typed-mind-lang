// D-LEG-3 (rfc-tm-10-diamond.md §3, issue #61) — a namespace-qualified
// `implements` clause, the exact self-extraction shape
// (`CollectingParseConfigHost implements ts.ParseConfigFileHost`) that
// broke self-extraction. The converter must sanitize the dotted name into
// a representable stub rather than folding it verbatim into the `<:`
// sigil (which the grammar's entity_name token rejects at the first dot).
import * as ts from 'typescript';

export class CollectingParseConfigHost implements ts.ParseConfigFileHost {
  useCaseSensitiveFileNames = true;
  readDirectory(): readonly string[] {
    return [];
  }
  fileExists(): boolean {
    return false;
  }
  readFile(): string | undefined {
    return undefined;
  }
  getCurrentDirectory(): string {
    return '.';
  }
  onUnRecoverableConfigFileDiagnostic(): void {
    return;
  }
}
