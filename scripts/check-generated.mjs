#!/usr/bin/env node
// RFC-TM-1 (rfc-tm-1-diamond.md) leaf L4.
//
// Seat contract (inherited obligation on TM-2): TM-2's replacement body performs the
// regenerate-and-diff logic for parser.c / grammar.json / node-types.json (the tree-sitter
// generated artifacts under lib/typed-mind/grammar/) AND invokes the `tree-sitter test` grammar
// corpus — this is where S-CI-1's "grammar tests run inside `pnpm run ci`" clause executes.
// TM-3 extends the body to the <Kind>Base skeletons.
//
// The gate's SEAT in `validate` is TM-1's deliverable; its teeth arrive with the artifacts they
// guard. Until TM-2 lands, this script is an explicit no-op.

console.log('[check:generated] no generated artifacts yet (gate armed; populated by RFC-TM-2)');
process.exit(0);
