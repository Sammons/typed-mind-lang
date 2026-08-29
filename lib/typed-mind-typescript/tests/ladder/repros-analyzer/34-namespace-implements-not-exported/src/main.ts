// issue #80 (rfc-tm-10-diamond.md follow-up) — D-LEG-3's namespace-qualified
// `implements` fix (issue #61) makes a class like the real
// `CollectingParseConfigHost` (typescript-analyzer.ts) PARSABLE, but does not
// make it EXPORTED. A module-internal class that implements a
// namespace-qualified interface and is never exported from its own file is
// a real, un-exported ClassNode — `checkClassAndFunctionExports`
// (RFC-TM-4, frozen) correctly flags it, a TRUE statement, not a false
// positive. This fixture proves the general shape (not module-private,
// confirming the checker's rule is doing its job) while
// `CollectingParseConfigHost` itself was fixed by exporting it from its own
// file (typescript-analyzer.ts) — the same one-line fix this fixture's
// exported sibling class demonstrates clears the flag.
import * as ts from 'typescript';

// Not exported — the exact shape that raised checker/class-not-exported.
class InternalParseConfigHost implements ts.ParseConfigFileHost {
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

// Consumes the internal class so it is not also flagged as dead code by
// an unrelated check — the fixture isolates class-not-exported specifically.
export function makeHost(): InternalParseConfigHost {
  return new InternalParseConfigHost();
}
