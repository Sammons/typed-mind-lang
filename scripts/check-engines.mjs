#!/usr/bin/env node
// RFC-TM-4 §3 (rfc-tm-4-diamond.md, S-CORE-3 packaging) — named check asserting
// every non-private package.json under lib/ carries `engines.node: >=24.0.0`.
// The five currently-published packages (core, cli, lsp, renderer, typescript)
// are the ones this bumps; the check is written generically over "every
// non-private package" so a future sixth published package is caught by
// construction rather than needing a second manual bump.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const LIB_DIR = join(REPO_ROOT, 'lib');
const REQUIRED_ENGINE = '>=24.0.0';

class EnginesCheckError extends Error {}

const listPackageJsonPaths = () => {
  return readdirSync(LIB_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(LIB_DIR, entry.name, 'package.json'))
    .filter((path) => existsSync(path));
};

const main = () => {
  const packagePaths = listPackageJsonPaths();
  if (packagePaths.length === 0) {
    throw new EnginesCheckError(`no package.json files found under ${LIB_DIR}`);
  }

  const violations = [];
  const checkedPublished = [];
  for (const packagePath of packagePaths) {
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    if (packageJson.private === true) {
      continue;
    }
    checkedPublished.push(packageJson.name);
    const engineNode = packageJson.engines?.node;
    if (engineNode !== REQUIRED_ENGINE) {
      violations.push(`${packageJson.name} (${packagePath}): engines.node is ${JSON.stringify(engineNode)}, expected "${REQUIRED_ENGINE}"`);
    }
  }

  if (violations.length > 0) {
    throw new EnginesCheckError(
      `RFC-TM-4 §3 requires engines.node "${REQUIRED_ENGINE}" on every published package:\n` +
        violations.map((line) => `  - ${line}`).join('\n'),
    );
  }

  console.log(
    `[check:engines] PASS — ${checkedPublished.length} published packages carry engines.node "${REQUIRED_ENGINE}": ${checkedPublished.join(', ')}`,
  );
};

try {
  main();
} catch (error) {
  if (error instanceof EnginesCheckError) {
    console.error(`[check:engines] FAIL: ${error.message}`);
  } else {
    console.error('[check:engines] FAIL:', error);
  }
  process.exit(1);
}
