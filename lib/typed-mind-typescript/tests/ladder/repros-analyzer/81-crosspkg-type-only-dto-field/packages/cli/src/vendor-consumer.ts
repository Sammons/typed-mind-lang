// The external CONTROL entrypoint for gap 81 (see rung-code-outline-cli.test.ts,
// `ensureFixture81ExternalStubPackage`). `@fixture/vendor` is a genuine
// installed-package shape under this package's node_modules, resolving with
// `isExternalLibraryImport: true` exactly like the workspace sibling next to it.
//
// No tsconfig `references` entry names it, so the analyzer's reverse-map finds
// no referenced project whose outDir contains it and leaves the edge external.
// This is what proves the fix classifies REFERENCED projects internal rather
// than classifying everything internal.
import type { VendorTag } from '@fixture/vendor';

export interface VendorRecord {
  tag: VendorTag;
}

export const describeVendor = (record: VendorRecord): string => {
  return `${record.tag}`;
};
