#!/usr/bin/env node
// RFC-TM-10 §12 (rfc-tm-10-diamond.md, D-LEG-12, Diamond DAG Q7) — the
// audit-table completeness check. The audit table
// (lib/typed-mind/docs/diagnostic-code-audit.md) must carry exactly one row
// per code the registry actually emits — no gap (an ungraded code), no
// overflow (a graded code the registry no longer emits). This mirrors
// check-codes.test.ts's own stability-test shape (extract the live set,
// deep-equal it against the frozen/graded set) applied to the audit table
// instead of to CHECK_CODES itself.
//
// Extraction reuses extract-check-codes.ts's compiled extractor directly (no
// second hand-rolled regex copy that could drift from the real one) via a
// child-process `node --experimental-strip-types` invocation, matching this
// script's own preferred-scripting-langs constraint of no new runtime
// dependency: importing a .ts module from a .mjs script needs either a
// loader flag or a subprocess; the subprocess keeps this script framework-
// free and mirrors check-diagnostic-jargon.mjs's own static-source-scan
// posture (a fresh Node process per run, no shared module cache surprises).

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));
const TYPED_MIND_ROOT = join(REPO_ROOT, 'lib', 'typed-mind');
const CHECKER_DIR = join(TYPED_MIND_ROOT, 'src', 'checker');
const PIPELINE_DIR = join(TYPED_MIND_ROOT, 'src', 'pipeline');
const AUDIT_TABLE_PATH = join(TYPED_MIND_ROOT, 'docs', 'diagnostic-code-audit.md');

class AuditCompletenessError extends Error {}

// Runs extractCheckCodes (the SAME extractor check-codes.test.ts uses for the
// registry's own stability test) in a throwaway Node subprocess, so this
// script always reflects the real extraction logic rather than a copy of it.
const extractLiveCodes = () => {
  const script = `
    const { extractCheckCodes } = await import(${JSON.stringify(`file://${join(CHECKER_DIR, 'extract-check-codes.ts')}`)});
    console.log(JSON.stringify(extractCheckCodes([${JSON.stringify(CHECKER_DIR)}, ${JSON.stringify(PIPELINE_DIR)}])));
  `;
  const stdout = execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', script], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return JSON.parse(stdout.trim());
};

// Parses the audit table's markdown rows: a leading `| \`code\` | ... |` row
// (excluding the header/separator rows). A row's Code cell may carry TWO
// codes separated by ` / ` (the slot-template pair, `checker/input-dto-not-found`
// / `checker/output-dto-not-found`, and the `-not-dto` sibling pair) — both
// are extracted as separate registered codes, matching how extractCheckCodes
// resolves the single `checker/${slot}...` template site to its two concrete
// strings.
const CODE_CELL_RE = /^\|\s*((?:`[a-z]+\/[a-z0-9-]+`(?:\s*\/\s*)?)+)\s*\|/;
const CODE_TOKEN_RE = /`([a-z]+\/[a-z0-9-]+)`/g;

const parseAuditTableCodes = (markdown) => {
  const codes = new Set();
  for (const line of markdown.split('\n')) {
    const cellMatch = CODE_CELL_RE.exec(line);
    if (cellMatch === null) {
      continue;
    }
    const cell = cellMatch[1];
    if (cell === undefined) {
      continue;
    }
    for (const tokenMatch of cell.matchAll(CODE_TOKEN_RE)) {
      const code = tokenMatch[1];
      if (code !== undefined) {
        codes.add(code);
      }
    }
  }
  return codes;
};

const main = () => {
  const liveCodes = new Set(extractLiveCodes());
  const auditedCodes = parseAuditTableCodes(readFileSync(AUDIT_TABLE_PATH, 'utf8'));

  const missingFromAudit = [...liveCodes].filter((code) => !auditedCodes.has(code)).sort();
  const extraInAudit = [...auditedCodes].filter((code) => !liveCodes.has(code)).sort();

  if (missingFromAudit.length === 0 && extraInAudit.length === 0) {
    console.log(`[check:diagnostic-code-audit] PASS — ${liveCodes.size} registered codes, all present in the audit table`);
    return;
  }

  console.error('[check:diagnostic-code-audit] FAIL — the audit table does not match the live registry:');
  if (missingFromAudit.length > 0) {
    console.error(`  ${missingFromAudit.length} code(s) emitted by the registry but missing an audit row (gap):`);
    for (const code of missingFromAudit) {
      console.error(`    ${code}`);
    }
  }
  if (extraInAudit.length > 0) {
    console.error(`  ${extraInAudit.length} code(s) in the audit table no longer emitted by the registry (overflow):`);
    for (const code of extraInAudit) {
      console.error(`    ${code}`);
    }
  }
  console.error(
    '[check:diagnostic-code-audit] fix: add a row for each missing code (grade it against lib/typed-mind/docs/diagnostic-style-guide.md), or remove a stale row for a retired code, in lib/typed-mind/docs/diagnostic-code-audit.md.',
  );
  throw new AuditCompletenessError(`${missingFromAudit.length + extraInAudit.length} audit-table completeness mismatch(es)`);
};

try {
  main();
} catch (error) {
  if (error instanceof AuditCompletenessError) {
    process.exit(1);
  }
  console.error('[check:diagnostic-code-audit] FAIL: unexpected error', error);
  process.exit(1);
}
