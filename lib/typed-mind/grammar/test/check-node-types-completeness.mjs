#!/usr/bin/env node
// RFC-TM-2 Q3 (rfc-tm-2-diamond.md §3, §4 "Q3 — Corpus proof + closure", review
// SD-CB-1: "node-types 'reviewed' is judgment" -> "Executable node-types diff
// script + checked-in inventory list (Q3)").
//
// Diffs the named-node set in the generated `src/node-types.json` against the
// checked-in inventory (node-types-inventory.json, derived from the doc's §1
// production inventory: E1-E11, C1-C15, D1-D4, H1-H12, P1-P7 rows). Fails
// (nonzero exit) on:
//   - a named node present in node-types.json but absent from every inventory
//     row (an undocumented/uninventoried node — an S-GRAMMAR-1 conservation
//     gap the other direction: the grammar grew a node the doc's inventory
//     never named).
//   - an inventory row naming a node that node-types.json does NOT contain
//     (a regression — a production the doc requires has gone missing).
//
// Unlike the Q3 corpus substrate script (run-corpus-substrate.mjs) and its
// manifest, THIS script and its inventory list are PERMANENT — SD-CB-1
// requires the node-types completeness check to stay executable, not a
// one-time judgment call. Wired into scripts/check-generated.mjs as step 6,
// running on the freshly-regenerated node-types.json from step 1 (before
// step 2's diff-gate gives up if src/ drifted).

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const GRAMMAR_DIR = join(SCRIPT_DIR, '..');
const NODE_TYPES_PATH = join(GRAMMAR_DIR, 'src', 'node-types.json');
const INVENTORY_PATH = join(SCRIPT_DIR, 'node-types-inventory.json');

class NodeTypesCompletenessError extends Error {}

const main = () => {
  const nodeTypes = JSON.parse(readFileSync(NODE_TYPES_PATH, 'utf8'));
  const generatedNamed = new Set(nodeTypes.filter((n) => n.named === true).map((n) => n.type));

  const inventory = JSON.parse(readFileSync(INVENTORY_PATH, 'utf8'));
  const inventoryNamed = new Set(Object.values(inventory.rows).flat());

  const undocumented = [...generatedNamed].filter((n) => !inventoryNamed.has(n)).sort();
  const missing = [...inventoryNamed].filter((n) => !generatedNamed.has(n)).sort();

  console.log(`[node-types-completeness] generated named nodes: ${generatedNamed.size}`);
  console.log(`[node-types-completeness] inventory-listed nodes: ${inventoryNamed.size}`);

  if (undocumented.length === 0 && missing.length === 0) {
    console.log('[node-types-completeness] PASS: generated named-node set exactly matches the checked-in inventory');
    return;
  }

  if (undocumented.length > 0) {
    console.error(
      `[node-types-completeness] FAIL: ${undocumented.length} named node(s) in src/node-types.json are not covered by any row in ${INVENTORY_PATH}:`,
    );
    for (const n of undocumented) console.error(`  + ${n}`);
  }
  if (missing.length > 0) {
    console.error(
      `[node-types-completeness] FAIL: ${missing.length} node(s) named in ${INVENTORY_PATH} are missing from the generated src/node-types.json:`,
    );
    for (const n of missing) console.error(`  - ${n}`);
  }
  throw new NodeTypesCompletenessError(`${undocumented.length} undocumented + ${missing.length} missing named node(s)`);
};

try {
  main();
} catch (error) {
  if (error instanceof NodeTypesCompletenessError) {
    console.error(`[node-types-completeness] FAIL: ${error.message}`);
  } else {
    console.error(`[node-types-completeness] FAIL: ${error.message}`);
  }
  process.exit(1);
}
