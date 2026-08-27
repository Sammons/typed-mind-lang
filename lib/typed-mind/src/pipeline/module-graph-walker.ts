// RFC-TM-3 §3.7 (rfc-tm-3-diamond.md) precursor, extracted for RFC-TM-7 §2
// (rfc-tm-7-diamond.md, I-8) — the shared static-import-graph walker. TM-3 Q5
// wrote `walkModuleGraph` inline in browser-boundary.test.ts as the I-8
// precursor (node:fs/node:path reach check over the pipeline's browser-safe
// entry). TM-7 Q2 extracts it here unchanged so it has exactly one
// implementation, consumed by BOTH the precursor test (which keeps its
// node:fs/node:path check) and the new scripts/check-browser-graph.mjs
// (which adds the bare-specifier-allowlist check the precursor did not
// carry — clause (b) of the I-8 gate).

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const BANNED_SPECIFIERS = ['node:fs', 'node:path'];

// Static import/export specifiers only: `import ... from '...'`,
// `export ... from '...'`, and bare `import '...'`. A lazy `require(...)`
// call is NOT a static import and is out of this walker's scope by design
// (doc §3.1) — it is invisible to bundlers and to browsers alike.
const STATIC_SPECIFIER_PATTERN = /^(?:import|export)\s[^;]*?from\s+['"]([^'"]+)['"]|^import\s+['"]([^'"]+)['"]/gms;

const staticSpecifiersOf = (source: string): string[] => {
  const specifiers: string[] = [];
  for (const match of source.matchAll(STATIC_SPECIFIER_PATTERN)) {
    const specifier = match[1] ?? match[2];
    if (specifier !== undefined) {
      specifiers.push(specifier);
    }
  }
  return specifiers;
};

export interface ModuleGraphReport {
  readonly visitedFiles: readonly string[];
  readonly externalSpecifiers: readonly string[];
  readonly bannedReaches: readonly { file: string; specifier: string }[];
}

export const walkModuleGraph = (entryFile: string): ModuleGraphReport => {
  const visited = new Set<string>();
  const externals = new Set<string>();
  const bannedReaches: { file: string; specifier: string }[] = [];
  const queue = [resolve(entryFile)];
  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || visited.has(file)) {
      continue;
    }
    visited.add(file);
    const source = readFileSync(file, 'utf8');
    for (const specifier of staticSpecifiersOf(source)) {
      if (specifier.startsWith('.')) {
        queue.push(resolve(dirname(file), specifier));
      } else {
        externals.add(specifier);
        if (BANNED_SPECIFIERS.includes(specifier)) {
          bannedReaches.push({ file, specifier });
        }
      }
    }
  }
  return {
    visitedFiles: [...visited].sort(),
    externalSpecifiers: [...externals].sort(),
    bannedReaches,
  };
};
