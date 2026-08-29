#!/usr/bin/env node
// RFC-TM-10 §11 (rfc-tm-10-diamond.md, D-LEG-11, Diamond DAG Q8) — the
// exact-text fixture / audit-table cross-validation gate. D-LEG-11's gating
// rule (per the frozen scope, carried unchanged) is MACHINE-CHECKED, not a
// comment convention: a fixture's asserted code+string pair must exactly
// match diagnostic-code-audit.md's disposed row for that code, or CI fails.
// This closes the "un-audited string slips through" failure mode I-15 exists
// to reject — a mis-cited, stale, or never-graded fixture now fails a
// standing check, not only a human-readable comment a future contributor
// could ignore.
//
// Parses lib/typed-mind/src/checker/exact-text-fixtures.test.ts (the file
// D-LEG-11's fixtures live in — one `describe('... checker/<code>', ...)`
// block per residual diagnostic class, each containing exactly one asserted
// `message` string and, for CheckerFinding-shaped codes, exactly one
// asserted `suggestion` string) and cross-validates against
// diagnostic-code-audit.md's own "Message text" column (added by this
// Quantum specifically so this gate has a ground truth to check against —
// the table's PASS/FIXED disposition columns alone never carried a stable
// literal for either disposition, per the table's own header: a PASS row
// cited only a file:line, and a FIXED row's "Fixed to" column is free-form
// change-description prose):
//   1. Every fixture's code must have an audit-table row (gap: an
//      ungraded/uncited code — the fixture cites a code the audit table
//      never covered).
//   2. The fixture's asserted `message` and the audit row's own "Message
//      text" cell must EACH be a real possible RENDERING of the SAME
//      message template — the live `message:` construction site at the
//      audit row's own File:line citation. "Rendering of a template" means:
//      the template's literal (non-`${...}`) segments appear in the
//      candidate string, in order, verbatim (see `isRenderingOfTemplate`).
//      Both sides are checked against the SAME template, which is what
//      makes this a true cross-validation rather than two independent
//      plausibility checks: if the fixture's prose drifts from the
//      template's own wording (a rewritten clause, a changed word), OR the
//      audit table's own Message text cell drifts, the mismatched side
//      fails this check while the other may still pass — surfacing exactly
//      which side is stale. Two DIFFERENT concrete VALUES landing in a
//      template's interpolation gaps (the audit table's illustrative
//      `'MyEntity'` vs. a fixture's real `'thing'`) are NOT a mismatch —
//      values are not compared, only the literal template shape — because
//      proving a fixture's VALUE is correct is the fixture's own
//      `node --test` run's job (against the real checker output), not this
//      script's.
//   3. As an ADDITIONAL diagnostic-only cross-check, the audit row's own
//      File:line citation is confirmed to resolve to a real producing
//      module under src/checker or src/pipeline that actually contains a
//      `message:` construction site near the cited line.
//
// `suggestion` has no independent column in the audit table and is
// therefore not cross-validated by this script — see the disclosed
// scope-boundary comment at its check site in main().
//
// This script does NOT re-derive whether a message is graded PASS/FIXED —
// that judgment is D-LEG-12's (Q7's) own, already landed. This script only
// proves the fixture's exact prose shape matches what the audit table
// records for that code, so a fixture can never silently cite a code the
// audit never covered, or drift out of step with the audit table's own
// graded text (or the audit table drift out of step with the live source).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url)))));
const TYPED_MIND_ROOT = join(REPO_ROOT, 'lib', 'typed-mind');
const FIXTURE_PATH = join(TYPED_MIND_ROOT, 'src', 'checker', 'exact-text-fixtures.test.ts');
const AUDIT_TABLE_PATH = join(TYPED_MIND_ROOT, 'docs', 'diagnostic-code-audit.md');

class GatingError extends Error {}

// --- fixture-file parsing ---

// Splits the fixture file into per-code blocks: each `describe('... `code`
// ...', ...)` heading (a plain string containing the code, per this file's
// own convention: `describe('RFC-TM-10 Q8 exact-text fixture: checker/foo',
// ...)`) opens a block that runs until the next `describe(` at the same
// nesting level or end of file. This is a line-oriented split (not a full
// parser), matching extract-check-codes.ts's / check-diagnostic-jargon.mjs's
// own static-regex-scan posture for this codebase's scripts.
const DESCRIBE_HEADING_RE = /^describe\(\s*(['"])(.*?)\1/;
const CODE_IN_HEADING_RE = /\b([a-z]+\/[a-z0-9-]+)\b/;
const MESSAGE_ASSERT_RE = /assert\.equal\(\s*[\w.[\]?]*\.message,\s*(['"])((?:(?!\1)[^\\]|\\.)*)\1/;
const SUGGESTION_ASSERT_RE = /assert\.equal\(\s*[\w.[\]?]*\.suggestion,\s*(['"])((?:(?!\1)[^\\]|\\.)*)\1/;

// Unescapes the subset of JS string escapes this fixture file's literals
// actually use (\' \" \\ \n) so the extracted text matches the RUNTIME
// string value, not its source-code spelling.
const unescapeJsString = (raw) => {
  return raw.replace(/\\(['"\\n])/g, (_match, char) => (char === 'n' ? '\n' : char));
};

const parseFixtureBlocks = (source) => {
  const lines = source.split('\n');
  const blocks = [];
  let current = null;

  for (const line of lines) {
    const headingMatch = DESCRIBE_HEADING_RE.exec(line.trim());
    if (headingMatch !== null) {
      const heading = headingMatch[2] ?? '';
      const codeMatch = CODE_IN_HEADING_RE.exec(heading);
      if (current !== null) {
        blocks.push(current);
      }
      current = { code: codeMatch?.[1], heading, bodyLines: [] };
      continue;
    }
    if (current !== null) {
      current.bodyLines.push(line);
    }
  }
  if (current !== null) {
    blocks.push(current);
  }
  return blocks;
};

const extractFixtures = () => {
  const source = readFileSync(FIXTURE_PATH, 'utf8');
  const blocks = parseFixtureBlocks(source);
  const fixtures = [];
  for (const block of blocks) {
    if (block.code === undefined) {
      continue; // a describe() block with no checker/pipeline code in its heading is not a D-LEG-11 fixture block
    }
    const body = block.bodyLines.join('\n');
    const messageMatch = MESSAGE_ASSERT_RE.exec(body);
    if (messageMatch === null) {
      throw new GatingError(
        `fixture block for '${block.code}' (heading: "${block.heading}") has no assert.equal(...message, "...") — every D-LEG-11 fixture block must pin exact message text`,
      );
    }
    const suggestionMatch = SUGGESTION_ASSERT_RE.exec(body);
    fixtures.push({
      code: block.code,
      heading: block.heading,
      message: unescapeJsString(messageMatch[2] ?? ''),
      suggestion: suggestionMatch === null ? undefined : unescapeJsString(suggestionMatch[2] ?? ''),
    });
  }
  return fixtures;
};

// --- audit-table parsing ---

// RFC-TM-10 Q8 added a "Message text" column between File:line and Shape
// (Code | File:line | Message text | Shape | Disposition | Fixed to), so a
// row is 6 cells. A code cell may carry a slot-template pair separated by
// ` / ` (mirrors check-diagnostic-code-audit.mjs's own
// CODE_CELL_RE/CODE_TOKEN_RE) — Q8's enumerated fixture set does not
// exercise a slot-pair row, but the parser stays consistent with the
// completeness script's own multi-code-per-row handling.
const AUDIT_ROW_RE = /^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/;
const CODE_TOKEN_RE = /`([a-z]+\/[a-z0-9-]+)`/g;

// The Message text cell is the row's own inline-code-quoted rendering
// (`` `Entity 'X' is exported by...` ``), OPTIONALLY followed by a
// parenthetical annotation (e.g. `checker/duplicate-name`'s "(plain
// multi-entity case...)" note about its second call site) that is NOT part
// of the message itself. Extracts only the leading backtick-code span,
// treating a `\`` inside the span (a message that itself quotes a grammar
// token in backticks, e.g. `syntax/missing`'s "Missing \`entity_name\`...")
// as an escaped backtick rather than the span's closing delimiter.
const LEADING_CODE_SPAN_RE = /^`((?:\\`|[^`])*)`/;
const unescapeBacktick = (value) => value.replace(/\\`/g, '`');

const parseAuditTable = (markdown) => {
  const rows = new Map();
  for (const line of markdown.split('\n')) {
    if (!line.startsWith('|')) {
      continue;
    }
    const match = AUDIT_ROW_RE.exec(line);
    if (match === null) {
      continue;
    }
    const [, codeCell, fileLineCell, messageTextCell, , dispositionCell, fixedToCell] = match;
    if (codeCell === undefined || codeCell === 'Code' || /^-+$/.test(codeCell)) {
      continue; // header / separator row
    }
    const codes = [...codeCell.matchAll(CODE_TOKEN_RE)].map((codeMatch) => codeMatch[1]);
    if (codes.length === 0) {
      continue;
    }
    const disposition = (dispositionCell ?? '').includes('FIXED') ? 'FIXED' : 'PASS';
    const codeSpanMatch = LEADING_CODE_SPAN_RE.exec((messageTextCell ?? '').trim());
    const messageText = codeSpanMatch === null ? (messageTextCell ?? '') : unescapeBacktick(codeSpanMatch[1] ?? '');
    for (const code of codes) {
      rows.set(code, {
        fileLine: fileLineCell ?? '',
        messageText,
        disposition,
        fixedTo: fixedToCell ?? '',
      });
    }
  }
  return rows;
};

// --- producing-module template lookup ---

// Resolves an audit row's File:line citation to { fileName, lines } — a row
// may cite 2+ lines (e.g. `check-duplicate-names.ts:44,57` for two call
// sites of the same code); every cited line is a candidate search anchor.
const findProducingModuleLines = (fileLineCitation) => {
  const match = /^([\w.-]+\.ts):(\d+(?:,\d+)*)/.exec(fileLineCitation);
  if (match === null) {
    return undefined;
  }
  const [, fileName, lineSpec] = match;
  const lines = (lineSpec ?? '').split(',').map((n) => Number.parseInt(n, 10));
  return { fileName, lines };
};

const readProducingModuleText = (fileName) => {
  const checkerPath = join(TYPED_MIND_ROOT, 'src', 'checker', fileName ?? '');
  const pipelinePath = join(TYPED_MIND_ROOT, 'src', 'pipeline', fileName ?? '');
  try {
    return readFileSync(checkerPath, 'utf8');
  } catch {
    try {
      return readFileSync(pipelinePath, 'utf8');
    } catch {
      return undefined;
    }
  }
};

// Finds the `message:` template belonging to a `code: '<code>'` construction
// site. Anchored on the CODE STRING rather than the audit table's own cited
// line number — line numbers drift as unrelated code lands above a
// construction site (confirmed: several D-LEG-11-enumerated codes' audit-row
// citations no longer match their live line after later Quantums' edits),
// but the code string itself is exactly what `extract-check-codes.ts`'s own
// extractor already anchors on for the SAME reason. Returns the template's
// raw source text between its delimiters (backtick or quote), `${...}`
// placeholders intact, searching within a short lookahead window after each
// `code:` occurrence (tolerates `message:` landing a few lines below
// `code:` inside one `addFinding({...})` object literal) — or undefined if
// no `message:` field is found near any occurrence of the code string.
const TEMPLATE_LITERAL_RE = /\bmessage:\s*`((?:[^`\\]|\\.)*)`/;
const STRING_LITERAL_RE = /\bmessage:\s*(['"])((?:(?!\1)[^\\]|\\.)*)\1/;
const LOOKAHEAD_LINES = 8;

// A same-file `const NAME = 'checker/foo';` binding — some producing
// modules (e.g. apply-suppressions.ts's `STALE_SUPPRESSION_CODE`) name their
// code string once and reference the constant at the `code:` site rather
// than repeating the literal, mirroring extract-check-codes.ts's own
// const-binding resolution for the identical reason.
const CONST_BINDING_RE = /\bconst\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*(?::\s*[^=]+)?=\s*(['"])((?:(?!\2)[^\\]|\\.)*)\2\s*;/g;

// Every line where `code:` resolves to the target code string, either as a
// direct literal (`code: 'checker/foo'`) or via a same-file const binding
// (`code: STALE_SUPPRESSION_CODE` resolved against
// `const STALE_SUPPRESSION_CODE = 'checker/foo';`).
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findCodeConstructionLines = (sourceText, code) => {
  const constNames = new Set();
  for (const match of sourceText.matchAll(CONST_BINDING_RE)) {
    if (match[1] !== undefined && match[3] === code) {
      constNames.add(match[1]);
    }
  }
  const escapedCode = escapeRegExp(code);
  const literalRe = new RegExp(`code:\\s*['"]${escapedCode}['"]`);
  const constRes = [...constNames].map((name) => new RegExp(`code:\\s*${escapeRegExp(name)}\\b`));
  const lines = sourceText.split('\n');
  const matchingLines = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    if (literalRe.test(line) || constRes.some((re) => re.test(line))) {
      matchingLines.push(i);
    }
  }
  return matchingLines;
};

const findMessageTemplateForCode = (sourceText, code) => {
  const lines = sourceText.split('\n');
  for (const lineIndex of findCodeConstructionLines(sourceText, code)) {
    const windowText = lines.slice(lineIndex, lineIndex + LOOKAHEAD_LINES).join('\n');
    const templateMatch = TEMPLATE_LITERAL_RE.exec(windowText);
    if (templateMatch?.[1] !== undefined) {
      return templateMatch[1];
    }
    const literalMatch = STRING_LITERAL_RE.exec(windowText);
    if (literalMatch?.[2] !== undefined) {
      return literalMatch[2];
    }
  }
  return undefined;
};

const findMessageTemplateForRow = (code, row) => {
  const citation = findProducingModuleLines(row.fileLine);
  if (citation?.fileName === undefined) {
    return { error: `File:line cell ("${row.fileLine}") could not be parsed` };
  }
  const sourceText = readProducingModuleText(citation.fileName);
  if (sourceText === undefined) {
    return { error: `cites '${citation.fileName}', which does not exist under src/checker or src/pipeline` };
  }
  const template = findMessageTemplateForCode(sourceText, code);
  if (template === undefined) {
    return { error: `no \`code: '${code}'\` construction site with a \`message:\` field found in ${citation.fileName}` };
  }
  return { template, fileName: citation.fileName };
};

// --- template-vs-rendering comparison ---

// Splits a template's raw source on `${...}` interpolation placeholders,
// returning the LITERAL segments in order — the prose the template's own
// author actually wrote, independent of whatever concrete value fills each
// gap between segments.
const literalSegmentsOf = (template) => {
  return template.split(/\$\{(?:[^{}]|\{[^{}]*\})*\}/);
};

// True when `candidate` is a possible rendering of `template`: every
// literal segment of the template appears in `candidate`, in order, with
// no segment's match position preceding the previous segment's end. This
// proves the candidate's PROSE matches the template's own wording verbatim
// — punctuation, clause order, backtick/quote placement — while leaving
// each interpolation gap's concrete value unconstrained.
const isRenderingOfTemplate = (candidate, template) => {
  let cursor = 0;
  for (const segment of literalSegmentsOf(template)) {
    const index = candidate.indexOf(segment, cursor);
    if (index === -1) {
      return false;
    }
    cursor = index + segment.length;
  }
  return true;
};

// --- main ---

const main = () => {
  const fixtures = extractFixtures();
  const auditRows = parseAuditTable(readFileSync(AUDIT_TABLE_PATH, 'utf8'));
  const problems = [];

  for (const fixture of fixtures) {
    const row = auditRows.get(fixture.code);
    if (row === undefined) {
      problems.push(
        `'${fixture.code}': fixture cites this code but diagnostic-code-audit.md has no row for it (gap — ungraded code fixture-bound)`,
      );
      continue;
    }

    const templateResult = findMessageTemplateForRow(fixture.code, row);
    if (templateResult.error !== undefined) {
      problems.push(`'${fixture.code}': audit row's File:line citation is unusable — ${templateResult.error}`);
      continue;
    }
    const { template, fileName } = templateResult;

    // THE gate, checked in both directions against the SAME live template:
    if (!isRenderingOfTemplate(row.messageText, template)) {
      problems.push(
        `'${fixture.code}': diagnostic-code-audit.md's Message text cell does not match the live \`message:\` template in ${fileName} (audit table is stale relative to source, disposition: ${row.disposition})\n    audit row: ${JSON.stringify(row.messageText)}\n    template:  ${JSON.stringify(template)}`,
      );
    }
    if (!isRenderingOfTemplate(fixture.message, template)) {
      problems.push(
        `'${fixture.code}': fixture's asserted message does not match the live \`message:\` template in ${fileName} (disposition: ${row.disposition})\n    fixture:  ${JSON.stringify(fixture.message)}\n    template: ${JSON.stringify(template)}`,
      );
    }

    // `suggestion` has no independent column in the audit table (D-LEG-12's
    // table records only `message` text; a FIXED row's "Fixed to" column is
    // free-form prose about the CHANGE, not a byte-exact suggestion string —
    // see diagnostic-code-audit.md's own header). A fixture asserting
    // `suggestion` is therefore NOT cross-validated against the audit table
    // by this gate; it is validated by the fixture's own `node --test` run
    // against the real `AstValidator`/`applySuppressions` output instead
    // (per no_snapshot_tests: a hand-authored literal, not a duplicated
    // string this script re-derives). This is a disclosed scope boundary,
    // not a silent gap: the header comment states it, and every one of
    // D-LEG-11's `checker/*` fixtures pairs its `suggestion` assertion with
    // a `message` assertion that DOES go through this gate.
  }

  if (problems.length === 0) {
    console.log(
      `[check:fixture-audit-gating] PASS — ${fixtures.length} exact-text fixture(s) cross-validated against diagnostic-code-audit.md`,
    );
    return;
  }

  console.error(`[check:fixture-audit-gating] FAIL — ${problems.length} fixture/audit-table mismatch(es):`);
  for (const problem of problems) {
    console.error(`  ${problem}`);
  }
  console.error(
    '[check:fixture-audit-gating] fix: update the fixture in lib/typed-mind/src/checker/exact-text-fixtures.test.ts, the "Message text" column in lib/typed-mind/docs/diagnostic-code-audit.md, or the producing module — whichever has drifted — so all three describe the same message template.',
  );
  throw new GatingError(`${problems.length} mismatch(es)`);
};

try {
  main();
} catch (error) {
  if (error instanceof GatingError) {
    process.exit(1);
  }
  console.error('[check:fixture-audit-gating] FAIL: unexpected error', error);
  process.exit(1);
}
