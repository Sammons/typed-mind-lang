#!/usr/bin/env node
// RFC-TM-3 §3.6 / §5 Q5 (rfc-tm-3-diamond.md) — the shadow-comparison
// substrate: Quantum-local throwaway (committed then DELETED in its landing
// PR, output recorded in the PR body — the TM-2 Q3 lifecycle). Parses all 142
// corpus documents (68 scenarios + 7 scenarios/imports + 38 snippets + 28
// snippets-supplementary + naming-edge-cases-example.tmd) with BOTH stacks:
//
//   legacy: DSLParser.parse (which runs distribution + bidirectional merge)
//           followed by the validator's populateReferencedBy (validator.ts:1244+),
//           so referencedBy/importedBy are populated;
//   new:    TypedMindParser.parse (walk/attach + forward semantics) followed by
//           computeLinks (the Q4 LinkIndex).
//
// Projection rules (doc §3.6, stated so the comparison is falsifiable):
//   P1  duplicates project via insertion-order last-wins (parser.ts:122),
//       ignoring the legacy namingConflicts side channel;
//   P2  lookahead-converted ClassFileNodes (raw lacks the `#:` sigil — they
//       came from a `Name @ path:` File declaration) project to legacy
//       Class+path (§2.2 F2/F3); their imports/exports drop — the legacy
//       converted Class literal (parser.ts:226-235) carries neither key, so
//       legacy stores neither;
//   P3  UiComponent reverse fields reconstruct as declared ∪ derived, declared
//       order first, derived appended with dedupe (parser.ts:743-760 merge);
//   P4  presence normalization (the Q4 parity note generalized): absent
//       optional arrays ≡ [], absent optional scalars ≡ null, absent booleans
//       ≡ false — the substrate compares content, not representation (the
//       honest-fields table deliberately changed representation);
//   P5  referencedBy compares as {from, fromType} deduped by `from` and sorted
//       by `from`; legacy entries typed containedBy/affectedBy/consumedBy are
//       excluded — they are reverse-of-reverse REPORTING duplicates of the
//       reverse fields compared directly under P3 (the LinkIndex derives from
//       the thirteen forward fields only, doc §3.5);
//   P6  positions and raw text are out of scope (column:1 hardcoding vs real
//       spans is the divergence TM-3 exists to create); comments ARE compared;
//   P7  DtoFieldNode optionalityMarker projects to the legacy collapsed
//       boolean (isOptional, parser.ts:584);
//   P8  the new side's referencedBy is projected through the legacy REPORTING
//       gates before comparison, because the LinkIndex deliberately mirrors
//       only the population loops at validator.ts:1300+ (doc §3.5) and not the
//       validator's reporting quirks: (a) the VALID_REFERENCES from/to filter
//       (validator.ts:30-95, applied at :1256-1287) suppresses type-invalid
//       entries; (b) the population loop tracks extends/implements only for
//       `referencer.type === 'Class'` (validator.ts:1400-1409), so entries
//       produced by a genuine ClassFile's extends/implements are suppressed;
//       (c) a converted ClassFile's fromType projects to 'Class' (P2);
//   P9  the ClassFileNode constructor ALWAYS self-exports (§2.2 replication
//       clause, parser.ts:287), while a legacy explicit `-> [...]` REPLACES
//       exports (parser.ts:488) and loses the creation-time self-entry;
//       exports of genuine ClassFiles therefore compare with the self name
//       removed on BOTH sides, and self-references (from === target) drop from
//       referencedBy on BOTH sides — the underlying data (the explicit list)
//       still compares verbatim.
//
// Expected differences (doc §3.6's two sources, plus the two doc-recorded
// verdict/legacy-defect classes the corpus run surfaced, each cited):
//   S1 mechanical, from the PR #18 corpus manifest (q5-corpus-manifest.json —
//      the TM-2 Q3 manifest, byte-identical to git show bef489e): lines the
//      legacy parser DROPS converge; lines it MANGLES (classfile-trailing-colon
//      garbage paths, the `Name ! : Type` whitespace paths) diverge — each
//      divergence must be attributable to a manifest-listed line for that
//      file, classified under that line's manifest class;
//   S2 the replicated-quirk list (File→Class lookahead, distribution-before-
//      import-merge ordering, repeated-continuation last-wins) must NOT
//      diverge — a divergence there is a replication defect, stop-and-report;
//   D3 `semantics/illegal-continuation` verdict change (§2.2 F3 + FAQ Q7:
//      "illegal attachments are by definition in the expected-differences
//      set"): where the new pipeline refuses an attachment legacy stored
//      (the declared-Class `<- [...]` imports case), the loss is WITNESSED by
//      an illegal-continuation diagnostic in the entity's region — authorized
//      only with that witness. NOTE: the §2.2 zero-instance corpus census is
//      stale — scenario-32 declares six Classes with `<- [...]` imports;
//   D4 legacy-longform gaps: grammar-clean longform forms the legacy longform
//      parser drops or mangles while the new grammar parses them —
//      (a) `Name #: path { ... }` block-sigil blocks and quoted dependency
//      names (no legacy production: the block never matches, entity missing
//      legacy-side), (b) unquoted property values (legacy captures '' —
//      longform-parser.ts:215), (c) DTO field shapes hitting the legacy
//      type-'any' fallback (longform-parser.ts:249,256-258). Detected by the
//      exact legacy fallback fingerprint ('', 'any', or entity-missing with
//      the named header shape) — anything looser stays unexpected.
// Anything else = unexpected divergence = defect, stop-and-report (exit 1).

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DSLParser } from '../src/parser.ts';
import { computeLinks } from '../src/pipeline/link-index.ts';
import { TypedMindParser } from '../src/pipeline/typed-mind-parser.ts';
import { DSLValidator } from '../src/validator.ts';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = join(SCRIPT_DIR, '..');
const REPO_ROOT = join(PACKAGE_DIR, '..', '..');
const WASM_PATH = join(PACKAGE_DIR, 'grammar', 'grammar.wasm');
const MANIFEST_PATH = join(SCRIPT_DIR, 'q5-corpus-manifest.json');

const CORPUS_ROOTS = [
  'lib/typed-mind-test-suite/scenarios',
  'lib/typed-mind-static-website/snippets',
  'lib/typed-mind-static-website/snippets-supplementary',
];
const EXTRA_INPUTS = ['naming-edge-cases-example.tmd'];

// S2: files that pin the replicated quirks — they must end divergence-free
// after the stated projection (P2/P8/P9 are projection, not divergence).
const QUIRK_FILES = [
  'lib/typed-mind-test-suite/scenarios/scenario-58-classfile-vs-class-file.tmd',
  'lib/typed-mind-test-suite/scenarios/scenario-47-function-mixed-dependencies.tmd',
];

// Verbatim replica of DSLValidator.VALID_REFERENCES (validator.ts:30-95) for
// the P8 reporting gate.
const VALID_REFERENCES = {
  imports: {
    from: ['File', 'Class', 'ClassFile'],
    to: ['Function', 'Class', 'ClassFile', 'Constants', 'DTO', 'Asset', 'UIComponent', 'RunParameter', 'File', 'Dependency'],
  },
  exports: {
    from: ['File', 'ClassFile', 'Program', 'Dependency'],
    to: ['Function', 'Class', 'ClassFile', 'Constants', 'DTO', 'Asset', 'UIComponent', 'File'],
  },
  calls: { from: ['Function'], to: ['Function', 'Class'] },
  extends: { from: ['Class', 'ClassFile'], to: ['Class', 'ClassFile'] },
  implements: { from: ['Class', 'ClassFile'], to: ['Class', 'ClassFile'] },
  contains: { from: ['UIComponent'], to: ['UIComponent'] },
  affects: { from: ['Function'], to: ['UIComponent'] },
  consumes: { from: ['Function'], to: ['RunParameter', 'Asset', 'Dependency', 'Constants'] },
  input: { from: ['Function'], to: ['DTO'] },
  output: { from: ['Function'], to: ['DTO'] },
  entry: { from: ['Program'], to: ['File'] },
  containsProgram: { from: ['Asset'], to: ['Program'] },
  schema: { from: ['Constants'], to: ['Class', 'DTO'] },
};

const walkTmd = (dir, out) => {
  for (const entry of readdirSync(join(REPO_ROOT, dir), { withFileTypes: true })) {
    const rel = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTmd(rel, out);
    } else if (entry.name.endsWith('.tmd')) {
      out.push(rel);
    }
  }
};

const enumerateCorpus = () => {
  const files = [];
  for (const root of CORPUS_ROOTS) {
    walkTmd(root, files);
  }
  files.sort();
  for (const extra of EXTRA_INPUTS) {
    files.push(extra);
  }
  return files;
};

// ---------- projection helpers ----------
const arr = (value) => value ?? [];
const scalar = (value) => (value === undefined ? null : value);
const bool = (value) => value === true;
const stable = (value) => JSON.stringify(value);

const REVERSE_REPORTING_TYPES = new Set(['containedBy', 'affectedBy', 'consumedBy']);

const dedupeSortReferences = (references) => {
  const seen = new Set();
  const projected = [];
  for (const reference of references) {
    if (seen.has(reference.from)) {
      continue;
    }
    seen.add(reference.from);
    projected.push({ from: reference.from, fromType: scalar(reference.fromType) });
  }
  projected.sort((left, right) => (left.from < right.from ? -1 : left.from > right.from ? 1 : 0));
  return projected;
};

const mergeDeclaredDerived = (declared, derived) => {
  const merged = [...declared];
  for (const name of derived) {
    if (!merged.includes(name)) {
      merged.push(name);
    }
  }
  return merged;
};

const withoutName = (list, name) => list.filter((candidate) => candidate !== name);

// ---------- legacy side ----------
const projectLegacyEntity = (entity) => {
  const base = {
    type: entity.type,
    comment: scalar(entity.comment),
    // P5 + P9: drop reverse-of-reverse reporting entries and self-references.
    referencedBy: dedupeSortReferences(
      (entity.referencedBy ?? []).filter((reference) => !REVERSE_REPORTING_TYPES.has(reference.type) && reference.from !== entity.name),
    ),
  };
  switch (entity.type) {
    case 'Program':
      return {
        ...base,
        entry: entity.entry,
        version: scalar(entity.version),
        purpose: scalar(entity.purpose),
        exports: arr(entity.exports),
      };
    case 'File':
      return { ...base, path: entity.path, imports: arr(entity.imports), exports: arr(entity.exports), purpose: scalar(entity.purpose) };
    case 'Function':
      return {
        ...base,
        signature: entity.signature,
        description: scalar(entity.description),
        calls: arr(entity.calls),
        input: scalar(entity.input),
        output: scalar(entity.output),
        affects: arr(entity.affects),
        consumes: arr(entity.consumes),
        pending: arr(entity._dependencies),
      };
    case 'Class':
      return {
        ...base,
        path: scalar(entity.path),
        extends: scalar(entity.extends),
        implements: arr(entity.implements),
        methods: arr(entity.methods),
        imports: arr(entity.imports),
        purpose: scalar(entity.purpose),
      };
    case 'ClassFile':
      return {
        ...base,
        path: entity.path,
        extends: scalar(entity.extends),
        implements: arr(entity.implements),
        methods: arr(entity.methods),
        imports: arr(entity.imports),
        exports: withoutName(arr(entity.exports), entity.name), // P9
        purpose: scalar(entity.purpose),
      };
    case 'Constants':
      return { ...base, path: entity.path, schema: scalar(entity.schema), purpose: scalar(entity.purpose) };
    case 'DTO':
      return {
        ...base,
        purpose: scalar(entity.purpose),
        fields: arr(entity.fields).map((field) => ({
          name: field.name,
          type: scalar(field.type),
          description: scalar(field.description),
          optional: bool(field.optional),
        })),
      };
    case 'Asset':
      return { ...base, description: entity.description, containsProgram: scalar(entity.containsProgram) };
    case 'UIComponent':
      return {
        ...base,
        purpose: entity.purpose,
        root: bool(entity.root),
        contains: arr(entity.contains),
        containedBy: arr(entity.containedBy),
        affectedBy: arr(entity.affectedBy),
      };
    case 'RunParameter':
      return {
        ...base,
        paramType: entity.paramType,
        description: entity.description,
        defaultValue: scalar(entity.defaultValue),
        required: bool(entity.required),
        consumedBy: arr(entity.consumedBy),
      };
    case 'Dependency':
      return {
        ...base,
        purpose: entity.purpose,
        version: scalar(entity.version),
        exports: arr(entity.exports),
        importedBy: arr(entity.importedBy),
      };
    default:
      return { ...base, unknownLegacyType: entity.type };
  }
};

const runLegacy = (content) => {
  const parseResult = new DSLParser().parse(content);
  const validator = new DSLValidator({});
  // TS-private, runtime-accessible: the doc names populateReferencedBy as the
  // legacy pass the substrate runs so referencedBy/importedBy are populated.
  validator.populateReferencedBy(parseResult.entities);
  const projected = new Map();
  const declarationLines = [];
  for (const [name, entity] of parseResult.entities) {
    projected.set(name, projectLegacyEntity(entity));
    declarationLines.push({ name, line: entity.position.line });
  }
  return {
    projected,
    declarationLines,
    imports: parseResult.imports.map((statement) => ({ path: statement.path, alias: scalar(statement.alias) })),
  };
};

// ---------- new side ----------
const isConvertedClassFile = (entity) => {
  // P2: converted nodes came from `Name @ path:` declarations; genuine
  // ClassFiles declare with `#:` (shortform, inline-extends, or block sigil).
  return entity.kind === 'ClassFile' && !entity.raw.includes('#:');
};

const callBase = (call) => (call.includes('.') ? call.split('.')[0] : call);

// P8: which population-loop arms would produce a referencedBy entry for
// (from → target) legacy-side, given the legacy reporting quirks.
const legacyProducerTypes = (from, targetName, converted) => {
  const producers = [];
  const fromConverted = converted.has(from.name);
  if ((from.kind === 'File' || (from.kind === 'ClassFile' && !fromConverted)) && arr(from.imports).includes(targetName)) {
    producers.push('imports');
  }
  if (
    (from.kind === 'File' || from.kind === 'Program' || from.kind === 'Dependency' || (from.kind === 'ClassFile' && !fromConverted)) &&
    arr(from.exports).includes(targetName)
  ) {
    producers.push('exports');
  }
  if (from.kind === 'Function') {
    if (arr(from.calls).some((call) => callBase(call) === targetName)) {
      producers.push('calls');
    }
    if (from.input === targetName) {
      producers.push('input');
    }
    if (from.output === targetName) {
      producers.push('output');
    }
    if (arr(from.affects).includes(targetName)) {
      producers.push('affects');
    }
    if (arr(from.consumes).includes(targetName)) {
      producers.push('consumes');
    }
  }
  // Legacy tracks extends/implements only for referencer.type === 'Class'
  // (validator.ts:1400-1409): declared Classes and converted ClassFiles
  // qualify; genuine ClassFiles do not.
  if (from.kind === 'Class' || (from.kind === 'ClassFile' && fromConverted)) {
    if (from.extends === targetName) {
      producers.push('extends');
    }
    if (arr(from.implements).includes(targetName)) {
      producers.push('implements');
    }
  }
  if (from.kind === 'UIComponent' && arr(from.contains).includes(targetName)) {
    producers.push('contains');
  }
  if (from.kind === 'Program' && from.entry === targetName) {
    producers.push('entry');
  }
  if (from.kind === 'Asset' && from.containsProgram === targetName) {
    producers.push('containsProgram');
  }
  if (from.kind === 'Constants' && from.schema === targetName) {
    producers.push('schema');
  }
  return producers;
};

const projectNewReferences = (targetName, linkIndex, byName, converted) => {
  const legacyTypeOf = (name) => {
    const node = byName.get(name);
    if (node === undefined) {
      return undefined;
    }
    return converted.has(name) ? 'Class' : node.kind;
  };
  const targetType = legacyTypeOf(targetName);
  const kept = [];
  for (const reference of linkIndex.referencedBy(targetName)) {
    if (reference.from === targetName) {
      continue; // P9 self-reference drop (both sides)
    }
    const from = byName.get(reference.from);
    if (from === undefined) {
      continue;
    }
    const producers = legacyProducerTypes(from, targetName, converted);
    const fromType = legacyTypeOf(reference.from);
    const passes = producers.some((producer) => {
      const gate = VALID_REFERENCES[producer];
      return gate?.from.includes(fromType) === true && gate.to.includes(targetType);
    });
    if (passes) {
      kept.push({ from: reference.from, fromType });
    }
  }
  return dedupeSortReferences(kept);
};

const projectNewEntity = (entity, linkIndex, byName, converted) => {
  const base = {
    type: entity.kind,
    comment: scalar(entity.comment),
    referencedBy: projectNewReferences(entity.name, linkIndex, byName, converted),
  };
  switch (entity.kind) {
    case 'Program':
      return {
        ...base,
        entry: entity.entry,
        version: scalar(entity.version),
        purpose: scalar(entity.purpose),
        exports: arr(entity.exports),
      };
    case 'File':
      return { ...base, path: entity.path, imports: arr(entity.imports), exports: arr(entity.exports), purpose: scalar(entity.purpose) };
    case 'Function':
      return {
        ...base,
        signature: entity.signature,
        description: scalar(entity.description),
        calls: arr(entity.calls),
        input: scalar(entity.input),
        output: scalar(entity.output),
        affects: arr(entity.affects),
        consumes: arr(entity.consumes),
        pending: arr(entity.pendingDependencies),
      };
    case 'Class':
      return {
        ...base,
        path: null,
        extends: scalar(entity.extends),
        implements: arr(entity.implements),
        methods: arr(entity.methods),
        // §2.2 fusion ruling: ClassNode carries no imports; the legacy declared
        // Class initializes imports to [] (parser.ts:315) and STORES a
        // `<- [...]` continuation — that verdict-moving drop is authorized only
        // with the D3 illegal-continuation witness.
        imports: [],
        purpose: scalar(entity.purpose),
      };
    case 'ClassFile': {
      if (converted.has(entity.name)) {
        return {
          ...base,
          type: 'Class',
          path: entity.path,
          extends: scalar(entity.extends),
          implements: arr(entity.implements),
          methods: arr(entity.methods),
          imports: [], // P2: the legacy converted Class stores neither imports nor exports
          purpose: scalar(entity.purpose),
        };
      }
      return {
        ...base,
        path: entity.path,
        extends: scalar(entity.extends),
        implements: arr(entity.implements),
        methods: arr(entity.methods),
        imports: arr(entity.imports),
        exports: withoutName(arr(entity.exports), entity.name), // P9
        purpose: scalar(entity.purpose),
      };
    }
    case 'Constants':
      return { ...base, path: entity.path, schema: scalar(entity.schema), purpose: scalar(entity.purpose) };
    case 'DTO':
      return {
        ...base,
        purpose: scalar(entity.purpose),
        fields: arr(entity.fields).map((field) => ({
          name: field.name,
          type: scalar(field.type),
          description: scalar(field.description),
          optional: field.optionalityMarker !== 'none', // P7
        })),
      };
    case 'Asset':
      return { ...base, description: entity.description, containsProgram: scalar(entity.containsProgram) };
    case 'UIComponent':
      return {
        ...base,
        purpose: entity.purpose,
        root: bool(entity.root),
        contains: arr(entity.contains),
        containedBy: mergeDeclaredDerived(arr(entity.declaredContainedBy), linkIndex.containedBy(entity.name)), // P3
        affectedBy: mergeDeclaredDerived(arr(entity.declaredAffectedBy), linkIndex.affectedBy(entity.name)), // P3
      };
    case 'RunParameter':
      return {
        ...base,
        paramType: entity.paramType,
        description: entity.description,
        defaultValue: scalar(entity.defaultValue),
        required: bool(entity.required),
        consumedBy: [...linkIndex.consumedBy(entity.name)],
      };
    case 'Dependency':
      return {
        ...base,
        purpose: entity.purpose,
        version: scalar(entity.version),
        exports: arr(entity.exports),
        importedBy: [...linkIndex.importedBy(entity.name)],
      };
    default:
      return { ...base, unknownNewKind: entity.kind };
  }
};

const runNew = (parser, content) => {
  const outcome = parser.parse(content);
  const linkIndex = computeLinks(outcome.entities);
  // P1: last-wins projection over the duplicate-preserving list.
  const byName = new Map();
  for (const entity of outcome.entities) {
    byName.set(entity.name, entity);
  }
  const converted = new Set();
  for (const [name, entity] of byName) {
    if (isConvertedClassFile(entity)) {
      converted.add(name);
    }
  }
  const projected = new Map();
  const declarationLines = [];
  for (const [name, entity] of byName) {
    projected.set(name, projectNewEntity(entity, linkIndex, byName, converted));
    declarationLines.push({ name, line: entity.span.start.line, raw: entity.raw });
  }
  return {
    projected,
    declarationLines,
    imports: outcome.imports.map((statement) => ({ path: statement.path, alias: scalar(statement.alias) })),
    diagnostics: outcome.diagnostics,
  };
};

// ---------- comparison + classification ----------
const compareDocument = (file, legacy, fresh) => {
  const divergences = [];
  const names = new Set([...legacy.projected.keys(), ...fresh.projected.keys()]);
  for (const name of names) {
    const legacyEntity = legacy.projected.get(name);
    const newEntity = fresh.projected.get(name);
    if (legacyEntity === undefined) {
      divergences.push({ file, entity: name, field: '(entity)', shape: 'new-only', legacy: null, fresh: newEntity.type });
      continue;
    }
    if (newEntity === undefined) {
      divergences.push({ file, entity: name, field: '(entity)', shape: 'legacy-only', legacy: legacyEntity.type, fresh: null });
      continue;
    }
    const fields = new Set([...Object.keys(legacyEntity), ...Object.keys(newEntity)]);
    for (const field of fields) {
      if (stable(legacyEntity[field]) !== stable(newEntity[field])) {
        divergences.push({ file, entity: name, field, shape: 'field', legacy: legacyEntity[field], fresh: newEntity[field] });
      }
    }
  }
  if (stable(legacy.imports) !== stable(fresh.imports)) {
    divergences.push({ file, entity: '(imports)', field: 'imports', shape: 'field', legacy: legacy.imports, fresh: fresh.imports });
  }
  return divergences;
};

const buildManifestIndex = (manifest) => {
  const byFile = new Map();
  for (const [file, entries] of Object.entries(manifest.files)) {
    const lineClasses = new Map();
    for (const entry of entries) {
      if (entry.class === 'parses') {
        continue;
      }
      for (const line of entry.lines) {
        lineClasses.set(line, entry.class);
      }
    }
    byFile.set(file, lineClasses);
  }
  return byFile;
};

// D4 header fingerprints for entity shapes the legacy longform parser has no
// production for (block never matches, entity missing legacy-side).
const D4_BLOCK_SIGIL = /^[A-Za-z_][\w.-]*\s*#:\s*\S+\s*\{/; // `Name #: path {`
const D4_QUOTED_HEADER = /^[a-z]+\s+"[^"]+"\s*\{/i; // `dependency "@scope/pkg" {`

// D5 `legacy-silent-drop-grammar-clean`: shortform lines the grammar parses
// that the LIVE parser silently drops — the mirror set of the PR #18 manifest
// (which catalogued only lines the GRAMMAR errors on) and the I-3 defect class
// the doc's Problem section names ("lines the live parser silently drops").
// Each shape is verified against the live regex/loop:
//   (a) leading-underscore names — the shortform name groups require an
//       uppercase start; the grammar deliberately widened per TM-2's
//       S-GRAMMAR-4b (the manifest's 'parses' entry for
//       naming-edge-cases-example.tmd:47 records exactly this);
//   (b) a shortform declaration whose NAME is a longform keyword — the parse
//       loop's longform interception (parser.ts:85-91,
//       GENERAL_PATTERNS.LONGFORM_DECLARATION, parser-patterns.ts:101)
//       consumes the line and produces nothing;
//   (c) a Program version with non-[\d.] characters (prerelease suffix) — the
//       PROGRAM regex's version group is `v[\d.]+`, the whole regex fails;
//   (d) an Asset with an EMPTY description — the ASSET regex requires
//       `"([^"]+)"`.
// Field-level sibling: legacy null vs new '' on a string field — the legacy
// description-continuation regex also requires `"([^"]+)"`, so an empty
// `""` continuation is a silent no-op legacy-side (scenario-52:45).
const D5_LONGFORM_KEYWORD_NAME = /^(program|file|function|class|dto|component|asset|constants|parameter|import|dependency)\s/;
const isD5SilentDrop = (raw, projectedEntity) => {
  const name = raw.split(/\s/)[0] ?? '';
  if (name.startsWith('_')) {
    return true;
  }
  if (D5_LONGFORM_KEYWORD_NAME.test(raw)) {
    return true;
  }
  if (
    projectedEntity?.type === 'Program' &&
    projectedEntity.version !== null &&
    /[^\d.]/.test(String(projectedEntity.version).replace(/^v/, ''))
  ) {
    return true;
  }
  if (projectedEntity?.type === 'Asset' && projectedEntity.description === '') {
    return true;
  }
  return false;
};

const classifyDocument = (file, divergences, legacy, fresh, manifestIndex) => {
  const lineClasses = manifestIndex.get(file) ?? new Map();
  const legacyLinesSorted = [...legacy.declarationLines].sort((left, right) => left.line - right.line);
  const newLinesSorted = [...fresh.declarationLines].sort((left, right) => left.line - right.line);
  const regionIn = (sorted, name) => {
    const index = sorted.findIndex((declaration) => declaration.name === name);
    if (index === -1) {
      return undefined;
    }
    const start = sorted[index].line;
    const end = index + 1 < sorted.length ? sorted[index + 1].line : Number.POSITIVE_INFINITY;
    return { start, end };
  };
  const manifestClassInRegion = (region) => {
    if (region === undefined) {
      return undefined;
    }
    for (const [line, lineClass] of lineClasses) {
      if (line >= region.start && line < region.end) {
        return lineClass;
      }
    }
    return undefined;
  };
  // D3: entities whose NEW-side region carries an illegal-continuation witness.
  const d3Names = new Set();
  for (const diagnostic of fresh.diagnostics) {
    if (diagnostic.code !== 'semantics/illegal-continuation') {
      continue;
    }
    for (const declaration of newLinesSorted) {
      const region = regionIn(newLinesSorted, declaration.name);
      if (region !== undefined && diagnostic.span.start.line >= region.start && diagnostic.span.start.line < region.end) {
        d3Names.add(declaration.name);
      }
    }
  }
  const authorizedOneSideNames = new Set();
  const classified = divergences.map((divergence) => ({ ...divergence, class: undefined }));
  for (const divergence of classified) {
    if (divergence.shape === 'legacy-only' || divergence.shape === 'new-only') {
      const declarations = divergence.shape === 'legacy-only' ? legacy.declarationLines : fresh.declarationLines;
      const declaration = declarations.find((candidate) => candidate.name === divergence.entity);
      if (declaration !== undefined && lineClasses.has(declaration.line)) {
        divergence.class = lineClasses.get(declaration.line);
      } else if (divergence.shape === 'new-only' && declaration !== undefined) {
        const raw = declaration.raw ?? '';
        if (D4_BLOCK_SIGIL.test(raw) || D4_QUOTED_HEADER.test(raw)) {
          divergence.class = 'legacy-longform-gap';
        } else if (isD5SilentDrop(raw, fresh.projected.get(divergence.entity))) {
          divergence.class = 'legacy-silent-drop-grammar-clean';
        }
      }
      if (divergence.class !== undefined) {
        authorizedOneSideNames.add(divergence.entity);
      }
      continue;
    }
    // Field divergences: manifest line inside the entity's declaration region.
    divergence.class = manifestClassInRegion(regionIn(legacyLinesSorted, divergence.entity));
    if (divergence.class !== undefined) {
      continue;
    }
    // D3: the exact verdict-moving drop, witnessed.
    if (d3Names.has(divergence.entity) && divergence.shape === 'field') {
      divergence.class = 'illegal-continuation-verdict-change';
      continue;
    }
    // D4 fingerprints on both-side entities.
    if (divergence.field === 'signature' && divergence.legacy === '' && divergence.fresh !== '') {
      divergence.class = 'legacy-longform-gap';
      continue;
    }
    // D5 field-level sibling: the empty `""` description continuation.
    if (divergence.legacy === null && divergence.fresh === '') {
      divergence.class = 'legacy-silent-drop-grammar-clean';
      continue;
    }
    if (divergence.field === 'fields' && Array.isArray(divergence.legacy) && Array.isArray(divergence.fresh)) {
      const legacyAnyFallback =
        divergence.legacy.length === divergence.fresh.length &&
        divergence.legacy.every(
          (legacyField, index) =>
            legacyField.type === 'any' &&
            legacyField.description === null &&
            legacyField.optional === false &&
            legacyField.name === divergence.fresh[index].name,
        );
      if (legacyAnyFallback) {
        divergence.class = 'legacy-longform-gap';
      }
    }
  }
  // Cascade pass: list/reference fields whose delta names are exactly entities
  // already authorized as one-side-only (S1/D4) or D3-witnessed.
  const cascadeNames = new Set([...authorizedOneSideNames, ...d3Names]);
  for (const divergence of classified) {
    if (divergence.class !== undefined || divergence.shape !== 'field') {
      continue;
    }
    const namesOf = (value) => {
      if (!Array.isArray(value)) {
        return undefined;
      }
      return value.map((item) => (typeof item === 'string' ? item : (item?.from ?? stable(item))));
    };
    const legacyNames = namesOf(divergence.legacy);
    const freshNames = namesOf(divergence.fresh);
    if (legacyNames === undefined || freshNames === undefined) {
      continue;
    }
    const delta = [
      ...legacyNames.filter((name) => !freshNames.includes(name)),
      ...freshNames.filter((name) => !legacyNames.includes(name)),
    ];
    if (delta.length > 0 && delta.every((name) => cascadeNames.has(name))) {
      divergence.class = 'cascade-of-authorized-entity';
    }
  }
  return classified;
};

const main = async () => {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const manifestIndex = buildManifestIndex(manifest);
  const corpus = enumerateCorpus();
  if (corpus.length !== 142) {
    throw new Error(`corpus enumeration produced ${corpus.length} files, expected 142`);
  }
  const parser = await TypedMindParser.create({ wasmPath: WASM_PATH });

  const classCounts = new Map();
  const classFiles = new Map();
  const unexpected = [];
  const quirkViolations = [];
  let convergedClean = 0;
  let filesWithAuthorized = 0;

  for (const file of corpus) {
    const content = readFileSync(join(REPO_ROOT, file), 'utf8');
    const legacy = runLegacy(content);
    const fresh = runNew(parser, content);
    const divergences = classifyDocument(file, compareDocument(file, legacy, fresh), legacy, fresh, manifestIndex);
    if (divergences.length === 0) {
      convergedClean += 1;
    } else if (divergences.every((divergence) => divergence.class !== undefined)) {
      filesWithAuthorized += 1;
    }
    for (const divergence of divergences) {
      if (divergence.class === undefined) {
        unexpected.push(divergence);
        if (QUIRK_FILES.includes(file)) {
          quirkViolations.push(divergence);
        }
      } else {
        classCounts.set(divergence.class, (classCounts.get(divergence.class) ?? 0) + 1);
        const bucket = classFiles.get(divergence.class) ?? new Set();
        bucket.add(file);
        classFiles.set(divergence.class, bucket);
        if (process.env.Q5_DUMP_AUTHORIZED === '1') {
          console.log(`  AUTHORIZED[${divergence.class}] ${file} :: ${divergence.entity} :: ${divergence.field}`);
        }
      }
    }
  }

  console.log(`[q5-substrate] documents: ${corpus.length}`);
  console.log(`[q5-substrate] converged clean (zero divergence records): ${convergedClean}`);
  console.log(`[q5-substrate] files with only authorized divergences: ${filesWithAuthorized}`);
  console.log('[q5-substrate] authorized divergence records by class (records / files):');
  for (const [divergenceClass, count] of [...classCounts.entries()].sort()) {
    console.log(`  ${divergenceClass}: ${count} / ${classFiles.get(divergenceClass)?.size ?? 0}`);
  }
  console.log(`[q5-substrate] quirk-list files (${QUIRK_FILES.length}) unexpected divergences: ${quirkViolations.length}`);
  for (const violation of quirkViolations) {
    console.log(`  QUIRK VIOLATION ${stable(violation)}`);
  }
  console.log(`[q5-substrate] unexpected divergences: ${unexpected.length}`);
  for (const divergence of unexpected.slice(0, 80)) {
    console.log(
      `  UNEXPECTED ${divergence.file} :: ${divergence.entity} :: ${divergence.field} :: legacy=${stable(divergence.legacy)} new=${stable(divergence.fresh)}`,
    );
  }
  if (unexpected.length > 0 || quirkViolations.length > 0) {
    process.exitCode = 1;
    return;
  }
  console.log('[q5-substrate] RESULT: manifest-clean (0 unexpected divergences, 0 quirk-list violations)');
};

await main();
