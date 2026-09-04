import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  ClassFileNode,
  ClassNode,
  ConstantsNode,
  DependencyNode,
  DtoFieldNode,
  DtoNode,
  type EntityKind,
  type EntityNode,
  FileNode,
  FunctionNode,
  ProgramNode,
  parseTypeExprText,
  type Span,
  SuppressionNode,
  SyntaxEmitter,
  TypeDefNode,
  type TypeExprNode,
} from '@sammons/typed-mind';
import { mapStructuralSegments } from './type-text-segments.ts';
import type {
  ConversionError,
  ConversionOptions,
  ConversionResult,
  ConversionWarning,
  ParsedClass,
  ParsedExport,
  ParsedFunction,
  ParsedImport,
  ParsedInterface,
  ParsedModule,
  SstHandlerReference,
  SuppressionReason,
  TypeScriptProjectAnalysis,
} from './types.ts';
import { createEntityName } from './types.ts';

// RFC-TM-6 §3 (rfc-tm-6-diamond.md, M8 disposition) — converter-built nodes
// have no source text, so every node shares one zero-width synthetic span.
// I-6 (token-accurate diagnostic spans) governs positions derived from real
// source; this converter emits no source-backed diagnostics, so I-6 does not
// apply here by declaration — the column-1 tripwire's scope (lib/typed-mind
// src/checker, src/emitter, src/pipeline) must not extend to this package.
const SYNTHETIC_SPAN: Span = { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } };

// RFC-TM-6 §3 — the converter pre-sorts its synthetic entity list into the
// legacy private emitter's eight-bucket section order (Program, Dependency,
// File, ClassFile, Class, Function, DTO, Constants) before emission, so
// checked-in `.tmd` diffs keep their structure even though the shared
// SyntaxEmitter (unlike the now-deleted private emitter) has no notion of
// section grouping — it emits entities in list order, blank-line separated.
const LEGACY_SECTION_ORDER: readonly EntityKind[] = ['Program', 'Dependency', 'File', 'ClassFile', 'Class', 'Function', 'DTO', 'Constants'];

const sortIntoLegacySectionOrder = (entities: readonly EntityNode[]): EntityNode[] => {
  const rank = new Map(LEGACY_SECTION_ORDER.map((kind, index) => [kind, index]));
  return [...entities].sort(
    (a, b) => (rank.get(a.kind) ?? LEGACY_SECTION_ORDER.length) - (rank.get(b.kind) ?? LEGACY_SECTION_ORDER.length),
  );
};

// RFC-TM-10 §4 (rfc-tm-10-diamond.md, D-LEG-4, issue #60, LEAD RULING:
// collapse never truncate) — the analyzer (X-AN-6) extracts a JSDoc
// comment's full multi-paragraph text correctly; the converter previously
// emitted that raw multi-line text verbatim into a single-line grammar
// production (the `string` token excludes newlines, `grammar.js:1159`),
// desyncing the parser on the first embedded blank line. This pure
// function collapses to the grammar's single-line shape WITHOUT truncating
// to a sentence: split on the JSDoc paragraph boundary (a blank line), keep
// the ENTIRE first paragraph however long, whitespace-normalize it to one
// line. Every purpose/description assignment site routes through this.
//
// issue #113 — the grammar's `string` token is `/"[^"\n]*"/`
// (grammar.js:1209): a literal `"` inside the description text is
// structurally UNREPRESENTABLE in `.tmd` — there is no escape production
// (confirmed: no `\"` handling anywhere in grammar.js). A JSDoc comment
// containing a quoted phrase (`/** A "needs you" item... */`) emitted
// verbatim breaks the description's own closing quote, corrupting every
// line after it (confirmed against the real slat-harness corpus:
// `NeedsItem % "A "needs you" item..."` desyncs the parser at the second
// `"`). Same fix shape as the newline case above (collapse, never
// truncate, no grammar change): swap every embedded double quote for a
// single quote — `'` is NOT excluded by the `string` token, unlike `"`,
// so this is a meaning-preserving substitution the grammar can actually
// carry, not a strip. `\n` is already handled by the paragraph-split
// above; `"` needed its own pass because it is a grammar delimiter, not
// whitespace.
const escapeDescriptionQuotes = (text: string): string => text.replace(/"/g, "'");

const collapseDescription = (raw: string): string => {
  const [firstParagraph] = raw.split(/\n\s*\n/);
  return escapeDescriptionQuotes((firstParagraph ?? '').replace(/\s+/g, ' ').trim());
};

// RFC-TM-10 follow-up (issue #77) — `extractInputDTO`/`extractOutputDTO`
// classify a type as DTO-like BY KIND (`isDTOLikeType`, D-LEG-1/D-LEG-5), but
// the grammar's `input_name`/`output_name` productions
// (`grammar.js:811,815`) accept ONLY a bare `entity_name` token
// (`grammar.js:1155`, `/[A-Za-z_]\w*/`). A DTO-like type is not always a
// bare identifier: a union with `null`/`undefined`
// (`HydratedTenantRecord | null`), an array suffix (`OrganizationApiKey[]`),
// a generic-argument suffix (`MiddlewareHandler<IngestEnv>`,
// `Record<string, unknown>`), or a bare function type (`() => void`) are all
// DTO-like by `isDTOLikeType`'s elimination branch but illegal in the
// bare-identifier-only slot. This guard is the mechanical check that
// prevents assigning any of those shapes to `input`/`output`: exactly the
// same regex the grammar itself uses for `entity_name`, applied before the
// emission, not re-derived heuristically.
const isBareEntityName = (type: string): boolean => /^[A-Za-z_]\w*$/.test(type);

// issue #86 follow-up — the classification guards above are whitespace-exact
// (`isBareEntityName`'s `/^[A-Za-z_]\w*$/` is anchored, and `isDTOLikeType`'s
// branches test prefixes/suffixes), but a type authored across multiple lines
// in the source arrives here with its raw newlines and indentation intact:
// `Promise<\n  WidgetList\n>` strips to `\n  WidgetList\n`, which
// `isBareEntityName` correctly rejects, silently dropping the `output` edge
// for a type that resolves fine when authored on one line.
//
// Collapsing every whitespace run to a single space and trimming is the same
// normalization `collapseDescription` applies to JSDoc text and issue #86
// applied to signature text — it is meaning-preserving for a TYPE, because
// TypeScript treats inter-token whitespace as insignificant everywhere a type
// can appear. It is deliberately NOT a truncation: a multi-line union stays a
// multi-line union's full text, just on one line, so a shape that is genuinely
// not a bare entity name (`Widget | null`) still fails the guard afterwards,
// exactly as it does today.
const collapseTypeWhitespace = (type: string): string => type.replace(/\s+/g, ' ').trim();

// Fixture 90 — a union type alias authored multi-line. TypeScript allows an
// OPTIONAL LEADING `|` before the first member, and members are conventionally
// separated across lines with `//` comments interleaved between them. All three
// of those are pure authoring style with no semantic content, but each one
// desyncs a downstream consumer that assumes the single-line form:
// a leading `|` produces an empty first union member, an interior newline
// breaks the one-line `X = <type>` alias production, and a `//` comment run
// leaks source commentary into the emitted type text.
//
// This normalizes the three away, leaving the exact text the single-line
// authoring of the same type would have produced. Comment stripping runs
// BEFORE whitespace collapse so a `//` line comment cannot swallow the
// remainder of the union once the newline that terminated it is gone.
// Fixtures 92 / 93 — the text-level twin of the analyzer's
// `parenthesizeTypeQueries`. A DTO field declared inside a TYPE ALIAS BODY
// (`type ModelDeps = { fetchImpl: typeof fetch }`) never reaches that AST
// walk: the alias's whole body is carried as one text blob and split into
// fields by `parseInlineObjectLiteralToFields`, so the field's type is a
// STRING by the time anything can normalize it.
//
// `sanitizeFieldType` is the single choke point both DTO field paths pass
// through, so the parenthesization lands here. Same rationale as the AST
// walk: the TypedMind grammar already accepts `(typeof X)` and only fails
// on the bare form, so wrapping is all that is needed.
//
// An ALREADY-parenthesized `(typeof X)` (what the AST walk produces, and
// what issue #83's corpus shape `(typeof CHECK_CODES)[number]` is authored
// as) must not be double-wrapped — the negative lookbehind for `(` is what
// keeps this function idempotent across both paths.
//
// LITERAL-AWARENESS (PR #158 review, comment 22136): the rewrite runs only on
// STRUCTURAL runs via `mapStructuralSegments`. A string-literal type's value
// is its exact characters, so an unanchored regex would rewrite
// `'typeof x'` into `'(typeof x)'` — a silently WRONG type that still parses
// cleanly, so no checker diagnostic would catch it.
export const parenthesizeTypeQueryText = (type: string): string =>
  mapStructuralSegments(type, (segment) => segment.replace(/(?<!\()\btypeof\s+([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)/g, '(typeof $1)'));

// Collapse a multi-line type text to the exact bytes the same type authored on
// ONE line would have produced. Shared by the type-alias lane (fixture 90) and
// the DTO-field lane (fixture 91), which hit the identical defect from two
// directions, so the normalization must agree between them.
//
// LITERAL-AWARENESS (PR #158 review, comment 22136): same reasoning as
// `parenthesizeTypeQueryText`, and the same remedy PR #156's review applied to
// the core's `normalizeOpaqueWhitespace`. A literal member whose own text
// carries brackets and spaces (`'E ( bad )' | Foo`) must survive byte-for-byte;
// a text-blind regex chain would rewrite it to `'E (bad)'` and change the
// type's meaning.
export const collapseToSingleLineType = (type: string): string =>
  mapStructuralSegments(type, (segment) =>
    segment
      .replace(/\s+/g, ' ')
      // A dangling comma before a closer (`remove: string[], )`) is legal
      // multi-line TypeScript but not legal once collapsed onto one line.
      .replace(/,\s*([)\]}])/g, '$1')
      // Drop the space an opener or a closer inherits from the collapsed line
      // break, so the result is byte-identical to the same type authored on one
      // line. Both sides are needed: the opener's space comes from the newline
      // AFTER `(`, the closer's from the newline BEFORE `)`.
      .replace(/([([])\s+/g, '$1')
      .replace(/\s+([)\]])/g, '$1'),
  ).trim();

const normalizeUnionAliasText = (type: string): string => {
  // Comment stripping is literal-aware for the same reason the rewrites are:
  // `'https://x'` and `` `a/*b*/c` `` are literal text, not commentary, and a
  // blind strip would eat the rest of the union at the first `//` inside a
  // string-literal member.
  const withoutComments = mapStructuralSegments(type, (segment) => segment.replace(/\/\/[^\n]*/g, '\n').replace(/\/\*[\s\S]*?\*\//g, ' '));
  const collapsed = collapseToSingleLineType(withoutComments);

  const withoutLeadingBar = collapsed.startsWith('|') ? collapsed.slice(1).trim() : collapsed;

  return parenthesizeTypeQueryText(withoutLeadingBar);
};

// issue #72 (rfc-tm-10-diamond.md §5's tracked follow-up) — an inline
// object-literal type (`{ current?: string }`) has no enclosing
// Class/Interface name to resolve against, so D-LEG-1's `isDTOLikeType`
// excludes it from `input`/`output` (a disclosed loss: the type stays
// visible in `entity.signature` text, but the machine-checked graph edge is
// gone). This predicate identifies that exact shape BEFORE `isDTOLikeType`
// runs, so `extractInputDTO`/`extractOutputDTO` can route it through
// `synthesizeInlineDTO` (below) instead of the exclusion — the same
// "detect the special shape ahead of the general classifier" pattern
// `isDTOLikeType`'s own `"`-prefix / `{`-prefix branches already use.
const isInlineObjectLiteralType = (type: string): boolean => type.trim().startsWith('{') && type.trim().endsWith('}');

// Fixture 74 (itp-maker `functions/procore-worker.ts:149-165`) — issue
// #72's `isInlineObjectLiteralType` requires the trimmed text to BOTH
// start with `{` and end with `}`, so it says false for the single most
// common real shape carrying an inline record: the literal wrapped in a
// generic, `Array<{ ... }>` / `ReadonlyArray<{ ... }>` / `Promise<{ ...
// }>`. Such a field skipped the `synthesizeInlineDTO` routing and fell
// through to `sanitizeFieldType`, whose last statement is `.trim()` — so
// the raw source text, newlines included, landed in the emitted field
// line and desynced the grammar's single-line field production.
//
// This splits a generic wrapper into its constructor and its single type
// argument when — and only when — that argument is itself a bare inline
// object literal. The brace/angle depth walk is what keeps a nested
// `Array<{ a: Map<string, number> }>` from splitting at the inner `>`.
// A wrapper with 2+ type arguments (`Record<string, { a: 1 }>`) is out of
// scope here and keeps its existing behavior: this returns undefined and
// the caller stays on the original path.
const splitGenericWrappedObjectLiteral = (type: string): { wrapper: string; inner: string } | undefined => {
  const trimmed = type.trim();
  const open = trimmed.indexOf('<');

  if (open <= 0 || !trimmed.endsWith('>')) {
    return undefined;
  }

  const wrapper = trimmed.slice(0, open).trim();

  if (!/^[A-Za-z_]\w*$/.test(wrapper)) {
    return undefined;
  }

  const inner = trimmed.slice(open + 1, -1).trim();

  if (!isInlineObjectLiteralType(inner)) {
    return undefined;
  }

  // Reject a multi-argument generic: scan the argument text at depth zero
  // for a `,` separator. `Record<string, { a: 1 }>` must not be treated as
  // a single-argument wrapper around `{ a: 1 }`.
  let depth = 0;

  for (const character of inner) {
    if (character === '{' || character === '<' || character === '(' || character === '[') {
      depth += 1;
    } else if (character === '}' || character === '>' || character === ')' || character === ']') {
      depth -= 1;
    } else if (character === ',' && depth === 0) {
      return undefined;
    }
  }

  return { wrapper, inner };
};

// Two-pass architecture data structures
interface ExportRegistry {
  [moduleSpecifier: string]: {
    defaultExport?: string;
    namedExports: Set<string>;
    // The subset of `namedExports` that this module RE-exports from a sibling
    // (`export { a } from './other.ts'`) rather than declaring itself. Kept as
    // a parallel set because `namedExports` holds bare strings with no
    // provenance, and `registerModuleExports` is the only point that sees a
    // ParsedExport's `source` alongside the declaring module's own path.
    // `convertExports` already branches on the same distinction via
    // `isReExport`; this carries that fact forward to the one consumer that
    // reads the registry instead of the ParsedExport list.
    reExportedNames: Set<string>;
    namespaceExport?: string;
    filePath: string;
  };
}

interface EntityInfo {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'constant';
  sourceFile: string;
  exported: boolean;
}

interface EntityRegistry {
  functions: Map<string, EntityInfo>;
  classes: Map<string, EntityInfo>;
  interfaces: Map<string, EntityInfo>;
  types: Map<string, EntityInfo>;
  constants: Map<string, EntityInfo>;
  files: Map<string, EntityInfo>;
}

export class TypeScriptToTypedMindConverter {
  // RFC-TM-6 §3 (rfc-tm-6-diamond.md) — the shared SyntaxEmitter replaces the
  // converter's now-deleted private TMD-content emitter.
  private readonly emitter = new SyntaxEmitter();
  private readonly options: Required<ConversionOptions>;
  private readonly errors: ConversionError[] = [];
  private readonly warnings: ConversionWarning[] = [];
  private readonly entities: EntityNode[] = [];
  private readonly entityNames = new Set<string>();
  // issue #72 (tm10-inc2), adversarial-review blocker fix (PR #84) — names
  // reserved by `reserveNamedTypeEntityNames` for a module's own
  // interface/type-alias/enum declarations, held SEPARATELY from
  // `entityNames`. These names are NOT yet real entities (unlike
  // `entityNames`, which means "an entity with this name already exists in
  // `this.entities`"), so the later `convertInterfaceToDTO`/
  // `convertTypeAliasToDTO`/`convertEnumToTypeDef` call that actually
  // claims the name must not treat its OWN reservation as a collision.
  // `reserveSynthesizedDTOName` still consults this set (in addition to
  // `entityNames`) so a synthesized DTO correctly avoids a name a
  // same-module interface/type-alias/enum has reserved but not yet
  // converted into a real entity.
  private readonly reservedNamedTypeNames = new Set<string>();
  // RFC-TM-10 Q3 amendment (lead-authorized, X-CONV-4 extension) — a
  // top-level function that collided on its bare name and was renamed to
  // `<baseName>__<name>` by `convertFunction`. `convertExports` consults
  // this so a File/ClassFile's `exports:` list names the FUNCTION'S ACTUAL
  // emitted entity name, not its raw source name — otherwise the export
  // list would reference a name no entity carries, producing a dangling
  // reference the checker would flag. Keyed by `${modulePath}::${rawName}`
  // (NOT bare raw name alone — the live webhookstorage clone has four
  // different modules each independently exporting a function named
  // `handler`, so a bare-name key would collide across modules the same
  // way the entity names themselves did). Scoped to the current `convert()`
  // call, cleared in `reset()` like every other per-run map here.
  private readonly functionNameRemap = new Map<string, string>();
  // SST-referenced-module orphan flags (issue #52's own PR #74 closing
  // comment; lead-authorized amendment extending X-AN-11's mechanism) —
  // maps a module's absolute `filePath` to its FINAL File/ClassFile entity
  // name. Unlike `functionNameRemap`, a File-like entity's name is not
  // always derivable from its module path alone (`convertToClassFile`
  // names the entity after the module's PRIMARY CLASS, not the module's
  // base filename), so this is recorded at each construction site
  // (`convertToSeparateEntities`'s FileNode, `convertToClassFile`'s
  // ClassFileNode) rather than computed on demand.
  private readonly fileEntityNameByModulePath = new Map<string, string>();
  // RC-E (issue #107) — a sibling of `fileEntityNameByModulePath`, keyed by
  // the module's project-relative, extension-stripped path instead of its
  // absolute `filePath`. This is the exact key shape `moduleGraphResolution`
  // stores its `resolvedTarget` values under (see that field's own comment:
  // "project-root-relative... run through `stripKnownSourceExtension`"), so
  // `foldDynamicImportsIntoSourceFiles` can resolve a dynamic `import()`
  // specifier straight from `moduleGraphResolution` to a File/ClassFile
  // entity name without reconstructing an absolute path (which would risk
  // an extension mismatch between the analyzer's resolved target and the
  // module's own `filePath`). Populated at the same two construction sites
  // as `fileEntityNameByModulePath`.
  private readonly fileEntityNameByRelativePath = new Map<string, string>();
  // RC-B (ladder-diagnostic-disposition-2026-08-29.md rank 2, issue #100) —
  // `convertToSeparateEntities` used to derive `fileEntityName` from
  // BASENAME ONLY (`createEntityName(`${baseName}File`)`), with no
  // directory disambiguation, and its `if (!this.entityNames.has(...))`
  // guard silently skipped creating a second FileNode when two modules in
  // different directories shared a basename (`db/events.ts` vs
  // `routes/events.ts`) — the LOSING module's File entity never existed,
  // and its functions became ownerless. Which module "won" depended on
  // traversal order, not a fixed rule. `reserveFileEntityNames` (below)
  // is a whole-run pre-pass, mirroring `reserveNamedTypeEntityNames`'s own
  // "reserve everything up front, across the WHOLE module list" shape:
  // it groups every candidate module by basename FIRST (an order-
  // independent set operation), and only a basename with more than one
  // module gets disambiguated — deterministically, by directory path, not
  // by which module happened to convert first. Keyed by `module.filePath`
  // (absolute), consulted by `convertToSeparateEntities` in place of its
  // own ad hoc `${baseName}File` computation.
  private readonly reservedFileEntityNameByModulePath = new Map<string, string>();
  private readonly dependencies = new Map<string, DependencyNode>();
  private readonly externalTypeToPackage = new Map<string, string>(); // Maps external types to their package
  private entryPoints = new Set<string>();
  // X-CONV-5 — builtin `extends` targets (`Error`, `Map`, `EventEmitter`,
  // ...) synthesized as stub ClassNode entities on demand. Keyed by
  // entity name so a target referenced from multiple classes/modules gets
  // exactly one stub, following the existing Node-builtins purpose-map
  // precedent (`derivePurpose`'s `nodeBuiltins` table).
  private readonly builtinExtendsStubNames = new Set<string>();
  // RFC-TM-10 §3 (rfc-tm-10-diamond.md, D-LEG-3, issue #61, LEAD RULING: no
  // new sigil). A namespace-qualified `implements` target (`ts.ParseConfigFileHost`)
  // is unrepresentable by the grammar's `entity_name` token (no `.` accepted)
  // — `ensureNamespaceImplementsStub` sanitizes it to a valid identifier and
  // synthesizes a bare stub ClassNode, mirroring `builtinExtendsStubNames`'s
  // idempotent one-stub-per-name discipline so a target referenced by
  // multiple classes shares one stub. Deliberately UNBOUNDED (unlike the
  // curated `KNOWN_AMBIENT_EXTENDS_TARGETS` allowlist below) because
  // `implements` targets are structural — they can never introduce a real
  // inheritance edge the checker's unknown-base-class/circular-inheritance
  // rules police.
  private readonly namespaceImplementsStubNames = new Set<string>();
  // RFC-TM-9 §4 (rfc-tm-9-diamond.md, X-CONV-2) — predicts, at Phase 1
  // registration time, whether a `types`-registry name will end up a
  // DtoNode (object-like type alias, `imports.to`-legal) or a TypeDefNode
  // (enum, or non-object-like alias, `imports.to`-ILLEGAL per TM-8's frozen
  // scope — "No other reference verb changes" beyond `schema.to`,
  // rfc-tm-8-diamond.md §5). `resolveImportToEntity` consults this so a
  // File's `imports`/`exports` list never names a TypeDef, which the
  // checker rejects outright (`checker/reference-to-illegal`). The
  // prediction reuses `isObjectLikeType` — the SAME pure function Phase 2's
  // `convertTypeAliasToDTO` branches on — so it cannot diverge from the
  // actual emitted kind. Enums always predict TypeDef (X-CONV-2 never
  // routes an enum to DTO).
  private readonly typesRegistryPredictedKind = new Map<string, 'DTO' | 'TypeDef'>();

  // RC-A (ladder-diagnostic-disposition-2026-08-29.md rank 1, issue #99) —
  // `registerModuleExports`/`resolveImportToEntity` used to register/look up
  // `exportRegistry` under a fixed enumeration of GUESSED specifier shapes
  // (bare filename, `types/`/`services/`-prefixed forms only). Any relative
  // import crossing into an arbitrary subdirectory (`./pages/Home.js`,
  // `./commands/tenant.js`, ...) was never one of the guessed shapes, so its
  // reference edge silently dropped — no diagnostic, just a missing
  // `<-`/`->` entry. `TypeScriptAnalyzer` already resolves every static
  // import/re-export/dynamic-import specifier via `ts.resolveModuleName`
  // (X-AN-1) and records the outcome in `analysis.moduleGraph` — this map
  // indexes that SAME resolved-edge list by `(sourceModule, specifier)` so
  // the converter can reuse the analyzer's own resolution instead of
  // re-deriving it by guessing. `sourceModule`/`resolvedTarget` are both
  // project-root-relative (matching `getRelativePath`'s own output), so the
  // resolved target doubles as the exact `exportRegistry` key
  // `registerModuleExports` writes under (see that method's own comment).
  private readonly moduleGraphResolution = new Map<string, string>();

  private static moduleGraphResolutionKey(sourceModule: string, specifier: string): string {
    return `${sourceModule} ${specifier}`;
  }

  // issue #88 — the X-CONV-2 TypeDef exclusion above was applied ONLY at
  // `resolveImportToEntity` (the `imports.to`/`exports.to` shared arm this
  // comment already covers is the import side; the SAME grammar-legality
  // gap exists at two more call sites this converter also owns: exporting a
  // TypeDef name (`exports.to`, valid-references.ts:39 has no TypeDef slot
  // either) and routing a TypeDef into `input`/`output` (`isDTOLikeType`,
  // `input`/`output.to` accept only DTO — check-function-graph.ts:44). This
  // shared predicate lets all three call sites (`resolveImportToEntity`,
  // `convertExports`, `isDTOLikeType`) apply the identical exclusion so a
  // predicted-TypeDef name can never reach a reference-legality slot the
  // grammar has not opened for it.
  private isPredictedTypeDef(name: string): boolean {
    return this.typesRegistryPredictedKind.get(name) === 'TypeDef';
  }

  // Gap 69/67 — the interface-lane twin of `typesRegistryPredictedKind`.
  // Once `convertInterface` routes a method-bearing interface to
  // `convertInterfaceToClass`, an interface name no longer implies DTO kind,
  // so every call site that PREDICTS an interface's emitted kind must predict
  // the same split the Phase-2 dispatcher performs. Computed ONCE by
  // `predictInterfaceKinds` (after Phase 1 has indexed every module's
  // interfaces) and then read by BOTH the dispatcher and `isDTOLikeType`, so
  // prediction and emission are not merely consistent — they are literally
  // the same value. This is stronger than the anti-divergence argument
  // `typesRegistryPredictedKind` makes for `isObjectLikeType`, and it has to
  // be: the shape decision now depends on the heritage chain, which is not a
  // pure function of a single `ParsedInterface`.
  private readonly interfacesPredictedClassKind = new Set<string>();

  // Program-wide interface index, keyed by bare name, filled by
  // `collectModuleEntities`. Backs the heritage walk in
  // `resolveInterfaceIsMethodBearing`: a parent named in an `extends` clause
  // is looked up here to decide whether it contributes methods.
  //
  // Bare-name keying inherits the same last-write-wins flatness
  // `entityRegistry.interfaces`/`.classes` already have (two same-named
  // interfaces in different modules collide). That is pre-existing structural
  // flatness, not a new category of bug — noted here so the limitation is on
  // record at the place that depends on it.
  private readonly interfacesByName = new Map<string, ParsedInterface>();

  // Interfaces whose heritage chain could not be fully resolved — a parent
  // named in an `extends` clause that is not in `interfacesByName` (an
  // external/`node_modules` interface, a type alias used as a parent, or a
  // module the traversal never reached). Recorded so the Phase-2 lanes can
  // WARN that the classification was made on own members alone, rather than
  // silently guessing. See `convertInterface`.
  private readonly interfacesWithUnresolvedHeritage = new Set<string>();

  // The single consumer-facing predicate. `isDTOLikeType` uses it to keep a
  // method-bearing interface OUT of a Function's `input`/`output` slot:
  // `check-function-graph.ts:44` requires `target.kind === 'DTO'` exactly, so
  // a Class-kind name there is `checker/input-not-dto` +
  // `checker/reference-to-illegal` — the SAME two findings the pre-existing
  // `entityRegistry.classes` exclusion (`isDTOLikeType`, D-LEG-1's
  // disclosed-loss trade) already exists to prevent for a real `class`
  // declaration. A method-bearing interface is now the same kind of thing, so
  // it takes the same exclusion. The type text stays visible verbatim in the
  // emitted `signature`; only the machine-checked input/output edge is
  // dropped, which is exactly the trade D-LEG-1 documented and accepted.
  private isPredictedClassInterface(name: string): boolean {
    return this.interfacesPredictedClassKind.has(name);
  }

  // Gap 69 blocker 2 — the shape decision over the RESOLVED HERITAGE CHAIN,
  // not own members alone. `interface Child extends HasMethod {}` inherits a
  // method contract and declares nothing; classifying it on own members put
  // it on the DTO lane, emitting a fieldless `Child %` with no `<: HasMethod`
  // edge and no warning — `doIt` unreachable through the child. That is gap
  // 69's exact symptom one level up, so the predicate has to see the chain.
  //
  // Runs as a whole-program pass AFTER `collectModuleEntities` has indexed
  // every module's interfaces (a per-module computation cannot see a parent
  // declared in a module visited later), and BEFORE any Phase-2 conversion
  // reads `isPredictedClassInterface`. Both lanes and `isDTOLikeType` then
  // read one precomputed answer.
  private predictInterfaceKinds(): void {
    for (const name of this.interfacesByName.keys()) {
      if (this.resolveInterfaceIsMethodBearing(name, new Set())) {
        this.interfacesPredictedClassKind.add(name);
      }
    }
  }

  // True when this interface, or any interface it transitively extends,
  // declares at least one method signature.
  //
  // UNRESOLVABLE PARENTS: a parent not in `interfacesByName` is an external
  // interface (`node_modules`), a type alias used as a parent, or a module the
  // traversal never reached. Its members are unknowable, so the walk cannot
  // prove OR disprove a method. It records the child in
  // `interfacesWithUnresolvedHeritage` and keeps walking the parents it CAN
  // resolve. The effect is the own-member rule as the floor, with the caller
  // warning that heritage could not be fully inspected — a resolvable
  // method-bearing parent elsewhere in the chain still wins, and an
  // unresolvable parent never silently flips a property-only interface onto
  // the Class lane (which would strip its fields on a guess).
  //
  // `seen` makes the walk cycle-safe. TypeScript rejects circular interface
  // inheritance, but the converter must not hang on malformed input.
  private resolveInterfaceIsMethodBearing(name: string, seen: Set<string>): boolean {
    if (seen.has(name)) {
      return false;
    }
    seen.add(name);

    const iface = this.interfacesByName.get(name);
    if (iface === undefined) {
      return false;
    }

    if (iface.methods.length > 0) {
      return true;
    }

    let inheritsMethod = false;
    for (const parent of iface.extends) {
      // A parent is written as a type reference and may carry generic
      // arguments (`extends Repository<User>`); the index is keyed by the
      // bare declaration name, so strip the argument list before lookup.
      const parentName = this.stripGenericArguments(parent);
      if (!this.interfacesByName.has(parentName)) {
        this.interfacesWithUnresolvedHeritage.add(name);
        continue;
      }
      if (this.resolveInterfaceIsMethodBearing(parentName, seen)) {
        inheritsMethod = true;
      }
    }
    return inheritsMethod;
  }

  // `Repository<User>` -> `Repository`. Also trims whitespace so a
  // multi-line-authored heritage clause resolves.
  private stripGenericArguments(typeReference: string): string {
    const angleIndex = typeReference.indexOf('<');
    const bare = angleIndex === -1 ? typeReference : typeReference.slice(0, angleIndex);
    return bare.trim();
  }

  // X-CONV-3 — the target project's root, supplied by the analysis this
  // convert() call is processing. `getRelativePath`/`filterModules`
  // relativize against this, never `process.cwd()`, so extraction produces
  // identical paths whether the CLI runs from inside or outside the target
  // project. Set at the top of `convert()`; a fresh `TypeScriptAnalyzer`
  // property per analysis, matching the rest of this class's per-conversion
  // reset discipline.
  private projectRoot: string = process.cwd();

  // Two-pass architecture registries
  private readonly exportRegistry: ExportRegistry = {};

  // X-AN-3 residual — `export * from '<source>'` edges, keyed by the
  // ABSOLUTE path of the barrel module that declares them, valued by the
  // written specifiers it stars. `registerModuleExports` is the only writer
  // (it is the one place holding both the module and its ParsedExports);
  // `resolveStarReExportNames` is the only reader. Kept separate from
  // `exportRegistry` because that registry is keyed by SPECIFIER (many keys
  // per module) and stores only names, so it cannot answer "which source
  // does this module's star point at?".
  private readonly starReExportSources = new Map<string, string[]>();

  // Ladder rung (sammons/code-outline-cli `packages/cli`) — the set of
  // builtin-extends / namespace-implements stub names that have already been
  // claimed by SOME file's `exports:` list. `ensureBuiltinExtendsStub` is
  // idempotent (one shared `Error` ClassNode for every class extending it),
  // but every ClassFile whose module extends it used to fold that ONE name
  // into its OWN `exports` list — so two modules each declaring an
  // `X extends Error` both claimed to export `Error` and the checker fired
  // `checker/multi-exported`. A stub is a single entity and can have exactly
  // one exporter; the first claimant wins and later files import it without
  // re-exporting.
  private readonly claimedStubExportNames = new Set<string>();
  private readonly entityRegistry: EntityRegistry = {
    functions: new Map(),
    classes: new Map(),
    interfaces: new Map(),
    types: new Map(),
    constants: new Map(),
    files: new Map(),
  };

  constructor(options: Partial<ConversionOptions> = {}) {
    this.options = {
      preferClassFile: true,
      includePrivateMembers: false,
      generatePrograms: true,
      programVersion: '1.0.0',
      ignorePatterns: ['node_modules/**', '**/*.d.ts', '**/*.test.ts', '**/*.spec.ts'],
      ...options,
    };
  }

  convert(analysis: TypeScriptProjectAnalysis): ConversionResult {
    this.reset();
    // X-CONV-3 — every relativization this conversion performs targets the
    // analysis's own project root, not this process's cwd.
    this.projectRoot = analysis.projectRoot;

    // RC-A (issue #99) — index the analyzer's own resolved module graph
    // before any registration/resolution runs, so `registerModuleExports`
    // and `resolveImportToEntity` can consult it instead of guessing
    // specifier shapes. `analysis.moduleGraph` covers static imports,
    // re-exports, and dynamic imports uniformly (X-AN-1's three call sites
    // into `recordModuleGraphEdge`); only 'internal' edges resolve to a
    // project-relative target this converter can key an entity lookup on —
    // 'external'/'unresolved' edges are handled by the pre-existing
    // `isExternalPackage`/undefined-return paths, unchanged by this map.
    for (const edge of analysis.moduleGraph) {
      if (edge.classification === 'internal' && edge.resolvedTarget !== undefined) {
        this.moduleGraphResolution.set(
          TypeScriptToTypedMindConverter.moduleGraphResolutionKey(edge.sourceModule, edge.specifier),
          edge.resolvedTarget,
        );
      }
    }

    try {
      // Filter modules based on ignore patterns
      const filteredModules = this.filterModules(analysis.modules);

      // Store entry points for reference during conversion
      this.entryPoints = new Set(analysis.entryPoints.map((ep) => this.getRelativePath(ep)));

      // Convert TypeScript constructs to TypedMind entities
      this.convertModules(filteredModules);

      // SST-referenced-module orphan flags (lead-authorized amendment,
      // half 1 of 2 — see `foldSstHandlerImportsIntoSourceFiles`'s own doc
      // comment). Runs AFTER convertModules (every module's File/ClassFile
      // entity name is final and recorded in `fileEntityNameByModulePath`)
      // and BEFORE generatePrograms (independent operations — order
      // between the two does not matter, this is placed first because it
      // touches `this.entities` in place while generatePrograms only
      // appends).
      this.foldSstHandlerImportsIntoSourceFiles(analysis.sstHandlerReferences);

      // RC-E (issue #107) — same ordering rationale as the SST-handler fold
      // immediately above: a dynamic `import()` specifier's TARGET module's
      // File/ClassFile entity name is only guaranteed final once
      // `convertModules` has finished (an arbitrary-order pass), so this
      // also runs as a post-pass rather than threaded into `convertImports`.
      this.foldDynamicImportsIntoSourceFiles(filteredModules);

      // Fixture 72 — side-effect imports (`import './components/widget.ts'`).
      // Same ordering rationale as the folds around it: a target File's
      // entity name is only guaranteed final once `convertModules` has
      // finished.
      this.foldSideEffectImportsIntoSourceFiles(filteredModules);

      // RFC-TM-11 Amendment 1, §RX-6 (rfc-tm-11-diamond.md) — issue #109
      // (RC-G), the cross-package residual Quantum 1 left open: same
      // ordering rationale as the two folds immediately above — a
      // re-exporting File's `reExports` and its own entity name are only
      // guaranteed final once `convertModules` has finished.
      this.foldReExportedNamesIntoImporterFiles(filteredModules);

      // X-AN-3 residual (ladder rung: sammons/code-outline-cli) — the
      // barrel->source direction of the same "a re-export is a real edge"
      // principle: `export * from '<source>'` emits no ImportDeclaration, so
      // nothing else in this converter records that the barrel references
      // the starred module.
      this.foldStarReExportImportsIntoBarrelFiles(filteredModules);

      // Generate program entities if requested (after other entities are created)
      if (this.options.generatePrograms) {
        this.generatePrograms(analysis.entryPoints, filteredModules, analysis.sstHandlerReferences);
      }

      // RFC-TM-6 §3 — pre-sort into the legacy section order so checked-in
      // `.tmd` diffs keep their structure, then emit through the shared
      // SyntaxEmitter (the `# Section` header comments are the named,
      // accepted EMITTER-STRUCTURE regression — SyntaxEmitter has no
      // comment-synthesis surface, per the RFC's Rejected Alternatives).
      const sortedEntities = sortIntoLegacySectionOrder(this.entities);
      // X-SUPP-6 — computed after every entity exists (the detection walks
      // the FULL cross-file import graph, so it must run after
      // convertModules/generatePrograms, not per-module).
      const suppressions = this.computeSuppressions(sortedEntities);
      const tmdContent = this.emitter.emitShortform({
        entities: sortedEntities,
        imports: [],
        suppressions,
        diagnostics: [],
      });

      return {
        success: this.errors.length === 0,
        entities: sortedEntities,
        tmdContent,
        errors: [...this.errors],
        warnings: [...this.warnings],
        suppressionCounts: this.countSuppressionsByReason(suppressions),
      } as const;
    } catch (error) {
      this.addError(`Conversion failed: ${error instanceof Error ? error.message : String(error)}`);

      // X-CONV-4/I-13 — degrade, never discard. Whatever entities were
      // collected onto `this.entities` before the exception are still real,
      // still-valid partial output; emitting them (instead of the prior
      // `entities: [], tmdContent: ''` total discard) is what makes a
      // mid-conversion failure survivable — the operator gets a partial
      // `.tmd` plus the error, not nothing. `success: false` and a nonzero
      // CLI exit still apply (see cli.ts) so a partial result can never be
      // mistaken for a clean one. The emit itself is defensively guarded:
      // a second failure while degrading must not re-throw past this
      // method — that would turn "degrade" back into "discard".
      let sortedEntities: readonly EntityNode[] = [];
      let tmdContent = '';
      try {
        sortedEntities = sortIntoLegacySectionOrder(this.entities);
        tmdContent = this.emitter.emitShortform({ entities: sortedEntities, imports: [], suppressions: [], diagnostics: [] });
      } catch (emitError) {
        this.addError(`Partial-output emission also failed: ${emitError instanceof Error ? emitError.message : String(emitError)}`);
        sortedEntities = [...this.entities];
      }

      return {
        success: false,
        entities: sortedEntities,
        tmdContent,
        errors: [...this.errors],
        warnings: [...this.warnings],
        // X-SUPP-6 — a degraded/partial conversion emits zero suppressions:
        // the cross-file import graph a suppression's absence-of-reference
        // claim depends on is exactly what a mid-conversion failure leaves
        // incomplete, so asserting "unmodelable but correct" here would be
        // unfounded rather than degraded.
        suppressionCounts: this.emptySuppressionCounts(),
      } as const;
    }
  }

  private emptySuppressionCounts(): Record<SuppressionReason, number> {
    // RFC-TM-10 §9 (D-LEG-9) — 'test-only-consumer' removed from
    // SuppressionReason (types.ts); see that type's comment for the
    // removal rationale.
    return { 'generated-single-file-scope': 0 };
  }

  private countSuppressionsByReason(suppressions: readonly SuppressionNode[]): Record<SuppressionReason, number> {
    const counts = this.emptySuppressionCounts();
    for (const suppression of suppressions) {
      // SuppressionNode.reason is a bare `string` (lib/typed-mind's
      // ast/suppression-node.ts — no enumerated reason type exists at that
      // layer). The cast is safe here because this converter is the ONLY
      // producer of every suppression it counts: `computeSuppressions`
      // (below) never constructs a SuppressionNode with a reason outside
      // `SuppressionReason`'s sole member (narrowed from two per RFC-TM-10
      // §9, D-LEG-9), so every value flowing into this loop is provably it.
      const reason = suppression.reason as SuppressionReason;
      counts[reason] = (counts[reason] ?? 0) + 1;
    }
    return counts;
  }

  // RFC-TM-9 §9 (rfc-tm-9-diamond.md, X-SUPP-6) — "the extractor emits a
  // suppression only for enumerated graph shapes that are correct in source
  // but unmodelable." The one reason this Quantum can trigger deterministically
  // is 'generated-single-file-scope' (the census's CstBlockKw class): "only
  // self-references inside its own generated file... no cross-file import
  // exists anywhere" (extraction-gap-census-language.md). The converter's
  // OWN Phase-1 registry (`entityRegistry.classes`, populated in
  // `collectModuleEntities` from `module.exports`) already records whether a
  // class was ever exported from its declaring module — a non-exported
  // TypeScript symbol is, by the language's own scoping rules, categorically
  // unreachable from any other file, so it cannot have a real cross-file
  // consumer for the checker's orphan rule to find. `convertToSeparateEntities`
  // (unlike the function/interface/type/enum/constant lanes, which all gate
  // on export status before converting) unconditionally promotes EVERY class
  // to a top-level entity regardless of export — this is what puts a
  // module-private class in the graph as a real, checker-visible orphan
  // candidate while carrying the same "used only within its own file" shape
  // the census adjudicated as checker-right-but-suppressible.
  //
  // Scope discipline: only 'Class'-kind entities are checked against this
  // signal (the one lane with the unconditional-conversion gap); every other
  // kind already gates on export before an entity is created at all, so a
  // non-exported symbol of those kinds never reaches `entities` in the first
  // place — there is nothing here for them to match. Program/Dependency/
  // File/ClassFile are never suppression targets (orphan-file has its own
  // code the checker uses; Program/Dependency are exempt orphan candidates
  // by the checker's own rule). X-AN-10/X-AN-11 shapes are excluded by
  // design (they are modelable via real edges, never suppressed — doc §6/§9).
  private computeSuppressions(entities: readonly EntityNode[]): SuppressionNode[] {
    const suppressions: SuppressionNode[] = [];
    for (const entity of entities) {
      if (entity.kind !== 'Class') {
        continue;
      }
      const registryEntry = this.entityRegistry.classes.get(entity.name);
      if (registryEntry === undefined || registryEntry.exported) {
        continue;
      }
      const reason: SuppressionReason = 'generated-single-file-scope';
      suppressions.push(
        new SuppressionNode({
          target: entity.name,
          code: 'checker/orphaned-entity',
          reason,
          span: SYNTHETIC_SPAN,
          raw: `suppress ${entity.name} checker/orphaned-entity "${reason}"`,
        }),
      );
      // issue #91 — the identical unconditional-conversion gap that makes
      // this class trip `checker/orphaned-entity` (suppressed above) ALSO
      // makes it trip `checker/class-not-exported` (check-exports.ts,
      // `checkClassAndFunctionExports`): a module-private class is, by the
      // SAME TS-scoping proof already used above, never exported by any
      // File/ClassFile by construction. One SuppressionNode is one
      // (code, target) pair (ast/suppression-node.ts's frozen grain), so
      // the twin finding needs its own entry, sharing the same reason code
      // (no new SuppressionReason variant needed).
      suppressions.push(
        new SuppressionNode({
          target: entity.name,
          code: 'checker/class-not-exported',
          reason,
          span: SYNTHETIC_SPAN,
          raw: `suppress ${entity.name} checker/class-not-exported "${reason}"`,
        }),
      );
    }
    return suppressions;
  }

  private reset(): void {
    this.errors.length = 0;
    this.warnings.length = 0;
    this.entities.length = 0;
    this.entityNames.clear();
    this.reservedNamedTypeNames.clear();
    this.functionNameRemap.clear();
    this.fileEntityNameByModulePath.clear();
    this.fileEntityNameByRelativePath.clear();
    this.reservedFileEntityNameByModulePath.clear();
    this.dependencies.clear();
    this.externalTypeToPackage.clear();
    this.entryPoints.clear();
    this.builtinExtendsStubNames.clear();
    this.namespaceImplementsStubNames.clear();
    this.typesRegistryPredictedKind.clear();
    this.interfacesPredictedClassKind.clear();
    this.interfacesByName.clear();
    this.interfacesWithUnresolvedHeritage.clear();
    this.moduleGraphResolution.clear();
    this.starReExportSources.clear();
    this.claimedStubExportNames.clear();

    // Clear two-pass registries
    Object.keys(this.exportRegistry).forEach((key) => {
      delete this.exportRegistry[key];
    });
    this.entityRegistry.functions.clear();
    this.entityRegistry.classes.clear();
    this.entityRegistry.interfaces.clear();
    this.entityRegistry.types.clear();
    this.entityRegistry.constants.clear();
    this.entityRegistry.files.clear();
  }

  private addEntityName(entityName: string, _context: string): void {
    this.entityNames.add(entityName);
  }

  private filterModules(modules: readonly ParsedModule[]): ParsedModule[] {
    return modules.filter((module) => {
      const relativePath = this.getRelativePath(module.filePath);
      return !this.options.ignorePatterns.some((pattern) => this.matchesPattern(relativePath, pattern));
    });
  }

  // issue #96 — the previous three-chain `.replace()` implementation had two
  // compounding defects: (1) literal regex metacharacters in the pattern
  // (starting with `.`) were never escaped before being embedded in the
  // regex, so `**/*.d.ts`'s literal `.` before `d.ts` became a wildcard
  // matching ANY character; (2) `**` was replaced with `.*` first, and the
  // SUBSEQUENT single-`*` replace also matched the `*` that substitution
  // just inserted, corrupting `.*` into `.[^/]*`. Combined, the default
  // ignore pattern `**/*.d.ts` wrongly matched `src/typed-mind.ts`, silently
  // dropping `core`'s own entrypoint module from the traversed set.
  //
  // Fixed by scanning the pattern character-by-character and building the
  // regex token-by-token: every literal character is escaped via
  // `escapeRegexChar` before being appended, and each glob wildcard
  // (`**`, `*`, `?`) is consumed exactly once so a later step can never
  // re-match text an earlier step already emitted.
  private matchesPattern(filePath: string, pattern: string): boolean {
    const regex = this.globToRegexSource(pattern);
    return new RegExp(`^${regex}$`).test(filePath);
  }

  private globToRegexSource(pattern: string): string {
    const chars = Array.from(pattern);
    let result = '';
    let index = 0;
    while (index < chars.length) {
      const char = chars[index] ?? '';
      if (char === '*') {
        if (chars[index + 1] === '*') {
          result += '.*';
          index += 2;
        } else {
          result += '[^/]*';
          index += 1;
        }
        continue;
      }
      if (char === '?') {
        result += '.';
        index += 1;
        continue;
      }
      result += this.escapeRegexChar(char);
      index += 1;
    }
    return result;
  }

  private escapeRegexChar(char: string): string {
    return /[.*+?^${}()|[\]\\]/.test(char) ? `\\${char}` : char;
  }

  private convertModules(modules: ParsedModule[]): void {
    // PHASE 1: Collection and Export Registration

    // 1.1: Extract all dependencies first
    for (const module of modules) {
      this.extractDependencies(module);
    }

    // 1.2: Build complete export registry for all modules
    for (const module of modules) {
      this.registerModuleExports(module);
    }

    // 1.3: Collect all entities information without processing imports
    for (const module of modules) {
      this.collectModuleEntities(module);
    }

    // 1.4 (gap 69/67): resolve every interface's shape over its heritage
    // chain, now that 1.3 has indexed the interfaces of EVERY module. Must
    // run after that loop (a parent may be declared in a module visited
    // later) and before any Phase-2 conversion reads the prediction.
    this.predictInterfaceKinds();

    // issue #72 (tm10-inc2), adversarial-review blocker fix (2nd round,
    // PR #84 comment 19118) — the per-module reservation in `processModule`
    // (`reserveNamedTypeEntityNames`) is not enough on its own: it only
    // protects a hand-authored interface/type-alias/enum from a
    // same-MODULE synthesized DTO. `regularFiles` (any module with a
    // function, hence any module inline-DTO synthesis can fire from)
    // ALWAYS process before `pureTypesFiles` below (X-CONV-3's own fixed
    // ordering, unrelated to and unchanged by this fix) — so a
    // hand-authored interface/type-alias/enum living in a DIFFERENT
    // module that happens to be classified pure-types (a conventional
    // `types.ts`) could still be silently evicted by a same-named
    // synthesized DTO from a function in an EARLIER-processing regular
    // module. Reserving every module's named-type entity names — across
    // the WHOLE `modules` list, not just the current module — before ANY
    // module's functions convert closes this for good, the same
    // "reserve everything up front" shape `reserveFunctionEntityNames`
    // already uses within one module, now applied at the run's full
    // conservation boundary. `processModule`'s own per-module call to
    // `reserveNamedTypeEntityNames` becomes redundant once this runs (the
    // set is additive and idempotent — re-adding an already-reserved name
    // is a no-op) but is left in place rather than removed: it costs
    // nothing extra and keeps `processModule` correct in isolation for any
    // future caller that invokes it without first running this whole-run
    // pass.
    for (const module of modules) {
      this.reserveNamedTypeEntityNames(module);
    }

    // RC-B (issue #100) — reserve every module's File-entity name up front,
    // across the WHOLE `modules` list, before any module converts. See
    // `reservedFileEntityNameByModulePath`'s own field comment and
    // `reserveFileEntityNames`'s doc comment for the full mechanism.
    this.reserveFileEntityNames(modules);

    // PHASE 2: Processing with Complete Knowledge

    // Separate pure types files from regular files for proper ordering.
    // X-CONV-3 — a declared entry point is NEVER routed through the
    // pure-types path, even when its own module shape (e.g. `export const
    // app = new Hono()`, a plain constant with no classes/functions) would
    // otherwise qualify as "pure types". `isPureTypesFile` only inspects the
    // module's own shape and has no entry-point awareness; entry points are
    // forced to `convertToSeparateEntities` below (`isModuleEntryPoint`
    // already gates the ClassFile-fusion branch inside `processModule` the
    // same way — this is that same forcing rule applied one level up, where
    // the pure-types/regular split happens before `processModule` runs).
    const pureTypesFiles: ParsedModule[] = [];
    const regularFiles: ParsedModule[] = [];

    for (const module of modules) {
      if (this.isPureTypesFile(module) && !this.isModuleEntryPoint(module)) {
        pureTypesFiles.push(module);
      } else {
        regularFiles.push(module);
      }
    }

    // 2.1: Process regular modules first (now imports can be resolved)
    for (const module of regularFiles) {
      this.processModule(module);
    }

    // 2.2: Process pure types files last
    for (const module of pureTypesFiles) {
      this.processModule(module);
    }

    // 2.3: Add dependencies to entities
    this.entities.push(...this.dependencies.values());
  }

  private extractDependencies(module: ParsedModule): void {
    for (const imp of module.imports) {
      // Only create dependency entities for external packages (not internal imports)
      if (this.isExternalPackage(imp.specifier)) {
        this.createDependencyEntity(imp.specifier);

        // Track which types come from this external package
        if (imp.namedImports) {
          for (const namedImport of imp.namedImports) {
            this.externalTypeToPackage.set(namedImport, imp.specifier);
          }
        }
        if (imp.defaultImport) {
          this.externalTypeToPackage.set(imp.defaultImport, imp.specifier);
        }
      }
    }
  }

  private createDependencyEntity(specifier: string): void {
    if (this.dependencies.has(specifier)) {
      return; // Already exists
    }

    const entityName = this.createDependencyName(specifier);
    const version = this.extractVersionFromPackageJson(specifier);
    const purpose = this.derivePurpose(specifier);

    const dependencyEntity = new DependencyNode({
      name: entityName,
      span: SYNTHETIC_SPAN,
      raw: `${entityName} ^ "${purpose}"${version ? ` v${version}` : ''}`,
      sourceForm: 'shortform',
      purpose,
      version,
    });

    this.dependencies.set(specifier, dependencyEntity);
    this.entityNames.add(entityName);
  }

  // PHASE 1 METHODS: Collection and Export Registration

  private registerModuleExports(module: ParsedModule): void {
    const moduleExports = {
      namedExports: new Set<string>(),
      reExportedNames: new Set<string>(),
      filePath: module.filePath,
    } as ExportRegistry[string];

    // Register all exports from this module
    for (const exp of module.exports) {
      if (exp.isDefault) {
        moduleExports.defaultExport = exp.name;
      } else {
        moduleExports.namedExports.add(exp.name);
        // Record re-export provenance here, the only point that sees the
        // ParsedExport's `source`. The name still belongs in `namedExports`
        // (it IS part of this module's import-resolution surface); this set
        // only records that another file DECLARES it.
        if (this.isReExport(exp) && exp.name !== '*') {
          moduleExports.reExportedNames.add(exp.name);
        }
      }

      // X-AN-3 residual — record the star's SOURCE specifier so
      // `resolveStarReExportNames` can expand the `'*'` placeholder into the
      // real names later, once every module is registered. Recorded here
      // because this is the only point that sees the ParsedExport's
      // `source` alongside the declaring module's own path.
      if (exp.type === 'namespace-reexport' && exp.source !== undefined) {
        const existing = this.starReExportSources.get(module.filePath) ?? [];
        existing.push(exp.source);
        this.starReExportSources.set(module.filePath, existing);
      }

      // Handle re-exports: if export has a source, treat it as import-then-export
      if (exp.source) {
        this.processReExport(module, exp);
      }
    }

    // Register this module under multiple keys for easier resolution.
    // Adversarial review (PR #105) blocker fix — `withoutExt` used to strip
    // only `ts|tsx|js|jsx` while `stripKnownSourceExtension` (this class's
    // single other extension-stripping site, used on the READ side of both
    // the RC-A moduleGraphResolution fast path and the pre-existing
    // guessed-specifier fallback) strips 8 extensions including
    // `mts|cts|mjs|cjs`. For a `.mts`/`.cts`/`.mjs`/`.cjs` source module the
    // write-side key and the read-side lookup key disagreed, so the new
    // fast path silently missed and fell through to the guessed-specifier
    // fallback — reproducing RC-A's own import-dropping bug for exactly
    // those four extensions. Fixed by having the write side call the SAME
    // method the read side calls, so the two can never drift apart again.
    const relativePath = this.getRelativePath(module.filePath);
    const withoutExt = this.stripKnownSourceExtension(relativePath);
    const fileName = path.basename(module.filePath, path.extname(module.filePath));
    const dirPath = path.dirname(withoutExt);

    // Register under various possible import specifier formats:
    const specifiers = [
      withoutExt, // 'src/types/user'
      withoutExt.startsWith('./') ? withoutExt : `./${withoutExt}`, // './src/types/user'
      `./${fileName}`, // './user'
      `../${fileName}`, // '../user' (from sibling directories)
      fileName, // 'user' (bare name)
      `../types/${fileName}`, // '../types/user' (common relative import)
      `./types/${fileName}`, // './types/user' (from root)
      `types/${fileName}`, // 'types/user' (from root without ./)
    ];

    // Add relative paths from common source directories
    if (dirPath.includes('types')) {
      specifiers.push(`../types/${fileName}`);
      specifiers.push(`./types/${fileName}`);
    }
    if (dirPath.includes('services')) {
      specifiers.push(`../services/${fileName}`);
      specifiers.push(`./services/${fileName}`);
    }

    for (const specifier of specifiers) {
      this.exportRegistry[specifier] = moduleExports;
    }

    // RC-A (issue #99) — register this module under its OWN canonical,
    // extension-less project-relative path too (`withoutExt`, already
    // computed above). This is exactly the shape `resolveImportToEntity`
    // gets back from `moduleGraphResolution` (an `edge.resolvedTarget`,
    // project-relative, run through `stripKnownSourceExtension`) — so ANY
    // import that the analyzer's own `ts.resolveModuleName` call resolved to
    // this module, regardless of how many subdirectories the relative
    // specifier crossed, finds this entry. This is the fix for the dominant
    // cross-directory gap: the fixed `specifiers` list above only ever
    // guessed `types/`/`services/`-prefixed or bare-basename forms, never a
    // general `./<subdir>/<file>` shape.
    this.exportRegistry[withoutExt] = moduleExports;
  }

  private processReExport(module: ParsedModule, reExport: ParsedExport): void {
    // Re-export: export { X } from './module' is equivalent to:
    // 1. import { X } from './module'
    // 2. export { X }

    // For now, just log that we found a re-export
    // The actual handling will be done when we process imports/dependencies
    // during the second phase when we have full access to the analysis

    // Add a warning if the re-export source might not be included
    if (reExport.source !== undefined && !this.isExternalPackage(reExport.source)) {
      // Fixture 71 — consult the analyzer's own resolved module graph FIRST.
      // `resolveModulePath` below is a hand-rolled `fs.existsSync` extension
      // probe: given an already-suffixed specifier (`./types-list.ts`, legal
      // under `allowImportingTsExtensions` and idiomatic in Node
      // type-stripping projects) it appends extensions to the suffixed path,
      // probes `types-list.ts.ts`/`types-list.ts/index.ts`, finds nothing,
      // and warns that a file which plainly exists was not found. This is the
      // census's A-g2 `.js`-suffix defect surviving in the converter's own
      // copy of the resolver; the analyzer's `ts.resolveModuleName` (X-AN-1)
      // already resolved this exact edge and recorded it here.
      const graphResolved = this.moduleGraphResolution.has(
        TypeScriptToTypedMindConverter.moduleGraphResolutionKey(this.getRelativePath(module.filePath), reExport.source),
      );
      const sourceModulePath = graphResolved ? undefined : this.resolveModulePath(reExport.source, path.dirname(module.filePath));
      if (!graphResolved && (!sourceModulePath || !fs.existsSync(sourceModulePath))) {
        this.warnings.push({
          message: `Re-export source module not found: ${reExport.source} (re-exporting ${reExport.name})`,
          filePath: module.filePath,
          suggestion: undefined,
        });
      }
    }
  }

  private resolveModulePath(specifier: string, basePath: string): string | null {
    // Handle relative paths
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
      const fullPath = path.resolve(basePath, specifier);

      // Try common TypeScript extensions
      const extensions = ['.ts', '.tsx', '.js', '.jsx'];
      for (const ext of extensions) {
        const withExt = fullPath + ext;
        if (fs.existsSync(withExt)) {
          return withExt;
        }
      }

      // Try as directory with index file
      for (const ext of extensions) {
        const indexPath = path.join(fullPath, `index${ext}`);
        if (fs.existsSync(indexPath)) {
          return indexPath;
        }
      }
    }

    return null;
  }

  private collectModuleEntities(module: ParsedModule): void {
    const sourceFile = module.filePath;

    // Collect all functions
    for (const func of module.functions) {
      const entityInfo: EntityInfo = {
        name: func.name,
        type: 'function',
        sourceFile,
        exported: this.isFunctionExported(func, module),
      };
      this.entityRegistry.functions.set(func.name, entityInfo);
    }

    // Collect all classes
    for (const cls of module.classes) {
      const entityInfo: EntityInfo = {
        name: cls.name,
        type: 'class',
        sourceFile,
        exported: module.exports.some((exp) => exp.name === cls.name),
      };
      this.entityRegistry.classes.set(cls.name, entityInfo);
    }

    // Collect all interfaces
    for (const iface of module.interfaces) {
      const entityInfo: EntityInfo = {
        name: iface.name,
        type: 'interface',
        sourceFile,
        exported: module.exports.some((exp) => exp.name === iface.name),
      };
      this.entityRegistry.interfaces.set(iface.name, entityInfo);
      // Gap 69/67 — see `interfacesPredictedClassKind`'s field comment. The
      // shape decision needs the whole program's interfaces before it can
      // resolve a heritage chain, so Phase 1 only INDEXES here; the
      // prediction itself is computed by `predictInterfaceKinds` once this
      // per-module loop has visited every module.
      this.interfacesByName.set(iface.name, iface);
    }

    // Collect all type aliases
    for (const type of module.types) {
      const entityInfo: EntityInfo = {
        name: type.name,
        type: 'type',
        sourceFile,
        exported: module.exports.some((exp) => exp.name === type.name),
      };
      this.entityRegistry.types.set(type.name, entityInfo);
      // See `typesRegistryPredictedKind`'s field comment.
      this.typesRegistryPredictedKind.set(type.name, this.isObjectLikeType(type.type) ? 'DTO' : 'TypeDef');
    }

    // X-AN-7/X-CONV-2 — collect real TS enums into the SAME registry bucket
    // as type aliases (they share the 'type' export lane; see the analyzer's
    // export-registration comment). Without this, `resolveImportToEntity`'s
    // registry membership check (functions/classes/interfaces/types/
    // constants) never finds an enum name, so an import of an enum-typed
    // symbol silently drops from the importing File's `imports` list —
    // exactly the dropped-import-edge shape the census's gap 1/A-g1 family
    // catalogs, and precisely what would make `checkOrphans` misreport an
    // actually-consumed TypeDef as orphaned.
    for (const enumDef of module.enums ?? []) {
      const entityInfo: EntityInfo = {
        name: enumDef.name,
        type: 'type',
        sourceFile,
        exported: module.exports.some((exp) => exp.name === enumDef.name),
      };
      this.entityRegistry.types.set(enumDef.name, entityInfo);
      this.typesRegistryPredictedKind.set(enumDef.name, 'TypeDef');
    }

    // Collect all constants
    for (const constant of module.constants) {
      const entityInfo: EntityInfo = {
        name: constant.name,
        type: 'constant',
        sourceFile,
        exported: this.isConstantExported(constant, module),
      };
      this.entityRegistry.constants.set(constant.name, entityInfo);
    }
  }

  // PHASE 2 METHODS: Processing with Complete Knowledge

  private processModule(module: ParsedModule): void {
    // This replaces the old convertModule method but with complete export registry available
    const fileName = path.basename(module.filePath, path.extname(module.filePath));
    const entityName = this.sanitizeEntityName(fileName);

    // Check if this module is an entry point that needs special handling
    const isEntryPoint = this.isModuleEntryPoint(module);

    // Check if this is a pure types/constants file. X-CONV-3 — an entry
    // point is never treated as pure-types here either, so a script-shaped
    // entrypoint (a plain constant initializer, no classes/functions) still
    // gets its File entity even if this method is reached directly instead
    // of through `convertModules`'s pre-partitioned `regularFiles` list.
    const isPureTypesFile = this.isPureTypesFile(module) && !isEntryPoint;

    // Decide whether to create separate entities or use ClassFile fusion
    const hasClasses = module.classes.length > 0;
    const hasFunctions = module.functions.length > 0;
    const hasExports = module.exports.length > 0;

    // RFC-TM-10 Q3 amendment (lead-authorized, X-CONV-4 extension) —
    // reserve this module's function entity names exactly once here, before
    // EITHER downstream path (`convertToClassFile`, which may itself
    // fall back to `convertToSeparateEntities`) builds an entity whose
    // `exports:` list needs the final, possibly-disambiguated name. `pure
    // types/constants` files have no functions by definition
    // (`isPureTypesFile`), so this is a no-op for that branch.
    if (!isPureTypesFile) {
      this.reserveFunctionEntityNames(module, entityName);
      // issue #72 (tm10-inc2), adversarial-review blocker fix (PR #84) — a
      // synthesized inline-DTO name (`${functionEntityName}Input`/`Output`)
      // must never win a name-collision race against a HAND-AUTHORED
      // interface/type-alias/enum declared in the SAME module, just
      // because `convertToSeparateEntities`/`convertToClassFile` happen to
      // convert functions before interfaces/type-aliases/enums (both
      // paths' own fixed loop order, unchanged by this reservation).
      // Without this reservation, `synthesizeInlineDTO` sees an empty slot
      // in `entityNames` for a name like `CreateOrderInput`, claims it, and
      // the LATER-converting `interface CreateOrderInput` then hits the
      // pre-existing `Duplicate entity name` hard error and is silently
      // dropped from the entity list — the wrong direction: an
      // author-provided name must not be evicted by a converter-invented
      // one. Reserving every exported interface/type-alias/enum's bare
      // name up front (mirroring `reserveFunctionEntityNames`'s own
      // pre-pass shape) closes this: `synthesizeInlineDTO`'s later
      // `reserveSynthesizedDTOName` collision check sees the name already
      // taken and disambiguates via `__2`, exactly as it already does for
      // a same-module function-name collision.
      //
      // NOTE (2nd adversarial-review round, PR #84 comment 19118): a
      // same-module reservation alone does not close the CROSS-module
      // case (a hand-authored interface in a different, pure-types-
      // classified file) — `convertModules` now also runs this same
      // method over EVERY module up front, before either the
      // `regularFiles` or `pureTypesFiles` loop starts (see that call
      // site's own doc comment). This per-module call is additive/
      // idempotent with that whole-run pass and is kept so
      // `processModule` stays correct in isolation.
      this.reserveNamedTypeEntityNames(module);
    }

    if (isPureTypesFile) {
      // For pure types/constants files, only create the individual type/constant entities
      this.convertTypesAndConstants(module);
    } else if (this.options.preferClassFile && hasClasses && (hasFunctions || hasExports) && !isEntryPoint) {
      // Use ClassFile fusion for service/controller patterns (but not for entry points)
      this.convertToClassFile(module, entityName);
    } else {
      // Create separate File entity and other entities (always for entry points)
      this.convertToSeparateEntities(module, entityName);
    }
  }

  private createDependencyName(specifier: string): string {
    // Handle scoped packages like @sammons/typed-mind-renderer
    if (specifier.startsWith('@')) {
      const sanitized = this.sanitizeEntityName(specifier.replace('@', '').replace('/', '_'));
      // For @sammons/typed-mind -> SammonsTypedMind
      // For @sammons/typed-mind-renderer -> SammonsTypedMindRenderer
      return sanitized;
    }

    // Handle Node.js built-ins and regular packages
    return this.sanitizeEntityName(specifier);
  }

  private extractVersionFromPackageJson(specifier: string): string | undefined {
    try {
      // Try to find package.json in the project
      const packageJsonPath = path.resolve(process.cwd(), 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return undefined;
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies,
      };

      const version = dependencies[specifier];
      if (version) {
        // Clean version string (remove ^ ~ etc.)
        return version.replace(/^[\^~>=<]+/, '');
      }
    } catch {
      // Ignore errors - version is optional
    }
    return undefined;
  }

  private derivePurpose(specifier: string): string {
    // Known Node.js built-ins
    const nodeBuiltins: Record<string, string> = {
      fs: 'File system operations',
      path: 'Path manipulation utilities',
      util: 'Node.js utility functions',
      os: 'Operating system utilities',
      crypto: 'Cryptographic functionality',
      http: 'HTTP client and server',
      https: 'HTTPS client and server',
      url: 'URL parsing utilities',
      querystring: 'Query string utilities',
      events: 'Event emitter',
      stream: 'Streaming data',
      buffer: 'Binary data handling',
      child_process: 'Spawn child processes',
      cluster: 'Multi-process support',
      dns: 'DNS lookup utilities',
      net: 'TCP networking',
      readline: 'Read input line-by-line',
      tls: 'TLS/SSL support',
      vm: 'Virtual machine context',
      zlib: 'Compression utilities',
    };

    if (nodeBuiltins[specifier]) {
      return nodeBuiltins[specifier];
    }

    // Common packages
    const knownPackages: Record<string, string> = {
      typescript: 'TypeScript compiler',
      react: 'React UI library',
      express: 'Web application framework',
      lodash: 'JavaScript utility library',
      axios: 'HTTP client library',
      moment: 'Date manipulation library',
      uuid: 'UUID generation library',
      bcrypt: 'Password hashing library',
      jsonwebtoken: 'JSON Web Token library',
      mongoose: 'MongoDB object modeling',
      sequelize: 'SQL ORM library',
      dotenv: 'Environment variable loader',
      cors: 'CORS middleware',
      helmet: 'Security headers middleware',
      winston: 'Logging library',
      jest: 'Testing framework',
      vitest: 'Testing framework',
      eslint: 'JavaScript linter',
      prettier: 'Code formatter',
    };

    if (knownPackages[specifier]) {
      return knownPackages[specifier];
    }

    // Handle scoped packages
    if (specifier.startsWith('@')) {
      const packageName = specifier.split('/')[1] || specifier;
      return `${packageName.replace(/-/g, ' ')} library`;
    }

    // Fallback
    return `${specifier.replace(/-/g, ' ')} library`;
  }

  private isPureTypesFile(module: ParsedModule): boolean {
    // A file is considered "pure types" if it only exports types, interfaces,
    // enums, and constants and doesn't have any classes or functions (except
    // type-only exports). X-AN-7/X-CONV-2 — a file containing ONLY a real TS
    // `enum` (e.g. `export enum Status { ... }`, no classes/functions) must
    // classify as pure-types the same way a type-alias-only file already
    // does; without `module.enums` here, 14-enum's `src/status.ts` would
    // fall through to `convertToSeparateEntities` and gain a redundant File
    // entity a types-only source file should not have.
    // RC-F (issue #108) — a module whose only logic lives in a top-level
    // registration-callback call (`accountRoutes.openapi(route, async (c) =>
    // {...})`, the Hono OpenAPI idiom, or an equivalent Express/router
    // shape) has zero top-level `function`/`class` DECLARATIONS, so the
    // pre-existing `hasRealCode` check alone misclassified it as
    // "pure types" — `processModule` then routed it to
    // `convertTypesAndConstants`, which never calls `convertImports`,
    // silently dropping every real cross-file import the file has.
    // `hasTopLevelCallbackRegistration` (computed by the analyzer, which has
    // AST access `ParsedModule` does not carry) closes this gap.
    const hasRealCode = module.classes.length > 0 || module.functions.length > 0 || (module.hasTopLevelCallbackRegistration ?? false);
    const hasTypesOrConstants =
      module.types.length > 0 || module.interfaces.length > 0 || module.constants.length > 0 || (module.enums?.length ?? 0) > 0;

    return !hasRealCode && hasTypesOrConstants;
  }

  private convertTypesAndConstants(module: ParsedModule): void {
    // Convert all type aliases FIRST (they become TypeDef/DTO entities with their exact names)
    for (const typeAlias of module.types) {
      if (this.isTypeAliasExported(typeAlias, module)) {
        this.convertTypeAliasToDTO(typeAlias);
      }
    }

    // X-AN-7/X-CONV-2 — enums emit as TM-8's TypeDef entity kind (variant:
    // 'enum'), the same lane as type aliases, not the Constants lane.
    for (const enumDef of module.enums ?? []) {
      if (this.isEnumExported(enumDef, module)) {
        this.convertEnumToTypeDef(enumDef);
      }
    }

    // Then convert interfaces to DTOs
    for (const iface of module.interfaces) {
      if (this.isInterfaceExported(iface, module)) {
        this.convertInterface(iface);
      }
    }

    // Finally convert constants
    for (const constant of module.constants) {
      if (this.isConstantExported(constant, module)) {
        this.createConstantEntity(constant, module);
      }
    }
  }

  private isInterfaceExported(iface: { name: string }, module: ParsedModule): boolean {
    return module.exports.some((exp) => exp.name === iface.name && exp.type === 'interface');
  }

  private isTypeAliasExported(typeAlias: { name: string }, module: ParsedModule): boolean {
    return module.exports.some((exp) => exp.name === typeAlias.name && exp.type === 'type');
  }

  // X-AN-7 registers a real enum's export as `type: 'type'` (typescript-
  // analyzer.ts), matching the type-alias export lane — see that change's
  // comment for why 'type' rather than 'constant'.
  private isEnumExported(enumDef: { name: string }, module: ParsedModule): boolean {
    return module.exports.some((exp) => exp.name === enumDef.name && exp.type === 'type');
  }

  // X-CONV-5 — a class extending a global ambient builtin (`class
  // NotionApiError extends Error`) has no declared entity for the checker's
  // every-reference-resolves rule to find; `checkInheritanceChains` rejects
  // any `extends` target `context.byName` doesn't contain, and `extends.to`
  // (valid-references.ts) only admits `['Class', 'ClassFile']` — a
  // Dependency-kind stub fails that check (verified: `Cannot use 'extends'
  // to reference Dependency`), so the stub must be a ClassNode. Zero
  // checker change: this only ever adds a declared entity the existing
  // reference-legality rule already accepts.
  //
  // Scope discipline: the doc names this a fix for "ambient-global `extends`
  // targets (`Error`, `Map`, `EventEmitter`, ...)" — a curated allowlist,
  // the same shape as `derivePurpose`'s `nodeBuiltins` table, NOT a catch-all
  // for every unresolvable extends target. A class extending a genuinely
  // undeclared, non-builtin base (a real bug in the source, or an
  // intentionally-incomplete test fixture) must still fail the checker's
  // `unknown-base-class` finding exactly as before this Quantum — silently
  // stubbing arbitrary unresolved names would mask that real error class,
  // which is not what the census gap or the doc's Solution ask for.
  private static readonly KNOWN_AMBIENT_EXTENDS_TARGETS: ReadonlyMap<string, string> = new Map([
    ['Error', 'Ambient global error type'],
    ['Map', 'Ambient global keyed-collection type'],
    ['Set', 'Ambient global unique-value collection type'],
    ['Array', 'Ambient global indexed-collection type'],
    ['EventEmitter', 'Ambient Node.js event-emitter type'],
    ['Promise', 'Ambient global asynchronous-value type'],
  ]);

  // Returns the stub's entity name when `extendsTarget` is a KNOWN ambient
  // builtin that needed one synthesized (idempotent — a target referenced
  // by multiple classes shares one stub), or undefined when the target
  // already resolves to a real declared entity, or is not in the known
  // ambient-builtins allowlist (in which case no stub is created and the
  // checker's existing unresolved-extends error stands).
  private ensureBuiltinExtendsStub(extendsTarget: string | undefined): string | undefined {
    if (extendsTarget === undefined || extendsTarget.length === 0) {
      return undefined;
    }

    const purpose = TypeScriptToTypedMindConverter.KNOWN_AMBIENT_EXTENDS_TARGETS.get(extendsTarget);
    if (purpose === undefined) {
      return undefined;
    }

    const entityName = createEntityName(extendsTarget);
    if (this.entityRegistry.classes.has(extendsTarget) || this.entityRegistry.interfaces.has(extendsTarget)) {
      // A real class/interface in the analyzed source happens to share a
      // name with a known ambient builtin (e.g. a project defines its own
      // `Error` class) — the real declared entity wins, no stub needed.
      return undefined;
    }

    if (!this.builtinExtendsStubNames.has(entityName)) {
      this.builtinExtendsStubNames.add(entityName);
      this.entityNames.add(entityName);

      // No methods list: the stub represents an opaque ambient type, not a
      // modeled API surface — `classToShortform` omits the `=> [...]` line
      // entirely when `methods` is empty, so this emits as a bare `<:`
      // declaration with no unparsable empty-bracket continuation.
      const stubEntity = new ClassNode({
        name: entityName,
        span: SYNTHETIC_SPAN,
        raw: `${entityName} <:`,
        sourceForm: 'shortform',
        extends: undefined,
        implements: [],
        methods: [],
        purpose,
      });

      this.entities.push(stubEntity);
    }

    return entityName;
  }

  // RFC-TM-10 §3 (D-LEG-3, issue #61, LEAD RULING: no new sigil, `<:`
  // mapping with representable qualified names). A namespace-qualified
  // `implements` target's text contains a `.` (`ts.ParseConfigFileHost`) —
  // the grammar's `entity_name` token accepts no dot, so the converter must
  // not emit it verbatim. `sanitizeEntityName` already strips non-
  // `[a-zA-Z0-9_]` characters (including `.`) and PascalCases the remainder
  // (`ts.ParseConfigFileHost` -> `TsParseConfigFileHost`), the same
  // deterministic transform X-CONV-4 already proved collision-safe. The
  // stub is a bare ClassNode (zero methods, matching X-CONV-5's own
  // zero-methods emission shape) so it never introduces a real inheritance
  // edge the checker's unknown-base-class/circular-inheritance rules
  // police — an `implements` target is structural, not a base class.
  private ensureNamespaceImplementsStub(target: string): string {
    const entityName = this.sanitizeEntityName(target);

    if (!this.namespaceImplementsStubNames.has(entityName)) {
      this.namespaceImplementsStubNames.add(entityName);
      this.entityNames.add(entityName);

      const stubEntity = new ClassNode({
        name: entityName,
        span: SYNTHETIC_SPAN,
        raw: `${entityName} <:`,
        sourceForm: 'shortform',
        extends: undefined,
        implements: [],
        methods: [],
        purpose: 'Ambient namespace-qualified interface (auto-stubbed)',
      });

      this.entities.push(stubEntity);
    }

    return entityName;
  }

  // Converts a class's raw `implements` target list (which may include
  // TypedMind's own convention of folding secondary `extends` targets into
  // `implements`, per `cls.extends.slice(1)` at the call site) into the
  // grammar-representable list: a namespace-qualified target (contains `.`)
  // is replaced by its sanitized stub's entity name; a bare identifier
  // target passes through unchanged.
  private convertImplementsList(secondaryExtends: readonly string[], implementsTargets: readonly string[]): string[] {
    return [...secondaryExtends, ...implementsTargets].map((target) =>
      target.includes('.') ? this.ensureNamespaceImplementsStub(target) : target,
    );
  }

  // Collects the namespace-implements stub names newly needed by a module's
  // own classes, so the caller (mirroring `collectBuiltinExtendsStubImports`)
  // can fold them into that module's File/ClassFile `imports` list — a stub
  // is otherwise unreferenced by any import edge, which would leave it
  // orphaned by the checker's orphan rule (`implements` is never counted as
  // a reference, per check-orphans.ts).
  private collectNamespaceImplementsStubImports(classes: readonly ParsedClass[]): string[] {
    const stubNames: string[] = [];
    for (const cls of classes) {
      for (const target of cls.implements) {
        if (target.includes('.')) {
          stubNames.push(this.ensureNamespaceImplementsStub(target));
        }
      }
    }
    return stubNames;
  }

  // Collects the builtin-extends stub names newly needed by a module's own
  // classes, so the caller can fold them into that module's File/ClassFile
  // `imports` list. A stub is otherwise unreferenced by any import edge
  // (nothing in source literally imports `Error`), which would leave it
  // orphaned by the checker's orphan rule (`extends`/`implements` are never
  // counted as references, per check-orphans.ts) — folding the stub into
  // the owning file's declared imports is what gives the checker's
  // reachability computation an honest edge to find, mirroring how a real
  // TS `extends Error` clause is itself a live reference to the global.
  private collectBuiltinExtendsStubImports(classes: readonly ParsedClass[]): string[] {
    const stubNames: string[] = [];
    for (const cls of classes) {
      const stubName = this.ensureBuiltinExtendsStub(cls.extends[0]);
      if (stubName !== undefined) {
        stubNames.push(stubName);
      }
    }
    return stubNames;
  }

  private convertToClassFile(module: ParsedModule, baseName: string): void {
    // Find the primary class (usually the one that matches the filename)
    const primaryClass = module.classes.find((cls) => cls.name.toLowerCase() === baseName.toLowerCase()) || module.classes[0];

    if (!primaryClass) {
      this.addWarning(`No primary class found in ${module.filePath}`);
      this.convertToSeparateEntities(module, baseName);
      return;
    }

    const entityName = createEntityName(primaryClass.name);

    if (this.entityNames.has(entityName)) {
      this.addError(`Duplicate entity name: ${entityName}`);
      return;
    }

    this.entityNames.add(entityName);
    // SST-referenced-module orphan flags (lead-authorized amendment) —
    // record this module's final ClassFile entity name, mirroring the
    // `convertToSeparateEntities` FileNode recording above.
    this.fileEntityNameByModulePath.set(module.filePath, entityName);
    // RC-E (issue #107) — same recording, keyed by relative path for
    // `foldDynamicImportsIntoSourceFiles`'s `moduleGraphResolution` lookup.
    this.fileEntityNameByRelativePath.set(this.stripKnownSourceExtension(this.getRelativePath(module.filePath)), entityName);

    // X-CONV-5 — synthesize a stub for the primary class's own extends
    // target (if it's an unmodelled builtin) plus any other class in this
    // module, before building this ClassFile's imports/exports lists. The
    // stub needs to appear in SOME file's `exports` (checkClassAndFunction
    // Exports requires every ClassNode to be exported by a file — ClassFile
    // is exempt via self-export, but a builtin stub is a plain ClassNode)
    // and in an import list somewhere so the orphan check sees a real
    // reference edge (extends is never counted as one). This ClassFile is
    // the only entity in this module with an honest claim to the ambient
    // global its source references, so it both imports and exports it.
    const primaryStubName = this.ensureBuiltinExtendsStub(primaryClass.extends[0]);
    const otherStubNames = this.collectBuiltinExtendsStubImports(module.classes.filter((cls) => cls !== primaryClass));
    // D-LEG-3 — namespace-qualified `implements` targets (`ts.Foo`) get the
    // same stub-import-folding treatment as builtin-extends targets: a stub
    // is otherwise unreferenced by any import edge, so it needs folding into
    // this ClassFile's imports/exports the same way `stubNames` already does
    // for builtin-extends stubs above.
    const primaryImplementsStubNames = this.collectNamespaceImplementsStubImports([primaryClass]);
    const otherImplementsStubNames = this.collectNamespaceImplementsStubImports(module.classes.filter((cls) => cls !== primaryClass));
    const stubNames = [
      ...(primaryStubName !== undefined ? [primaryStubName] : []),
      ...otherStubNames,
      ...primaryImplementsStubNames,
      ...otherImplementsStubNames,
    ];

    // RC-C (issue #102): a declared (`#:`) ClassFile has no shortform
    // continuation slot for `purpose` — attachment-rules.ts's
    // `description_line` legality excludes a declared ClassFile outright
    // (only a lookahead-converted ClassFile accepts one, per RFC-TM-3 §3.1).
    // `sourceForm` here is 'shortform' regardless (this converter's own
    // emission path always calls `emitShortform`, which forces every entity
    // to shortform per `SyntaxEmitter`'s documented `forceForm` contract —
    // per-entity `sourceForm` would be inert against that override). The
    // emitter itself (emit-shortform.ts's `shortformCannotExpress`) is what
    // detects this case and promotes the ONE entity to longform so the real
    // `purpose` data round-trips instead of being silently dropped.
    // RFC-TM-11 §RX-1 — ClassFile does not carry `reExports` (it always
    // auto-self-exports, so it can never be RC-G-shaped); any re-exported
    // names `convertExports` reports for this module are not applicable
    // here and are intentionally not read.
    const classFileEntity = new ClassFileNode({
      name: entityName,
      span: SYNTHETIC_SPAN,
      raw: `${entityName} #: ${this.getRelativePath(module.filePath)}`,
      sourceForm: 'shortform',
      path: this.getRelativePath(module.filePath),
      extends: primaryClass.extends[0] || undefined, // TypedMind supports single inheritance
      implements: this.convertImplementsList(primaryClass.extends.slice(1), primaryClass.implements),
      methods: this.convertMethods(primaryClass),
      imports: [...this.convertImports(module.filePath, module.imports, module.exports), ...stubNames],
      exports: [...this.convertExports(module, entityName).exportNames, ...this.claimStubExportNames(stubNames)],
      purpose: primaryClass.description ? collapseDescription(primaryClass.description) : undefined,
    });

    this.entities.push(classFileEntity);

    // Convert other classes as separate entities
    for (const cls of module.classes) {
      if (cls !== primaryClass) {
        this.convertClass(cls, this.getRelativePath(module.filePath));
      }
    }

    // Only convert functions that are exported
    for (const func of module.functions) {
      if (this.isFunctionExported(func, module)) {
        this.convertFunction(func, module);
      }
    }

    // Convert interfaces as DTOs
    for (const iface of module.interfaces) {
      if (this.isInterfaceExported(iface, module)) {
        this.convertInterface(iface);
      }
    }

    // Convert all type aliases (both object-like and union types)
    for (const typeAlias of module.types) {
      if (this.isTypeAliasExported(typeAlias, module)) {
        this.convertTypeAliasToDTO(typeAlias);
      }
    }

    // X-AN-7/X-CONV-2 — enums emit as TM-8's TypeDef entity kind.
    for (const enumDef of module.enums ?? []) {
      if (this.isEnumExported(enumDef, module)) {
        this.convertEnumToTypeDef(enumDef);
      }
    }

    // Convert constants - create individual entities for exported constants
    this.convertConstants(module);
  }

  private convertToSeparateEntities(module: ParsedModule, baseName: string): void {
    // RC-B (issue #100) — the file-entity name comes from
    // `reservedFileEntityNameByModulePath` (populated by `reserveFileEntityNames`'s
    // whole-run, order-independent pre-pass in `convertModules`), not a bare
    // `${baseName}File` recomputation here. `??` fallback covers callers
    // that invoke this method directly without first running the whole-run
    // pre-pass (kept for the same "correct in isolation" reason
    // `reserveNamedTypeEntityNames`'s per-module call is kept alongside its
    // own whole-run pass) — the fallback reproduces the PRE-FIX bare-name
    // behavior for exactly the case the pre-pass could not have seen this
    // module.
    const fileEntityName = this.reservedFileEntityNameByModulePath.get(module.filePath) ?? createEntityName(`${baseName}File`);

    // SST-referenced-module orphan flags (lead-authorized amendment) —
    // record this module's final File entity name unconditionally, even
    // when the entity itself was already created by a prior call (the
    // guard below skips re-construction, not re-naming; the mapping must
    // still resolve for `resolveSstHandlerReferences`'s lookup).
    this.fileEntityNameByModulePath.set(module.filePath, fileEntityName);
    // RC-E (issue #107) — same recording, keyed by relative path for
    // `foldDynamicImportsIntoSourceFiles`'s `moduleGraphResolution` lookup.
    this.fileEntityNameByRelativePath.set(this.stripKnownSourceExtension(this.getRelativePath(module.filePath)), fileEntityName);

    if (!this.entityNames.has(fileEntityName)) {
      this.entityNames.add(fileEntityName);

      // X-CONV-5 — synthesize stubs for any of this module's classes that
      // extend an unmodelled builtin. `checkClassAndFunctionExports`
      // requires every ClassNode to appear in SOME file's `exports`
      // (check-exports.ts), and the orphan check needs a real import edge
      // to avoid flagging the stub (check-orphans.ts never counts
      // `extends`). The owning file both exports and imports its own
      // stub — it is the file that vouches for the ambient global its
      // source references (the stub isn't a member of this module, but
      // this module is the only place with an honest claim to it).
      // D-LEG-3 — same stub-import-folding treatment for namespace-qualified
      // `implements` targets as the builtin-extends stubs above.
      const stubNames = [
        ...this.collectBuiltinExtendsStubImports(module.classes),
        ...this.collectNamespaceImplementsStubImports(module.classes),
      ];

      // RFC-TM-11 §RX-4 (rfc-tm-11-diamond.md) — the RC-G fix: a re-exported
      // name (issue #109) no longer vanishes when every one of a File's
      // exports is a re-export. It is destructured into `reExports`
      // instead of being silently dropped from `exportNames`.
      const { exportNames, reExportNames } = this.convertExports(module);
      const fileEntity = new FileNode({
        name: fileEntityName,
        span: SYNTHETIC_SPAN,
        raw: `${fileEntityName} @ ${this.getRelativePath(module.filePath)}:`,
        sourceForm: 'shortform',
        path: this.getRelativePath(module.filePath),
        imports: [...this.convertImports(module.filePath, module.imports, module.exports), ...stubNames],
        exports: [...exportNames, ...this.claimStubExportNames(stubNames)],
        reExports: reExportNames,
      });

      this.entities.push(fileEntity);
    }

    // Convert other entities
    for (const cls of module.classes) {
      this.convertClass(cls, this.getRelativePath(module.filePath));
    }

    // Only convert functions that are exported
    for (const func of module.functions) {
      if (this.isFunctionExported(func, module)) {
        this.convertFunction(func, module);
      }
    }

    for (const iface of module.interfaces) {
      if (this.isInterfaceExported(iface, module)) {
        this.convertInterface(iface);
      }
    }

    // Convert all type aliases (both object-like and union types)
    for (const typeAlias of module.types) {
      if (this.isTypeAliasExported(typeAlias, module)) {
        this.convertTypeAliasToDTO(typeAlias);
      }
    }

    // X-AN-7/X-CONV-2 — enums emit as TM-8's TypeDef entity kind.
    for (const enumDef of module.enums ?? []) {
      if (this.isEnumExported(enumDef, module)) {
        this.convertEnumToTypeDef(enumDef);
      }
    }

    // Convert constants - create individual entities for exported constants
    this.convertConstants(module);
  }

  private convertClass(cls: ParsedClass, sourceFile?: string): void {
    const entityName = createEntityName(cls.name);

    if (this.entityNames.has(entityName)) {
      this.addError(`Duplicate entity name: ${entityName}`);
      return;
    }

    this.entityNames.add(entityName);

    // sourceFile is not carried on ClassNode: RFC-TM-3 §2.2 drops the legacy
    // `container`/`path` fields for Class (dead per the honest-fields table —
    // the File->Class lookahead heuristic's product is a ClassFileNode).
    void sourceFile;

    const classEntity = new ClassNode({
      name: entityName,
      span: SYNTHETIC_SPAN,
      raw: `${entityName} <: ${cls.extends.join(', ')}`,
      sourceForm: 'shortform',
      extends: cls.extends[0] || undefined, // TypedMind supports single inheritance
      implements: this.convertImplementsList(cls.extends.slice(1), cls.implements),
      methods: this.convertMethods(cls),
      purpose: cls.description ? collapseDescription(cls.description) : undefined,
    });

    this.entities.push(classEntity);
  }

  // RFC-TM-10 Q3 amendment (lead-authorized, D-LEG-6's live-clone check
  // binding): a real multi-target SST-handler codebase (the webhookstorage
  // clone) has multiple modules independently exporting a function literally
  // named `handler` (`packages/functions/src/api/index.ts`,
  // `.../auth/provision-tenant.ts`, `.../auth/teardown-tenant.ts`,
  // `.../auth/deletion-verification.ts`) — traversal-enqueue is the first
  // mechanism that ever traverses more than one of these together, so this
  // bare-name collision was latent, never triggered, before Q3. Called as a
  // PRE-PASS before either module-conversion path (`convertToClassFile`/
  // `convertToSeparateEntities`) builds its File/ClassFile entity — the
  // export list needs the FINAL emitted name before it can be built, so the
  // remap must exist before that point, not after `convertFunction` runs.
  // `baseName` is the module's own sanitized name (the same value used to
  // derive `<baseName>File`). On the FIRST occurrence of a name (globally,
  // across the whole conversion — `this.entityNames` is checked, not a
  // per-module set), the name stays BARE: this is the narrow half of the
  // guardrail, an uncollided function name is unaffected. Only on a
  // DETECTED collision is `<baseName>__<name>` recorded, reusing
  // `deriveProgramName`'s exact collision-proof rationale (X-CONV-4,
  // RFC-TM-9 §4): `sanitizeEntityName` collapses every run of underscores to
  // one and never re-inserts a separator when joining PascalCase parts, so
  // no sanitized identifier can ever contain `__` — a literal `__` separator
  // is provably outside `sanitizeEntityName`'s codomain and cannot collide
  // with any real entity name derived from source. Deterministic, no
  // runtime probe, no nondeterministic suffix (both rejected for the
  // identical reason in RFC-TM-9's own Rejected Alternatives for the Class
  // case). This pre-pass only RESERVES names in `this.entityNames` for
  // functions that will actually be converted (mirrors
  // `isFunctionExported`'s own filter) — it does not create entities.
  private reserveFunctionEntityNames(module: ParsedModule, baseName: string): void {
    for (const func of module.functions) {
      if (!this.isFunctionExported(func, module)) {
        continue;
      }
      const remapKey = `${module.filePath}::${func.name}`;
      const bareName = createEntityName(func.name);
      const finalName = this.entityNames.has(bareName) ? createEntityName(`${baseName}__${func.name}`) : bareName;
      this.functionNameRemap.set(remapKey, finalName);
      this.entityNames.add(finalName);
    }
  }

  // issue #72 (tm10-inc2), adversarial-review blocker fix (PR #84) — see
  // this method's call site in `processModule` for the full rationale.
  // Reserves this module's exported interface/type-alias/enum bare names
  // in `entityNames` BEFORE any function in the module converts (and
  // therefore before any inline-DTO synthesis can run), so a
  // hand-authored name always wins a collision against a
  // converter-synthesized one, regardless of the fixed pass order
  // (`convertToSeparateEntities`/`convertToClassFile` always convert
  // functions before interfaces/type-aliases/enums). This is a
  // reservation only — it does not create entities, does not run
  // `sanitizeEntityName` (interfaces/type-aliases/enums all resolve their
  // final name via the identity `createEntityName`, per
  // `convertInterfaceToDTO`/`convertTypeAliasToDTO`/`convertEnumToTypeDef`,
  // so reserving that exact bare name here is provably the same name
  // those methods will later look up), and does not touch classes (which
  // already convert before functions in both call paths, so they are
  // already safely registered by the time this method's caller runs).
  // A collision AMONG interfaces/type-aliases/enums themselves is invalid
  // TypeScript (a duplicate top-level declaration) and cannot occur from
  // real source; this loop does not attempt to disambiguate that case —
  // if it were ever reached, the later `convertInterfaceToDTO`-family
  // call's own pre-existing `Duplicate entity name` guard reports it,
  // unchanged by this reservation.
  private reserveNamedTypeEntityNames(module: ParsedModule): void {
    for (const iface of module.interfaces) {
      if (this.isInterfaceExported(iface, module)) {
        this.reservedNamedTypeNames.add(createEntityName(iface.name));
      }
    }
    for (const typeAlias of module.types) {
      if (this.isTypeAliasExported(typeAlias, module)) {
        this.reservedNamedTypeNames.add(createEntityName(typeAlias.name));
      }
    }
    for (const enumDef of module.enums ?? []) {
      if (this.isEnumExported(enumDef, module)) {
        this.reservedNamedTypeNames.add(createEntityName(enumDef.name));
      }
    }
  }

  // RC-B (issue #100) — order-independent File-entity name reservation.
  // Groups every module by its bare basename FIRST (a pure set operation
  // over the whole `modules` list, unaffected by which module a later loop
  // happens to process first), then disambiguates only the basenames that
  // actually collide. A non-colliding basename keeps the existing bare
  // `${baseName}File` shape unchanged — this is a collision-ONLY mechanism,
  // matching `reserveFunctionEntityNames`'s own `__`-disambiguator
  // precedent (X-CONV-4/PR #74), not a blanket rename of every File entity.
  //
  // Disambiguator choice: the module's own parent directory name
  // (`db`/`routes` for `db/events.ts` vs `routes/events.ts`), sanitized and
  // joined with the same `__` double-underscore separator
  // `deriveProgramName`/`reserveFunctionEntityNames` already establish as
  // outside `sanitizeEntityName`'s codomain (see `deriveProgramName`'s own
  // comment for the collision-proof argument — it applies identically
  // here). If two colliding modules ALSO share the same parent directory
  // name (a deeper nesting, e.g. `a/x/events.ts` vs `b/x/events.ts`), fall
  // back to the full sanitized relative directory path.
  //
  // Adversarial review (PR #105) blocker fix — `sanitizeEntityName` is
  // LOSSY (it collapses `/`, `-`, `_`, and case into one alnum-only
  // PascalCase string), so two distinct full relative directory paths that
  // differ only in separator/case/dash-vs-underscore shape (`pkg-a/x` vs
  // `pkg/a/x`) can still sanitize to the identical disambiguator even at
  // the full-path fallback tier — silently clobbering the SAME way RC-B
  // itself was filed to close, just requiring a rarer directory-name
  // shape. Closed by tracking every disambiguated name this method has
  // already assigned in `assignedNames` and, on a genuine post-sanitize
  // collision, appending a deterministic `__2`, `__3`, ... suffix (the
  // same disambiguator shape `reserveSynthesizedDTOName` already uses) —
  // this is a last-resort, should-not-fire-in-practice tier, but it makes
  // every name this method emits provably unique regardless of how two
  // real directory paths happen to sanitize.
  private reserveFileEntityNames(modules: readonly ParsedModule[]): void {
    const modulesByBaseName = new Map<string, ParsedModule[]>();
    for (const module of modules) {
      const baseName = this.sanitizeEntityName(path.basename(module.filePath, path.extname(module.filePath)));
      const group = modulesByBaseName.get(baseName);
      if (group) {
        group.push(module);
      } else {
        modulesByBaseName.set(baseName, [module]);
      }
    }

    const assignedNames = new Set<string>();
    const assign = (modulePath: string, candidateName: string): void => {
      let finalName = candidateName;
      let attempt = 2;
      while (assignedNames.has(finalName)) {
        finalName = `${candidateName}__${attempt}`;
        attempt += 1;
      }
      assignedNames.add(finalName);
      this.reservedFileEntityNameByModulePath.set(modulePath, finalName);
    };

    for (const [baseName, group] of modulesByBaseName) {
      if (group.length === 1) {
        const [onlyModule] = group;
        if (onlyModule) {
          assign(onlyModule.filePath, createEntityName(`${baseName}File`));
        }
        continue;
      }

      // Collision: disambiguate every module in the group by parent
      // directory name first; only fall back to the full directory path
      // for a sub-collision (two modules sharing BOTH basename and parent
      // directory name — only possible with a deeper, differently-rooted
      // path, since same basename + same immediate parent + same full
      // relative path would be the same file). `assign`'s numeric-suffix
      // tier is the final backstop for the rare case where even the
      // full-path fallback sanitizes to an identical string across two
      // different real paths.
      const parentDirNames = group.map((module) => this.sanitizeEntityName(path.basename(path.dirname(module.filePath))));
      const parentDirNameCounts = new Map<string, number>();
      for (const parentDirName of parentDirNames) {
        parentDirNameCounts.set(parentDirName, (parentDirNameCounts.get(parentDirName) ?? 0) + 1);
      }

      group.forEach((module, index) => {
        const parentDirName = parentDirNames[index] ?? '';
        const disambiguator =
          (parentDirNameCounts.get(parentDirName) ?? 0) > 1
            ? this.sanitizeEntityName(this.getRelativePath(path.dirname(module.filePath)))
            : parentDirName;
        assign(module.filePath, createEntityName(`${disambiguator}__${baseName}File`));
      });
    }
  }

  private convertFunction(func: ParsedFunction, module: ParsedModule): void {
    const moduleFilePath = module.filePath;
    const remapKey = `${moduleFilePath}::${func.name}`;
    const entityName = this.functionNameRemap.get(remapKey);

    // `reserveFunctionEntityNames` runs as a pre-pass before every call site
    // that reaches `convertFunction` (`convertToClassFile`,
    // `convertToSeparateEntities`), reserving this exact key. A missing
    // entry means a call path that skipped the pre-pass — defensive, not
    // expected to fire: report it the same way every other name collision
    // in this converter reports, rather than silently emitting a bare,
    // possibly-colliding name.
    if (entityName === undefined) {
      this.addError(`Duplicate entity name: ${createEntityName(func.name)}`);
      return;
    }

    // Extract input/output DTOs from signature. `entityName` (the
    // converter's own collision-resolved function name, X-CONV-4) seeds
    // issue #72's inline-DTO synthesis naming — see
    // `synthesizeInlineDTO`'s doc comment.
    const inputDTO = this.extractInputDTO(func, entityName);
    const outputDTO = this.extractOutputDTO(func, entityName);

    const functionEntity = new FunctionNode({
      name: entityName,
      span: SYNTHETIC_SPAN,
      raw: `${entityName} :: ${func.signature}`,
      sourceForm: 'shortform',
      signature: func.signature,
      calls: this.resolveSameFileCallEdges(func, module),
      pendingDependencies: [],
      description: func.description ? collapseDescription(func.description) : undefined,
      input: inputDTO,
      output: outputDTO,
    });

    this.entities.push(functionEntity);
  }

  // typedmind-diagnostic-legitimacy callgraph increment — resolves
  // `ParsedFunction.calledNames` (raw identifiers found in the function's own
  // body, per `collectSameFileCallEdges`) against SAME-FILE declared,
  // exported entities only: a sibling exported function/arrow-const in
  // `module.functions` (resolved through `functionNameRemap`, the converter's
  // own collision-resolved name — the same map `convertFunction` itself uses
  // for its own name) or a sibling exported class in `module.classes`
  // (resolved through `createEntityName`, since `reserveFunctionEntityNames`'s
  // own doc comment establishes classes are never touched by the function
  // disambiguation remap and always convert before this method runs, in both
  // `convertToClassFile` and `convertToSeparateEntities`). A name with no
  // same-file resolution (a module-private helper, an imported/global
  // identifier, a method-call receiver, anything `collectSameFileCallEdges`
  // could not attribute to a same-file top-level declaration) is DROPPED,
  // not guessed — an unresolved raw string folded into `calls` would
  // misfire `checker/unknown-call-target`/`checker/method-call-on-non-class`
  // (check-method-calls.ts only inspects DOTTED calls, but
  // `checkOrphans`/`collectReferencedNames` unions every raw string
  // regardless, so an unresolved non-dotted name is merely inert — dropping
  // it here is a precision choice, not a soundness requirement, made to keep
  // `calls` an honest same-file-resolved edge list rather than a bag of
  // unresolved source text). Cross-file calls are intentionally out of scope
  // — this increment targets the same-file-closure diagnostic family only;
  // a cross-file call edge is a separate, larger surface (the converter's
  // import-graph resolution, not this per-function walk) this increment does
  // not touch.
  private resolveSameFileCallEdges(func: ParsedFunction, module: ParsedModule): string[] {
    if (func.calledNames.length === 0) {
      return [];
    }
    const resolved = new Set<string>();
    for (const calledName of func.calledNames) {
      if (calledName === func.name) {
        // Direct recursion: the function's own (not-yet-assigned) entity
        // name is not a useful liveness edge for the orphan check (a
        // function cannot make itself non-orphaned by calling itself), and
        // resolving it would just re-add the function's own remap entry.
        continue;
      }
      const siblingFunctionRemapKey = `${module.filePath}::${calledName}`;
      const siblingFunctionEntityName = this.functionNameRemap.get(siblingFunctionRemapKey);
      if (siblingFunctionEntityName !== undefined) {
        resolved.add(siblingFunctionEntityName);
        continue;
      }
      // issue #91 / X-SUPP-6 (rfc-tm-9-diamond.md §9) — a class converts to
      // an entity REGARDLESS of export status (`convertToSeparateEntities`/
      // `convertToClassFile` never gate on `isClassExported`, unlike
      // functions), so `this.entityNames.has(...)` alone is not a safe
      // "genuinely reachable" signal the way it is for the function branch
      // above. A module-private class deliberately keeps its
      // `checker/orphaned-entity` finding (converter-emitted,
      // pre-suppressed with reason 'generated-single-file-scope') as a
      // STATEMENT ABOUT NON-EXPORT, not a same-file-reachability question —
      // crediting a same-file `new` call here would silently erase that
      // designed-in finding (fixture 25-generated-single-file). Only an
      // EXPORTED sibling class is a legitimate same-file call-edge target.
      const siblingClass = module.classes.find((cls) => cls.name === calledName);
      if (siblingClass !== undefined && module.exports.some((exp) => exp.name === siblingClass.name)) {
        const siblingClassEntityName = createEntityName(siblingClass.name);
        // valid-references.ts's VALID_REFERENCES table legalizes `calls.to`
        // as `['Function', 'Class']` ONLY — a ClassFile (a File fused with
        // its module's primary class, per `convertToClassFile`) is NOT a
        // legal `calls` target (confirmed against the real webhookstorage
        // corpus: an Error subclass that IS the module's own primary class,
        // e.g. ingest's `PayloadTooLargeError extends Error` in
        // `s3-upload.ts`, `new`'d only inside a same-file function, fired
        // `checker/reference-to-illegal` — "Cannot use 'calls' to reference
        // ClassFile" — before this guard). Only fold in a sibling class that
        // actually converted as a plain ClassNode.
        const siblingClassEntity = this.entities.find((entity) => entity.name === siblingClassEntityName);
        if (siblingClassEntity !== undefined && siblingClassEntity.kind === 'Class') {
          resolved.add(siblingClassEntityName);
        }
      }
    }
    return Array.from(resolved);
  }

  // Gap 69 / gap 67 (ladder rung sammons/slat-harness, fixtures
  // 67-implements-data-interface and 69-interface-method-dropped) — the
  // single shape predicate that decides which lane an exported interface
  // takes. TypedMind's grammar has NO Interface entity kind (grammar.md:25-37
  // lists twelve; interface is not one), and the checker already declares the
  // mapping in-source: valid-references.ts:51, "In TypedMind, interfaces are
  // represented as Classes". `ClassNode.methods` (class-node.ts:15) is the
  // only method surface in the language — check-method-calls.ts:36 states the
  // matching rule from the other side, "Only Classes and ClassFiles can have
  // methods". So a method-bearing interface has exactly one honest home, and
  // it is not the DTO lane.
  //
  // WHAT COUNTS AS A METHOD: `iface.methods`, and only that. This is the
  // analyzer's own `ts.isMethodSignature` partition (typescript-analyzer.ts:
  // 1294-1302) — the ONLY two member kinds `parseInterface` reads are
  // `isPropertySignature` -> `properties` and `isMethodSignature` ->
  // `methods`. Three consequences worth stating because each is a decision,
  // not an accident:
  //
  //   - CALL SIGNATURES (`(x: string): void`) and INDEX SIGNATURES
  //     (`[k: string]: number`) do NOT count. They are not merely excluded
  //     here — `parseInterface` never collects them into EITHER list, so they
  //     are already absent from the converter's input on both lanes and this
  //     predicate cannot see them. Making them count would require analyzer
  //     work first (a separate concern: they have no name, and both
  //     `DtoFieldNode` and `ClassNode.methods` are name-keyed), and the DTO
  //     lane drops them identically today, so no behavior regresses by
  //     leaving them out.
  //   - FUNCTION-TYPED PROPERTIES (`save: (row: string) => void`) do NOT
  //     count. The memo's Q1 recommended folding them in; reading the analyzer
  //     shows why that is the wrong call HERE: TypeScript parses them as
  //     `PropertySignature`, so they arrive as `ParsedProperty` carrying a
  //     real type string that the DTO lane renders faithfully as a field.
  //     Counting them would move a member that currently converts CORRECTLY
  //     into `ClassNode.methods`, which is a bare `readonly string[]` with no
  //     type surface — trading a good field for a lossy method name. Gap 69 is
  //     about members that are DROPPED, and a function-typed property is not
  //     dropped. Keeping the split on the analyzer's own syntactic partition
  //     also means the rule is checkable by reading one predicate, per the
  //     memo's "second, arbitrary classification rule" caution — the line just
  //     falls where TypeScript's own grammar already put it.
  //
  // HERITAGE IS PART OF THE SHAPE. The decision reads the whole resolved
  // inheritance chain, not own members: `interface Child extends HasMethod {}`
  // inherits a method contract while declaring nothing, and classifying it on
  // own members alone emitted a fieldless `Child %` with no `<: HasMethod`
  // edge and no diagnostic — gap 69's own symptom, one level up. The walk
  // lives in `resolveInterfaceIsMethodBearing`, is computed once per program
  // by `predictInterfaceKinds`, and its result is READ here rather than
  // recomputed, so the dispatcher and `isDTOLikeType` cannot disagree.
  //
  // Deliberately `.length > 0` over lists the analyzer populates, never a
  // re-parse of source text: no new failure mode.
  private isMethodBearingInterface(iface: ParsedInterface): boolean {
    return this.interfacesPredictedClassKind.has(iface.name);
  }

  // Gap 69/67 dispatcher. Every call site that used to call
  // `convertInterfaceToDTO` unconditionally now calls this, so the two lanes
  // stay in lockstep across all three module-conversion paths
  // (`processModule`'s own loop, `convertToClassFile`, and
  // `convertToSeparateEntities`) — three sites, one rule.
  //
  // NOTHING THIS DISPATCHER DROPS IS DROPPED SILENTLY. That is the standard
  // fixture 69's own header sets ("silent data loss, not a surfaced failure.
  // Every other gap on this rung announces itself"), and it applies to the fix
  // as much as to the bug. Both lanes emit a warning through the existing
  // `addWarning` channel for every member the language cannot carry:
  //
  //   - Class lane, mixed interface -> properties dropped (ClassNode has no
  //     field surface). Warned in `convertInterfaceToClass`.
  //   - Either lane, unresolvable parent -> the chain could not be inspected,
  //     so the classification rests on own members alone. Warned here.
  //
  // The remaining known-lossy case is a property-only interface extending
  // another interface: the DTO lane reads `iface.extends` nowhere, so
  // inherited FIELDS do not flatten in. That predates this change and is not
  // widened by it (flattening on one lane only would make the lanes
  // inconsistent in a new way), but it is no longer silent either — an
  // unresolvable parent warns, and a resolvable method-bearing parent now
  // moves the child to the Class lane instead of vanishing.
  private convertInterface(iface: ParsedInterface): void {
    if (this.interfacesWithUnresolvedHeritage.has(iface.name)) {
      const unresolved = iface.extends
        .map((parent) => this.stripGenericArguments(parent))
        .filter((parent) => !this.interfacesByName.has(parent));
      this.addWarning(
        `Interface '${iface.name}' extends ${unresolved.map((parent) => `'${parent}'`).join(', ')}, which could not be resolved in this program, ` +
          `so its members could not be inspected; '${iface.name}' was classified from its own members alone.`,
        undefined,
        'If the parent declares methods, the extracted entity may be a DTO where a Class was intended. Include the module that declares the parent in the traversal, or restate the inherited methods on this interface.',
      );
    }

    if (this.isMethodBearingInterface(iface)) {
      this.convertInterfaceToClass(iface);
      return;
    }
    this.convertInterfaceToDTO(iface);
  }

  // The Class lane for a method-bearing interface. Mirrors `convertClass`
  // (the `class` declaration path) exactly in entity shape — same ClassNode,
  // same `<:` raw form, same single-inheritance `extends` slot, same
  // `implements` list — so a method-bearing interface and a class that
  // implements it become the same KIND of thing, which is precisely what
  // makes `implements` resolvable (VALID_REFERENCES.implements is
  // `to: ['Class','ClassFile']`).
  //
  // DELIBERATELY a plain ClassNode, never a ClassFileNode: the Class/ClassFile
  // decision in `processModule` is a statement about a MODULE (does this file
  // fuse with its primary class?), and it is made per-module before any
  // interface is reached. An interface is a member of a module, never the
  // module itself — `convertClass`, the sibling path for non-primary class
  // declarations, emits a plain ClassNode for the identical reason. Emitting a
  // ClassFile here would require inventing a path for an entity that owns no
  // file, and would collide with the real ClassFile the module may already
  // have produced.
  //
  // INHERITANCE, IN BOTH DIRECTIONS. `iface.extends` is threaded through the
  // SAME `extends`(first)/`implements`(rest) split `convertClass` uses, so
  // multiple interface parents survive as `implements` targets rather than
  // being silently truncated to the first. Both directions of the parent/child
  // relationship matter here, and an earlier revision of this comment argued
  // only the first:
  //
  //   - CHILD IS METHOD-BEARING, PARENT IS PROPERTY-ONLY. The parent converts
  //     to a DTO, so the child names a DTO in an inherit slot. That used to be
  //     illegal; the companion change to `VALID_REFERENCES.extends`/
  //     `.implements` (gap 67) makes a DTO a legal inherit target, so the edge
  //     now resolves. Inherited FIELDS still do not flatten into the child —
  //     the DTO lane reads `iface.extends` nowhere either, so flattening on
  //     one lane only would make the lanes inconsistent in a new way.
  //   - PARENT IS METHOD-BEARING, CHILD DECLARES NOTHING (or only properties).
  //     This is the direction that was BROKEN, not merely lossy:
  //     `isMethodBearingInterface` read own members only, so
  //     `interface Child extends HasMethod {}` took the DTO lane and emitted a
  //     fieldless `Child %` with no `<: HasMethod` edge and no diagnostic —
  //     the inherited method contract was unreachable through the child, which
  //     is gap 69's exact symptom one level up. The shape decision now runs
  //     over the resolved heritage chain
  //     (`resolveInterfaceIsMethodBearing`), so such a child takes the Class
  //     lane and keeps its `<: Parent` edge. An unresolvable parent falls back
  //     to the own-member rule AND warns (`convertInterface`), so the fallback
  //     is never silent.
  //
  // PROPERTY LOSS IS THE KNOWN, ACCEPTED COST — and, since the review of
  // PR #162, a WARNED one. A ClassNode has no field surface at all —
  // class-node.ts declares exactly `implements`, `methods`, `extends`,
  // `purpose`, and grammar.md's Class production (`<name> <: [<inherit_list>]`
  // with a `=> [...]` methods continuation) offers no place to put a property.
  // So a MIXED interface (properties AND methods) loses its properties on this
  // lane, exactly as it lost its methods on the DTO lane before this change.
  // There is no third option inside the current grammar: the only lossless fix
  // would add a field surface to Class or a method surface to DTO, which is
  // the memo's rejected Option 2/3 (a language change). What this change buys
  // is that the loss falls on the members the language CANNOT model instead of
  // the ones it CAN — a method has no representation as a DTO field, while a
  // property at least had one — and that it ANNOUNCES ITSELF. Emitting the
  // Class silently would have reproduced the very failure mode fixture 69's
  // header names as the most severe on its rung, merely pointed the other way.
  // Measured on the corpora (typed-mind-lang, slat-harness, code-outline-cli):
  // ~643 interfaces, ~43 method-bearing, ~17 mixed — so ~2.6% of interfaces
  // trade property fidelity for method fidelity, and ~97% are untouched. The
  // counts drift by one or two between runs because all three corpora are live
  // working trees; the ratio is what the decision rests on.
  private convertInterfaceToClass(iface: ParsedInterface): void {
    const entityName = createEntityName(iface.name);

    if (this.entityNames.has(entityName)) {
      this.addError(`Duplicate entity name: ${entityName}`);
      return;
    }

    this.addEntityName(entityName, 'convertInterfaceToClass');

    // The disclosed property loss, surfaced. See this method's own
    // PROPERTY LOSS note above for why the loss is unavoidable inside the
    // current grammar, and why announcing it is not optional.
    if (iface.properties.length > 0) {
      const propertyNames = iface.properties.map((prop) => prop.name);
      // "declares" vs "inherits" is not cosmetic: a reader looking at
      // `interface Child extends HasMethod { id: string }` sees no method in
      // the declaration, so a message claiming it declares one sends them
      // hunting for a member that is not there.
      const methodSource = iface.methods.length > 0 ? 'declares methods' : 'inherits methods from an interface it extends';
      this.addWarning(
        `Interface '${iface.name}' ${methodSource}, so it converts to a Class; a Class has no field surface, so ` +
          `${propertyNames.length} ${propertyNames.length === 1 ? 'property is' : 'properties are'} dropped: ${propertyNames.join(', ')}`,
        undefined,
        'Split the data members into a separate property-only interface (which converts to a DTO) if the fields must survive extraction.',
      );
    }

    // The inherit targets are recorded VERBATIM, type arguments included, so
    // `extends Repo<Item>` emits `<: Repo<Item>`. That is intentional and
    // matches `convertClass` (the real-class lane) exactly: dropping the
    // arguments is PR #152's original bug, and
    // slat-harness-mixin-heritage-controls.test.ts pins the verbatim form as
    // property 1 of the #152/#153 reconciliation, warning that silencing the
    // resulting diagnostic "would pressure a future author to reintroduce the
    // bug". The unresolvable generic base is gap 68's territory (type
    // parameters are unmodeled language-wide), NOT a defect of this lane —
    // fixture 69d pins both lanes together so neither can be changed alone.
    // `stripGenericArguments` is applied only to the heritage LOOKUP
    // (`resolveInterfaceIsMethodBearing`), never to the emitted text.
    const inheritList = [...iface.extends];
    const classEntity = new ClassNode({
      name: entityName,
      span: SYNTHETIC_SPAN,
      raw: `${entityName} <: ${inheritList.join(', ')}`,
      sourceForm: 'shortform',
      // TypedMind supports single inheritance in the `extends` slot; every
      // further parent lands in `implements`, the same split `convertClass`
      // performs on a class's own heritage.
      extends: inheritList[0] || undefined,
      implements: this.convertImplementsList(inheritList.slice(1), []),
      // Private/protected modifiers do not exist on a `MethodSignature`, so
      // there is no `includePrivateMembers` filter to apply here — every
      // method an interface declares is part of its public contract by
      // construction. This is why the method list is taken directly rather
      // than through `convertMethods` (which filters `isPrivate` on a
      // ParsedClass).
      methods: iface.methods.map((method) => method.name),
      purpose: iface.description ? collapseDescription(iface.description) : undefined,
    });

    this.entities.push(classEntity);
  }

  private convertInterfaceToDTO(iface: ParsedInterface): void {
    const entityName = createEntityName(iface.name);

    if (this.entityNames.has(entityName)) {
      this.addError(`Duplicate entity name: ${entityName}`);
      return;
    }

    this.addEntityName(entityName, 'convertInterfaceToDTO');

    const fields = iface.properties.map((prop) => {
      // RC-D (ladder-diagnostic-disposition-2026-08-29.md rank 3, issue
      // #101) — issue #72's nested-inline-object-literal recursion
      // (`isInlineObjectLiteralType`/`synthesizeInlineDTO`) was wired only
      // into the function-parameter/return-type call sites
      // (`extractInputDTO`/`extractOutputDTO`); this field-building loop
      // emitted `prop.type` sanitized only by `.trim()` (via
      // `sanitizeFieldType`'s fallthrough), preserving source newlines
      // verbatim for a multi-line-authored inline object-literal property —
      // the exact `NotionPropertySchema.relation` shape (a two-level-nested
      // object literal authored across 10 lines) that produced 9
      // `syntax/*` "Unparsable text" findings. Checking
      // `isInlineObjectLiteralType` here, BEFORE `sanitizeFieldType` runs,
      // and routing a match through `synthesizeInlineDTO` mirrors
      // `extractInputDTO`/`extractOutputDTO`'s own "detect the special
      // shape ahead of the general path" pattern exactly — including
      // `synthesizeInlineDTO`'s own nested-recursion (a doubly-nested inline
      // object literal keeps recursing) and its brace-depth-aware
      // `splitObjectLiteralProperties` splitter (multi-line-safe by
      // construction: it treats `\n` as a delimiter only at brace-depth
      // zero, so a nested `{`/`}` pair's own newlines never desync the
      // split). The nested DTO's name is derived from THIS DTO's own name
      // plus the field name, the same `${dtoName}_${prop.name}` convention
      // `parseInlineObjectLiteralToFields` already establishes for a
      // function-signature-originated nested DTO.
      if (isInlineObjectLiteralType(prop.type)) {
        const nestedDtoName = this.synthesizeInlineDTO(prop.type, this.sanitizeEntityName(`${entityName}_${prop.name}`));
        const typeExpr = parseTypeExprText(nestedDtoName).typeExpr;
        return new DtoFieldNode({
          name: prop.name,
          type: nestedDtoName,
          typeExpr,
          optionalityMarker: prop.isOptional ? 'question' : 'none',
          span: SYNTHETIC_SPAN,
        });
      }

      // Fixture 74 — the generic-wrapped form of the branch above. The
      // inner literal synthesizes its own DTO through the SAME recursion,
      // and the wrapper is rebuilt around the synthesized name so the
      // emitted type is `Array<WorkerPayload_references>`: a legal
      // generic over a real entity name, which keeps the collection
      // nature of the field instead of flattening it away.
      const genericWrapped = splitGenericWrappedObjectLiteral(prop.type);

      if (genericWrapped) {
        const nestedDtoName = this.synthesizeInlineDTO(genericWrapped.inner, this.sanitizeEntityName(`${entityName}_${prop.name}`));
        const wrappedType = `${genericWrapped.wrapper}<${nestedDtoName}>`;
        const typeExpr = parseTypeExprText(wrappedType).typeExpr;
        this.walkGenericArgsForExternalStubs(typeExpr);
        return new DtoFieldNode({
          name: prop.name,
          type: wrappedType,
          typeExpr,
          optionalityMarker: prop.isOptional ? 'question' : 'none',
          span: SYNTHETIC_SPAN,
        });
      }

      const type = this.sanitizeFieldType(prop.type);
      // RFC-TM-8 §2 (rfc-tm-8-diamond.md, X-TYPE-2): the converter builds a
      // synthetic DtoFieldNode from an already-sanitized type string, not a
      // parsed CST subtree — parseTypeExprText (the same hand-rolled parser
      // the longform `type:` quoted-string value reuses) gives it a real
      // TypeExprNode instead of leaving the field's structure unpopulated.
      const typeExpr = parseTypeExprText(type).typeExpr;
      // D-LEG-2 (rfc-tm-10-diamond.md §2, issue #65) — every TypeExprNode
      // reachable from a DTO field is walked for a generic-argument
      // external type needing a Dependency-exports stub.
      this.walkGenericArgsForExternalStubs(typeExpr);
      return new DtoFieldNode({
        name: prop.name,
        type,
        typeExpr,
        optionalityMarker: prop.isOptional ? 'question' : 'none',
        span: SYNTHETIC_SPAN,
      });
    });

    const dtoEntity = new DtoNode({
      name: entityName,
      span: SYNTHETIC_SPAN,
      raw: `${entityName} %`,
      sourceForm: 'shortform',
      fields,
      purpose: iface.description ? collapseDescription(iface.description) : undefined,
    });

    this.entities.push(dtoEntity);
  }

  private convertTypeAliasToDTO(typeAliasInput: { name: string; type: string; description?: string }): void {
    const entityName = createEntityName(typeAliasInput.name);

    if (this.entityNames.has(entityName)) {
      this.addError(`Duplicate entity name: ${entityName}`);
      return;
    }

    // Fixture 90 (mail-agent `src/harness/envelope.ts:266` `DispatchResult`,
    // `src/store/revert.ts:47` `RevertOutcome`) — TypeScript allows an
    // OPTIONAL LEADING `|` on a union, which is how a multi-line union is
    // conventionally authored, and is the house style for a
    // `kind`-discriminated result/failure union:
    //
    //   type DispatchResult =
    //     | { kind: 'none'; reason: string }
    //     | { kind: 'reply'; text: string };
    //
    // Two defects compounded on this shape. First, the leading `|` is a
    // separator with nothing before it, so `splitTopLevelUnionMembers`
    // yielded an EMPTY first member; `isUnionOfObjectLiterals` then failed
    // its `.every(isInlineObjectLiteralType)` test on that empty string and
    // returned false, so `isObjectLikeType`'s naive `includes('{')` fallback
    // routed the union down the DTO branch below — where the brace-slice
    // found no `name: type` pairs and emitted a FIELDLESS `DispatchResult %`
    // with every member silently dropped. Second, even once classified onto
    // the TypeDef alias lane, the raw multi-line text (leading `|`, interior
    // newlines, and any interleaved `//` comment between members) flowed
    // verbatim into `raw` and `parseTypeExprText`, emitting `X = |`.
    //
    // Normalizing here — once, before either lane reads it — fixes both:
    // the alias text becomes the single-line form that already worked.
    const typeAlias = { ...typeAliasInput, type: normalizeUnionAliasText(typeAliasInput.type) };

    // Convert object-like type aliases to DTOs (unchanged by X-CONV-2 —
    // this shape stays a DTO regardless of the TM-8 TypeDef surface).
    if (this.isObjectLikeType(typeAlias.type)) {
      this.addEntityName(entityName, 'convertTypeAliasToDTO-objectLike');

      // RC-D (ladder-diagnostic-disposition-2026-08-29.md rank 3, issue
      // #101) — this branch used to route through `parseTypeToFields`,
      // which calls the naive `parseObjectProperties`
      // (`content.split(/[;,\n]/)`) — unsound the moment a field's own type
      // contains a nested `{`/`}` pair (its OWN `;`/`,`/`\n` characters are
      // wrongly treated as sibling-field boundaries), and with no
      // `isInlineObjectLiteralType` check to recurse into a nested object
      // literal as a synthesized DTO. The exact repro:
      // `IngestEnv`'s sole field `Variables` is itself an inline object
      // literal authored across 10 lines — `parseTypeToFields` emitted a
      // bare, unterminated `{` as the field's type text (`syntax/*` "Missing
      // `}`"). `parseInlineObjectLiteralToFields` is the SAME
      // brace-depth-aware, multi-line-safe, recursion-capable parser
      // `synthesizeInlineDTO` already uses for a function-signature-
      // originated inline object literal (see that method's own doc
      // comment) — reused here directly rather than re-derived, since this
      // type alias's top-level DTO entity (`entityName`) already exists,
      // unlike `synthesizeInlineDTO`'s own call sites which construct a NEW
      // nested DTO from scratch.
      const dtoEntity = new DtoNode({
        name: entityName,
        span: SYNTHETIC_SPAN,
        raw: `${entityName} %`,
        sourceForm: 'shortform',
        fields: this.parseInlineObjectLiteralToFields(typeAlias.type, entityName),
        purpose: typeAlias.description ? collapseDescription(typeAlias.description) : undefined,
      });

      this.entities.push(dtoEntity);
      return;
    }

    // RFC-TM-9 §4 (rfc-tm-9-diamond.md, X-CONV-2) — every other shape (union
    // type aliases like `EntityType`, and simple aliases to a named type or
    // primitive) is TM-8's TypeDef entity kind, `variant: 'alias'`, replacing
    // the deleted converter path that emitted a self-referential Constants
    // schema (`Name ! path : Name`, which the checker rejected by the
    // language's own design — L-g3/A-g9). The aliased type becomes a real
    // TypeExprNode via
    // the same hand-rolled parser DtoFieldNode construction already uses
    // (parseTypeExprText), so a DTO field typed by this alias resolves
    // through the checker's schema-position rules (valid-references.ts
    // `schema.to` includes 'TypeDef') instead of tripping
    // `Cannot use 'schema' to reference <kind>`.
    this.addEntityName(entityName, 'convertTypeAliasToDTO-alias');

    const aliasType = parseTypeExprText(typeAlias.type).typeExpr;
    // D-LEG-2 (rfc-tm-10-diamond.md §2, issue #65) — walk the alias's
    // TypeExprNode for any generic-argument external type needing a
    // Dependency-exports stub.
    this.walkGenericArgsForExternalStubs(aliasType);

    const typeDefEntity = new TypeDefNode({
      name: entityName,
      span: SYNTHETIC_SPAN,
      raw: `${entityName} = ${typeAlias.type}`,
      sourceForm: 'shortform',
      variant: 'alias',
      aliasType,
      purpose: typeAlias.description ? collapseDescription(typeAlias.description) : undefined,
    });

    this.entities.push(typeDefEntity);
  }

  // RFC-TM-9 §4 (rfc-tm-9-diamond.md, X-CONV-2) — a real TS `enum` emits as
  // TM-8's TypeDef entity kind, `variant: 'enum'`, carrying the member-name
  // list from X-AN-7's ParsedEnum. Replaces the pre-TM-9 path where an enum
  // fell through to the generic Constants lane with its member list dropped
  // entirely (the analyzer captured `isEnum`/`enumValues` but the converter
  // never read them — confirmed zero references before this Quantum).
  private convertEnumToTypeDef(enumDef: { name: string; members: readonly string[]; description?: string }): void {
    const entityName = createEntityName(enumDef.name);

    if (this.entityNames.has(entityName)) {
      this.addError(`Duplicate entity name: ${entityName}`);
      return;
    }

    this.addEntityName(entityName, 'convertEnumToTypeDef');

    const typeDefEntity = new TypeDefNode({
      name: entityName,
      span: SYNTHETIC_SPAN,
      raw: `${entityName} = enum [${enumDef.members.join(', ')}]`,
      sourceForm: 'shortform',
      variant: 'enum',
      members: enumDef.members,
      purpose: enumDef.description ? collapseDescription(enumDef.description) : undefined,
    });

    this.entities.push(typeDefEntity);
  }

  private convertConstants(module: ParsedModule): void {
    if (module.constants.length === 0) {
      return;
    }

    // Create individual Constants entities for each exported constant
    for (const constant of module.constants) {
      if (this.isConstantExported(constant, module)) {
        this.createConstantEntity(constant, module);
      }
    }
  }

  private createConstantEntity(constant: { name: string; type: string; value?: string }, module: ParsedModule): void {
    const entityName = createEntityName(constant.name);

    if (this.entityNames.has(entityName)) {
      // Skip if already created - avoid duplicates
      return;
    }

    this.entityNames.add(entityName);

    // Use the real path - multiple constants can share the same file path
    const realPath = this.getRelativePath(module.filePath);

    const constantSchema = constant.type && constant.type !== 'any' ? this.convertTypeToSchema(constant.type) : undefined;

    const constantsEntity = new ConstantsNode({
      name: entityName,
      span: SYNTHETIC_SPAN,
      raw: `${entityName} ! ${realPath}`,
      sourceForm: 'shortform',
      path: realPath,
      // Add schema information if we can infer it from the type.
      // `convertTypeToSchema` returns '' for a type with no grammatical
      // entity_name rendering; normalize that to `undefined` so the emitter
      // omits the `:` slot entirely rather than emitting a dangling one.
      schema: constantSchema === '' ? undefined : constantSchema,
    });

    this.entities.push(constantsEntity);
  }

  // SST-referenced-module orphan flags (issue #52's own PR #74 closing
  // comment; lead-authorized amendment extending the X-AN-11 mechanism,
  // half 1 of 2 — half 2 is `resolveSstHandlerExportNames`'s exports-push
  // below). A recognizer-resolved `handler: "path.member"` string is an
  // import-by-convention: the infra module genuinely names the target
  // module as its deployable, so the SOURCE File gains the TARGET File's
  // entity name in its `imports` list — a true statement using the
  // existing `FileNode.imports` field, no new AST surface. This
  // independently clears `checker/orphaned-file` on the target module
  // (`check-orphans.ts`'s `collectReferencedNames` unions every name in
  // every File's `imports`, with no distinction between an individual
  // entity name and a whole File's name).
  //
  // Runs as a POST-PASS after `convertModules` completes (rather than
  // threading `sstHandlerReferences` into `processModule`/
  // `convertToSeparateEntities` directly) to sidestep an ordering hazard:
  // `fileEntityNameByModulePath` for the TARGET module is only guaranteed
  // populated once that module's own File/ClassFile entity has been
  // constructed, and `modules` processes in an arbitrary order relative to
  // the source module — the same class of hazard `reserveNamedTypeEntityNames`'s
  // own whole-run pre-pass (see its call site's comment above) already
  // fought for named-type collisions. A post-pass over the FINISHED entity
  // list has no such ordering dependency.
  //
  // Only the entry-point File is ever a valid SOURCE for this fold
  // (`processModule`'s `!isEntryPoint` gate forces every entry point
  // through `convertToSeparateEntities`, never `convertToClassFile` — see
  // that call site), so the source side is always a `FileNode`, never a
  // `ClassFileNode`. `FileNode.imports` is readonly, so a source File that
  // needs the fold is REPLACED in `this.entities` with an equivalent
  // `FileNode` carrying the augmented `imports` array; every other field
  // is copied verbatim.
  private foldSstHandlerImportsIntoSourceFiles(sstHandlerReferences: readonly SstHandlerReference[]): void {
    for (const reference of sstHandlerReferences) {
      const sourceFileEntityName = this.fileEntityNameByModulePath.get(reference.sourceModule);
      const targetFileEntityName = this.fileEntityNameByModulePath.get(reference.resolvedAbsolutePath);
      if (sourceFileEntityName === undefined || targetFileEntityName === undefined) {
        // The recognizer's own not-found/not-exported diagnostics (X-DIAG-1)
        // already cover an unresolved target; a target module that was
        // resolved but never converted to a File (e.g. filtered out by an
        // ignore pattern) degrades silently here rather than crashing —
        // this fold only ever adds an entity name it can prove exists.
        continue;
      }

      const sourceIndex = this.entities.findIndex((entity) => entity instanceof FileNode && entity.name === sourceFileEntityName);
      const sourceFile = this.entities[sourceIndex];
      if (sourceIndex === -1 || !(sourceFile instanceof FileNode)) {
        continue;
      }

      if (sourceFile.imports.includes(targetFileEntityName)) {
        // Already present (a second handler string in the same source file
        // resolving into the same target module, or a re-run) — no
        // duplicate entry.
        continue;
      }

      this.entities[sourceIndex] = new FileNode({
        name: sourceFile.name,
        span: sourceFile.span,
        raw: sourceFile.raw,
        comment: sourceFile.comment,
        sourceForm: sourceFile.sourceForm,
        path: sourceFile.path,
        imports: [...sourceFile.imports, targetFileEntityName],
        exports: sourceFile.exports,
        reExports: sourceFile.reExports,
        purpose: sourceFile.purpose,
      });
    }
  }

  // RC-E (issue #107) — a dynamic `import()` nested at any expression depth
  // (a `lazy(() => import('./pages/Home.js'))`-shaped call, not only a
  // top-level/statement-level `import(...)`) never produced an import-graph
  // edge: `TypeScriptAnalyzer`'s visitor walk (X-AN-2) already discovers the
  // specifier regardless of nesting depth — `ts.forEachChild` recurses
  // unconditionally into call arguments and arrow-function bodies — and
  // records it in both `module.dynamicImportSpecifiers` and
  // `analysis.moduleGraph` (X-AN-1, "covers static imports, re-exports, and
  // dynamic imports uniformly"). But `convertImports` never reads
  // `module.dynamicImportSpecifiers` at all, so the specifier's resolved
  // target — even though it gets traversed and converted into its own real
  // entity — was never folded into the IMPORTING module's own `imports:`
  // list. `check-orphans.ts`'s orphan check only looks at what a File's
  // `imports` name, so the target module and everything it exports read as
  // permanently unreferenced.
  //
  // Fixed the same way as the SST-handler fold immediately above (a
  // post-pass over the finished entity list, sidestepping the same
  // ordering hazard: the TARGET module's File/ClassFile entity name is only
  // guaranteed final once every module has been converted). For each
  // module's own `dynamicImportSpecifiers`, resolve the specifier through
  // `moduleGraphResolution` (populated at the top of `convert()` from
  // `analysis.moduleGraph`, which already covers dynamic imports) to get
  // the target's project-relative path, then through
  // `fileEntityNameByRelativePath` to get its final entity name. A
  // `lazy()`-wrapped dynamic import has no bound import name (the whole
  // module namespace is the target, not one named export) — unlike a named
  // import, there is no `resolveImportToEntity`-style named-symbol
  // resolution to attempt first; naming the target File/ClassFile entity
  // itself is the correct and only nameable reference here, and `File` is
  // `imports.to`-legal (valid-references.ts) so this is not a reference-
  // legality violation.
  // Fixture 72 — a SIDE-EFFECT import (`import './components/widget.ts'`)
  // binds no name: `ParsedImport` carries no `defaultImport`, no
  // `namedImports`, no `namespaceImport`. `convertImports` iterates exactly
  // those three binding kinds, so a bindingless import contributes NOTHING
  // to the importing File's `imports:` list — the module edge that the
  // analyzer resolved (X-AN-1, recorded in `moduleGraphResolution`) is
  // dropped on the floor at conversion time.
  //
  // This is the custom-elements registration idiom: a Lit/vanilla web
  // component module's entire purpose is its `customElements.define(...)`
  // side effect, and the app entry imports it for that effect alone. The
  // result is a false `Orphaned file` for EVERY component in the app (18 of
  // them on the architecture-notebook web target) plus a false `Orphaned
  // entity` for each component class — the file is genuinely imported, so
  // the diagnostic is a false statement about the graph.
  //
  // Structurally identical to RC-E's `lazy(() => import('./Home.js'))` case
  // (issue #107) — "a real edge with no bound name" — and fixed the same
  // way: fold the TARGET's File/ClassFile entity name into the importer's
  // `imports:` list, so `isFileConsumed` sees the file as consumed.
  //
  // Unlike RC-E, no default export is folded: a side-effect import makes no
  // claim about any particular symbol (there is no `lazy()`-style contract
  // that the module default-exports the thing being used). Folding only the
  // File name states exactly what the source states — this file is loaded —
  // and nothing more. A component class that is genuinely never referenced
  // by name stays orphaned, which is the true reading.
  private foldSideEffectImportsIntoSourceFiles(modules: readonly ParsedModule[]): void {
    for (const module of modules) {
      const sideEffectSpecifiers = (module.imports ?? [])
        .filter(
          (imp) => imp.defaultImport === undefined && imp.namespaceImport === undefined && imp.namedImports.length === 0 && !imp.isTypeOnly,
        )
        .map((imp) => imp.specifier);
      if (sideEffectSpecifiers.length === 0) {
        continue;
      }

      const sourceRelativePath = this.getRelativePath(module.filePath);
      const sourceFileEntityName = this.fileEntityNameByRelativePath.get(this.stripKnownSourceExtension(sourceRelativePath));
      if (sourceFileEntityName === undefined) {
        continue;
      }

      for (const specifier of sideEffectSpecifiers) {
        if (this.isExternalPackage(specifier)) {
          // `import 'some-polyfill'` — external packages are Dependency
          // entities and are never subject to the orphan rule this fold
          // exists to correct.
          continue;
        }

        const resolvedTarget = this.moduleGraphResolution.get(
          TypeScriptToTypedMindConverter.moduleGraphResolutionKey(sourceRelativePath, specifier),
        );
        if (resolvedTarget === undefined) {
          // Genuinely unresolved — the analyzer already surfaced its own
          // `unresolvable-import` diagnostic. Nothing to fold.
          continue;
        }

        const targetFileEntityName = this.fileEntityNameByRelativePath.get(this.stripKnownSourceExtension(resolvedTarget));
        if (targetFileEntityName === undefined || targetFileEntityName === sourceFileEntityName) {
          continue;
        }

        this.foldImportNamesIntoFileEntity(sourceFileEntityName, [targetFileEntityName]);
      }
    }
  }

  // Shared by `foldSideEffectImportsIntoSourceFiles` — rebuilds a File or
  // ClassFile entity with additional `imports:` names, preserving every
  // other field. A no-op when the entity is missing, is neither node kind,
  // or already carries all the names.
  private foldImportNamesIntoFileEntity(sourceFileEntityName: string, namesToFold: readonly string[]): void {
    const sourceIndex = this.entities.findIndex((entity) => entity.name === sourceFileEntityName);
    const sourceEntity = this.entities[sourceIndex];
    if (sourceIndex === -1 || (!(sourceEntity instanceof FileNode) && !(sourceEntity instanceof ClassFileNode))) {
      return;
    }

    const newNames = namesToFold.filter((name) => !sourceEntity.imports.includes(name));
    if (newNames.length === 0) {
      return;
    }

    this.entities[sourceIndex] =
      sourceEntity instanceof FileNode
        ? new FileNode({
            name: sourceEntity.name,
            span: sourceEntity.span,
            raw: sourceEntity.raw,
            comment: sourceEntity.comment,
            sourceForm: sourceEntity.sourceForm,
            path: sourceEntity.path,
            imports: [...sourceEntity.imports, ...newNames],
            exports: sourceEntity.exports,
            reExports: sourceEntity.reExports,
            purpose: sourceEntity.purpose,
          })
        : new ClassFileNode({
            name: sourceEntity.name,
            span: sourceEntity.span,
            raw: sourceEntity.raw,
            comment: sourceEntity.comment,
            sourceForm: sourceEntity.sourceForm,
            path: sourceEntity.path,
            implements: sourceEntity.implements,
            methods: sourceEntity.methods,
            imports: [...sourceEntity.imports, ...newNames],
            exports: sourceEntity.exports,
            extends: sourceEntity.extends,
            purpose: sourceEntity.purpose,
          });
  }

  private foldDynamicImportsIntoSourceFiles(modules: readonly ParsedModule[]): void {
    for (const module of modules) {
      // `?? []` — same defensive-optional convention `isPureTypesFile`
      // already uses for `module.enums`: a handful of pre-existing unit
      // tests build a `ParsedModule` mock via an `as ParsedModule` cast that
      // bypasses the compiler's field check, omitting `dynamicImportSpecifiers`
      // entirely. The real analyzer always sets it (`analyzeModule` always
      // returns the field); this guard is for those mocks, not a
      // real-world code path.
      const dynamicImportSpecifiers = module.dynamicImportSpecifiers ?? [];
      if (dynamicImportSpecifiers.length === 0) {
        continue;
      }

      const sourceRelativePath = this.getRelativePath(module.filePath);
      const sourceFileEntityName = this.fileEntityNameByRelativePath.get(this.stripKnownSourceExtension(sourceRelativePath));
      if (sourceFileEntityName === undefined) {
        continue;
      }

      for (const specifier of dynamicImportSpecifiers) {
        if (this.isExternalPackage(specifier)) {
          // A dynamic import of an external package (`import('lodash')`) is
          // out of scope — external packages are Dependency entities, and
          // `lazy(() => import('some-npm-package'))` is not the false-
          // orphan shape issue #107 names (the code-splitting idiom is
          // always a relative, internal specifier).
          continue;
        }

        const resolvedTarget = this.moduleGraphResolution.get(
          TypeScriptToTypedMindConverter.moduleGraphResolutionKey(sourceRelativePath, specifier),
        );
        if (resolvedTarget === undefined) {
          // Genuinely unresolved (analyzer already surfaced its own
          // `unresolvable-import`/`non-literal-dynamic-import` diagnostic
          // for this case) — nothing to fold.
          continue;
        }

        const targetFileEntityName = this.fileEntityNameByRelativePath.get(this.stripKnownSourceExtension(resolvedTarget));
        if (targetFileEntityName === undefined || targetFileEntityName === sourceFileEntityName) {
          continue;
        }

        // RC-E follow-up (webhookstorage live-ladder ground-truth,
        // 2026-08-30) — `lazy(() => import('./pages/Home.js'))` has no
        // bound import name in source (unlike a static `import Home from
        // './pages/Home.js'`), so folding ONLY the target's File entity
        // name leaves the target's own DEFAULT-EXPORTED entity (`Home`,
        // the actual rendered component) unreferenced: `checkOrphans`'s
        // `collectReferencedNames` treats a File name in `imports:` as a
        // reference to THAT FILE, never transitively to the symbols it
        // exports — the same reason a real webhookstorage/web-app run
        // still flagged `Orphaned entity 'Dashboard'` etc. even after the
        // File-level fold. A `lazy()`-wrapped dynamic import always
        // targets a default-exported component in real corpus usage (the
        // preact-iso/React.lazy contract requires a module whose default
        // export is the lazy-loaded component); resolve that default
        // export the same way a static default import would
        // (`resolveImportToEntity`, reusing its existing
        // moduleGraphResolution/exportRegistry chain) and fold it in
        // alongside the File name when present.
        const targetModuleExports =
          this.exportRegistry[this.stripKnownSourceExtension(resolvedTarget)] ??
          this.exportRegistry[specifier] ??
          this.exportRegistry[this.stripKnownSourceExtension(specifier)];
        const targetDefaultExportEntityName =
          targetModuleExports?.defaultExport !== undefined
            ? this.resolveImportToEntity(module.filePath, targetModuleExports.defaultExport, specifier)
            : undefined;

        const namesToFold = [targetFileEntityName, targetDefaultExportEntityName].filter((name): name is string => name !== undefined);

        const sourceIndex = this.entities.findIndex((entity) => entity.name === sourceFileEntityName);
        const sourceEntity = this.entities[sourceIndex];
        if (sourceIndex === -1 || (!(sourceEntity instanceof FileNode) && !(sourceEntity instanceof ClassFileNode))) {
          continue;
        }

        const newNames = namesToFold.filter((name) => !sourceEntity.imports.includes(name));
        if (newNames.length === 0) {
          continue;
        }

        this.entities[sourceIndex] =
          sourceEntity instanceof FileNode
            ? new FileNode({
                name: sourceEntity.name,
                span: sourceEntity.span,
                raw: sourceEntity.raw,
                comment: sourceEntity.comment,
                sourceForm: sourceEntity.sourceForm,
                path: sourceEntity.path,
                imports: [...sourceEntity.imports, ...newNames],
                exports: sourceEntity.exports,
                reExports: sourceEntity.reExports,
                purpose: sourceEntity.purpose,
              })
            : new ClassFileNode({
                name: sourceEntity.name,
                span: sourceEntity.span,
                raw: sourceEntity.raw,
                comment: sourceEntity.comment,
                sourceForm: sourceEntity.sourceForm,
                path: sourceEntity.path,
                implements: sourceEntity.implements,
                methods: sourceEntity.methods,
                imports: [...sourceEntity.imports, ...newNames],
                exports: sourceEntity.exports,
                extends: sourceEntity.extends,
                purpose: sourceEntity.purpose,
              });
      }
    }
  }

  // RFC-TM-11 Amendment 1, §RX-6 part (i) (rfc-tm-11-diamond.md) — issue
  // #109 (RC-G): a File whose re-export TARGET resolves to no local
  // entity (an external or workspace-package specifier, e.g.
  // `@webhookstorage/core/client-ip`) can never have its re-exported name
  // appear in any importer's `imports` list — `resolveImportToEntity`
  // returns `undefined` for that name from every caller, since it never
  // finds a locally-constructed entity to point at. Quantum 1's
  // `isFileConsumed` (check-orphans.ts) branch that scans `file.reExports`
  // can therefore never find a match for this shape, no matter how many
  // real modules import through the barrel.
  //
  // "Importing THROUGH a barrel counts as importing the barrel file."
  // This post-pass (same ordering rationale as `foldDynamicImportsIntoSourceFiles`
  // immediately above — a target File's entity name is only guaranteed
  // final once `convertModules` has finished) walks every module's OWN
  // `ParsedImport`s (not `convertImports`'s already-built `imports:`
  // list, which already dropped the unresolvable name): for each import
  // whose specifier resolves to a traversed File `M`, when the imported
  // name is present in `M.reExports`, `M`'s own File entity name is
  // folded into the IMPORTER's `imports` list — independent of whether
  // the imported name itself ever resolves to a local entity. This is a
  // true statement regardless: the importer's source code literally names
  // `M`'s path as the import specifier, so recording "this importer
  // imports from `M`" invents nothing.
  //
  // Part (ii) of RX-6 is the checker side: `isFileConsumed` gains a third
  // branch, `isEntityImported(context, file.name)`, which is what reads
  // the name this fold writes (check-orphans.ts). Neither half alone
  // closes the gap — see the Diamond Doc's Amendment 1 for the full
  // worked example.
  private foldReExportedNamesIntoImporterFiles(modules: readonly ParsedModule[]): void {
    for (const module of modules) {
      const importedNames = new Set<string>();

      for (const imp of module.imports) {
        if (this.isExternalPackage(imp.specifier)) {
          continue;
        }
        const targetFileEntityName = this.resolveReExportingFileEntityName(module.filePath, imp.specifier, [
          ...(imp.defaultImport !== undefined ? [imp.defaultImport] : []),
          ...(imp.namespaceImport !== undefined ? [imp.namespaceImport] : []),
          ...imp.namedImports,
        ]);
        if (targetFileEntityName !== undefined) {
          importedNames.add(targetFileEntityName);
        }
      }

      if (importedNames.size === 0) {
        continue;
      }

      const importerFileEntityName = this.fileEntityNameByModulePath.get(module.filePath);
      if (importerFileEntityName === undefined) {
        continue;
      }

      const importerIndex = this.entities.findIndex((entity) => entity.name === importerFileEntityName);
      const importerEntity = this.entities[importerIndex];
      if (importerIndex === -1 || !(importerEntity instanceof FileNode)) {
        // ClassFile is out of scope per RX-1: it always auto-self-exports
        // and is never routed through `isFileConsumed`, so folding into a
        // ClassFile's `imports` would have no consumption-checking
        // consumer — matching RX-1/RX-2/RX-5's own File-only scope.
        continue;
      }

      const newNames = [...importedNames].filter((name) => name !== importerFileEntityName && !importerEntity.imports.includes(name));
      if (newNames.length === 0) {
        continue;
      }

      this.entities[importerIndex] = new FileNode({
        name: importerEntity.name,
        span: importerEntity.span,
        raw: importerEntity.raw,
        comment: importerEntity.comment,
        sourceForm: importerEntity.sourceForm,
        path: importerEntity.path,
        imports: [...importerEntity.imports, ...newNames],
        exports: importerEntity.exports,
        reExports: importerEntity.reExports,
        purpose: importerEntity.purpose,
      });
    }
  }

  // Resolves `specifier` (as imported by `importerFilePath`) to a
  // traversed File's own entity name, but ONLY when at least one of
  // `importedNames` is present in that File's `reExports` — the bound
  // (a) negative fixture: importing a name NOT in the target's
  // `reExports` folds nothing, even when the specifier itself resolves to
  // a real File. Reuses the same `moduleGraphResolution` chain
  // `resolveImportToEntity` and `foldDynamicImportsIntoSourceFiles`
  // already rely on.
  private resolveReExportingFileEntityName(
    importerFilePath: string,
    specifier: string,
    importedNames: readonly string[],
  ): string | undefined {
    if (importedNames.length === 0) {
      return undefined;
    }
    const importerSourceModule = this.getRelativePath(importerFilePath);
    const resolvedTarget = this.moduleGraphResolution.get(
      TypeScriptToTypedMindConverter.moduleGraphResolutionKey(importerSourceModule, specifier),
    );
    const targetRelativePath =
      resolvedTarget !== undefined ? this.stripKnownSourceExtension(resolvedTarget) : this.stripKnownSourceExtension(specifier);
    const targetFileEntityName = this.fileEntityNameByRelativePath.get(targetRelativePath);
    if (targetFileEntityName === undefined) {
      return undefined;
    }
    const targetEntity = this.entities.find((entity) => entity.name === targetFileEntityName);
    if (!(targetEntity instanceof FileNode)) {
      return undefined;
    }
    const reExportsTheImportedName = importedNames.some((name) => targetEntity.reExports.includes(name));
    return reExportsTheImportedName ? targetFileEntityName : undefined;
  }

  private generatePrograms(
    entryPoints: readonly string[],
    modules: ParsedModule[],
    sstHandlerReferences: readonly SstHandlerReference[] = [],
  ): void {
    if (entryPoints.length === 0) {
      this.addWarning('No entry points detected, generating a default program');

      // Create a default program pointing to the first module
      if (modules.length > 0) {
        const firstModule = modules[0];
        if (firstModule) {
          this.createProgramEntity('DefaultApp', firstModule.filePath, firstModule.selfInvokedFunctionNames, sstHandlerReferences);
        }
      }
      return;
    }

    for (const entryPoint of entryPoints) {
      const fileName = path.basename(entryPoint, path.extname(entryPoint));
      const programName = this.deriveProgramName(fileName);
      const entryModule = modules.find((module) => module.filePath === entryPoint);
      this.createProgramEntity(programName, entryPoint, entryModule?.selfInvokedFunctionNames ?? [], sstHandlerReferences);
    }
  }

  // SST-referenced-module orphan flags (issue #52's own PR #74 closing
  // comment; LEAD RULING: exports-push per X-AN-11) — resolves every
  // `sstHandlerReferences` record whose `sourceModule` matches THIS
  // Program's own entry file into the target function's final
  // (collision-resolved) entity name via `functionNameRemap`, keyed by
  // `${resolvedAbsolutePath}::${memberName}` (the exact key
  // `reserveFunctionEntityNames` writes for every exported function in
  // every traversed module, populated before `generatePrograms` runs —
  // `convertModules` precedes it in `convert()`). A reference whose target
  // module was not traversed, or whose member is not itself a converted
  // exported function (e.g. a re-exported const arrow that never entered
  // `reserveFunctionEntityNames`), resolves to `undefined` and is silently
  // skipped here — the recognizer's OWN not-found/not-exported diagnostics
  // (X-DIAG-1) already cover the failure surface; this fold only ever adds
  // an entity name it can prove exists.
  private resolveSstHandlerExportNames(entryFilePath: string, sstHandlerReferences: readonly SstHandlerReference[]): string[] {
    const resolved: string[] = [];
    for (const reference of sstHandlerReferences) {
      if (reference.sourceModule !== entryFilePath) {
        continue;
      }
      const remapKey = `${reference.resolvedAbsolutePath}::${reference.memberName}`;
      const entityName = this.functionNameRemap.get(remapKey);
      if (entityName !== undefined) {
        resolved.push(entityName);
      }
    }
    return resolved;
  }

  private createProgramEntity(
    programName: string,
    entryFilePath: string,
    selfInvokedFunctionNames: readonly string[] = [],
    sstHandlerReferences: readonly SstHandlerReference[] = [],
  ): void {
    const entityName = createEntityName(programName);

    if (this.entityNames.has(entityName)) {
      this.addError(`Duplicate program name: ${entityName}`);
      return;
    }

    this.entityNames.add(entityName);

    // Find the actual entity that will be created for this entry file
    const entryEntityName = this.findEntryEntityName(entryFilePath);

    // Extract public exports from the entry point for library support
    const publicExports = this.extractPublicExportsFromEntrypoint(entryFilePath);

    // SST-referenced-module orphan flags — resolve this Program's own
    // handler-string references (if any) to their target functions' final
    // entity names. See `resolveSstHandlerExportNames` above.
    const sstHandlerExportNames = this.resolveSstHandlerExportNames(entryFilePath, sstHandlerReferences);

    // X-AN-11 — fold the entrypoint's self-invoked function names (from the
    // `import.meta.url` guard) into the same Program.exports list. This is
    // the honest-fact fix: the guarded function IS a real graph root, and
    // Program.exports is the existing, language-optional field the checker's
    // orphan rule already unions into its referenced-names set
    // (check-orphans.ts's `collectReferencedNames`) — no FileNode change,
    // no checker change, per the doc's negative check. The SST handler
    // export names (above) fold into the SAME list under the SAME
    // rationale, extended to a cross-module reference: the infra Program
    // genuinely references the handler function via the handler string, so
    // pushing it into Program.exports makes the graph a true statement
    // instead of suppressing a false one.
    const allPublicExports = Array.from(new Set([...publicExports, ...selfInvokedFunctionNames, ...sstHandlerExportNames]));

    // RC-C (issue #102): shortform's `program_declaration` (grammar.js) has
    // no exports continuation slot — attachment-rules.ts's `export_list`
    // legality accepts File/ClassFile/Dependency, never Program. `sourceForm`
    // stays 'shortform' (this converter always calls `emitShortform`, which
    // forces every entity to shortform regardless of its own `sourceForm`).
    // SST-exports-push (issue #52/PR #94) and the self-invoked-function fold
    // (X-AN-11) both push real names into `allPublicExports`; when that list
    // is non-empty, `emit-shortform.ts`'s `shortformCannotExpress` detects
    // it and promotes this ONE entity to longform so the exports data
    // round-trips through the legal serialization instead of being dropped.
    const programEntity = new ProgramNode({
      name: entityName,
      span: SYNTHETIC_SPAN,
      raw: `${entityName} -> ${entryEntityName} v${this.options.programVersion}`,
      sourceForm: 'shortform',
      entry: entryEntityName,
      version: this.options.programVersion,
      exports: allPublicExports.length > 0 ? allPublicExports : undefined,
    });

    this.entities.push(programEntity);
  }

  private extractPublicExportsFromEntrypoint(entryFilePath: string): string[] {
    const relativePath = this.getRelativePath(entryFilePath);

    // Look up exports from this entry file in our export registry
    const moduleExports =
      this.exportRegistry[relativePath] ||
      this.exportRegistry[relativePath.replace(/\.(ts|tsx|js|jsx)$/, '')] ||
      this.exportRegistry[`./${relativePath}`] ||
      this.exportRegistry[`./${relativePath.replace(/\.(ts|tsx|js|jsx)$/, '')}`];

    if (!moduleExports) {
      return [];
    }

    const publicExports: string[] = [];

    // Add default export if it exists. issue #88 — a THIRD call site
    // (alongside convertExports/isDTOLikeType) that builds the `exports`
    // reference-legality verb: Program.exports (this method) pulls every
    // named export directly from the export registry with no TypeDef
    // filtering, so a TypeDef-predicted name in the entrypoint's own
    // exports list produced the identical `checker/reference-to-illegal`
    // finding `convertExports` was fixed for, via a different producer of
    // the same verb. Same exclusion, same shared helper.
    if (moduleExports.defaultExport && !this.isPredictedTypeDef(moduleExports.defaultExport)) {
      publicExports.push(moduleExports.defaultExport);
    }

    // Add all named exports
    for (const namedExport of moduleExports.namedExports) {
      // X-AN-3 residual (ladder rung: sammons/code-outline-cli
      // `packages/formatter/src/index.ts`, whose entire body is
      // `export * from './formatter.ts'`). `parseExportDeclaration` models
      // `export * from '<source>'` as a ParsedExport whose `name` is the
      // literal `'*'`, and `registerModuleExports` adds that name to the
      // module's `namedExports` set like any other. When the barrel is a
      // NON-entrypoint (the 10-export-star fixture's shape) the `'*'` never
      // leaves the registry, so the defect stayed invisible; when the
      // barrel IS the entrypoint, this method pushed `'*'` straight into
      // Program.exports and the emitter produced the ungrammatical
      // `exports: [*]` — a `syntax/error` on the extractor's own output.
      //
      // `'*'` is not a name any entity can carry, so it is never a legal
      // member of an `exports:` list. Expand it to the star's real
      // transitive export names instead of dropping it: the barrel's public
      // surface IS the source module's surface, which is what a consumer of
      // this Program actually gets.
      if (namedExport === '*') {
        for (const starName of this.resolveStarReExportNames(moduleExports.filePath)) {
          if (!this.isPredictedTypeDef(starName)) {
            publicExports.push(starName);
          }
        }
        continue;
      }
      // A name this entrypoint RE-exports from a sibling is declared — and
      // already listed in its own `-> [...]` exports — by that sibling. Adding
      // it here too made two files each claim to export one entity, which the
      // checker correctly reports as `checker/multi-exported`. `convertExports`
      // has always drawn this distinction via `isReExport` (routing such names
      // to `reExportNames`); this is the third call site building the same
      // `exports` verb and it was the one missing the check.
      //
      // Distinct from the `'*'` branch above (fixture 78), which fixes an
      // ungrammatical NAME rather than a duplicated claim: an `export *`
      // barrel never reaches this ordinary named-re-export path. The star
      // expansion above deliberately keeps its names — a star's source module
      // is not itself in the emitted document as an exporter of them.
      //
      // Corpus: sammons/bens-almanac packages/vehicle-data/src/index.ts.
      if (moduleExports.reExportedNames.has(namedExport)) {
        continue;
      }
      if (!this.isPredictedTypeDef(namedExport)) {
        publicExports.push(namedExport);
      }
    }

    // Add namespace export if it exists
    if (moduleExports.namespaceExport) {
      publicExports.push(moduleExports.namespaceExport);
    }

    return publicExports;
  }

  // X-AN-3 residual — a bare `export * from '<source>'` produces NO
  // `ImportDeclaration`, so `convertImports` (which walks `module.imports`)
  // records no edge for it and the starred source File is left with no
  // importer at all -> `checker/orphaned-file`, plus the Program-scoped
  // `multi-exported` exemption (ast-validator: "a Program exporting a name
  // whose declaring File is reachable from the entry is NOT multi-exported")
  // never engages, because the declaring File is unreachable.
  //
  // The edge is a true statement about the source: the barrel names the
  // source module's path in its own `export * from` specifier, so recording
  // "the barrel imports the source File" invents nothing — the same
  // justification RX-6's `foldReExportedNamesIntoImporterFiles` uses for the
  // importer->barrel direction. This method covers the barrel->source
  // direction that fold does not reach.
  // Runs as a POST-PASS (same ordering rationale as the two folds above):
  // `fileEntityNameByRelativePath` is populated per-module as
  // `convertModules` iterates, so a barrel converted BEFORE its starred
  // source would resolve nothing if this ran inline at File construction.
  private foldStarReExportImportsIntoBarrelFiles(modules: readonly ParsedModule[]): void {
    for (const module of modules) {
      const sources = this.starReExportSources.get(module.filePath);
      if (sources === undefined) {
        continue;
      }

      const barrelEntityName = this.fileEntityNameByModulePath.get(module.filePath);
      if (barrelEntityName === undefined) {
        continue;
      }

      const barrelIndex = this.entities.findIndex((entity) => entity.name === barrelEntityName);
      const barrelEntity = this.entities[barrelIndex];
      if (barrelIndex === -1 || !(barrelEntity instanceof FileNode)) {
        // ClassFile is out of scope for the same RX-1 reason the sibling
        // fold documents: it auto-self-exports and never routes through
        // `isFileConsumed`, so a folded import would have no consumer.
        continue;
      }

      const newNames: string[] = [];
      for (const source of sources) {
        if (this.isExternalPackage(source)) {
          continue;
        }
        const resolvedTarget = this.moduleGraphResolution.get(
          TypeScriptToTypedMindConverter.moduleGraphResolutionKey(this.getRelativePath(module.filePath), source),
        );
        const targetRelativePath =
          resolvedTarget !== undefined ? this.stripKnownSourceExtension(resolvedTarget) : this.stripKnownSourceExtension(source);
        const targetFileEntityName = this.fileEntityNameByRelativePath.get(targetRelativePath);
        if (
          targetFileEntityName !== undefined &&
          !barrelEntity.imports.includes(targetFileEntityName) &&
          !newNames.includes(targetFileEntityName)
        ) {
          newNames.push(targetFileEntityName);
        }
      }

      if (newNames.length === 0) {
        continue;
      }

      this.entities[barrelIndex] = new FileNode({
        name: barrelEntity.name,
        span: barrelEntity.span,
        raw: barrelEntity.raw,
        comment: barrelEntity.comment,
        sourceForm: barrelEntity.sourceForm,
        path: barrelEntity.path,
        imports: [...barrelEntity.imports, ...newNames],
        exports: barrelEntity.exports,
        reExports: barrelEntity.reExports,
        purpose: barrelEntity.purpose,
      });
    }
  }

  // X-AN-3 residual — expand one barrel module's `export * from '<source>'`
  // edges into the real names the star re-exports. Transitive (a barrel of
  // barrels is the corpus shape: code-outline-cli's `packages/parser/src/
  // index.ts` stars 7 sibling modules, any of which may itself star), with a
  // visited-set cycle guard mirroring `unionFileNamesAcrossReferences`'s own
  // guard — a mutual `export *` pair is legal TypeScript and must not spin.
  //
  // A star whose source does not resolve to a module in this analysis
  // (an external package, or an unresolved specifier) contributes NOTHING
  // rather than a fabricated name: the barrel genuinely re-exports names
  // this extraction cannot see, and inventing them would put unresolvable
  // references in `exports:`. That is the `degrade, never discard` reading
  // (I-13) — the Program keeps every name we CAN prove.
  private resolveStarReExportNames(barrelFilePath: string, visited: Set<string> = new Set()): string[] {
    if (visited.has(barrelFilePath)) {
      return [];
    }
    visited.add(barrelFilePath);

    const sources = this.starReExportSources.get(barrelFilePath);
    if (sources === undefined) {
      return [];
    }

    const names: string[] = [];
    for (const source of sources) {
      // Same resolution chain `resolveImportToEntity` uses: the analyzer's
      // own `ts.resolveModuleName` result first (keyed per importing
      // module), then the guessed-specifier fallback.
      const resolvedTarget = this.moduleGraphResolution.get(
        TypeScriptToTypedMindConverter.moduleGraphResolutionKey(this.getRelativePath(barrelFilePath), source),
      );
      const sourceExports =
        (resolvedTarget !== undefined ? this.exportRegistry[this.stripKnownSourceExtension(resolvedTarget)] : undefined) ??
        this.exportRegistry[source] ??
        this.exportRegistry[this.stripKnownSourceExtension(source)];

      if (sourceExports === undefined) {
        continue;
      }

      for (const name of sourceExports.namedExports) {
        if (name === '*') {
          names.push(...this.resolveStarReExportNames(sourceExports.filePath, visited));
          continue;
        }
        names.push(name);
      }
    }

    return names;
  }

  // Returns the subset of `stubNames` this caller may list in its own
  // `exports:`, claiming each for the FIRST file that asks. Every file that
  // extends the builtin still IMPORTS the stub (its own `imports:` list is
  // unfiltered), so the reference edge the orphan check needs survives on
  // every file; only the single export claim is exclusive.
  //
  // `checkClassAndFunctionExports` requires each plain ClassNode to be
  // exported by SOME file — satisfied because the first claimant keeps it.
  private claimStubExportNames(stubNames: readonly string[]): string[] {
    const claimed: string[] = [];
    for (const stubName of stubNames) {
      if (this.claimedStubExportNames.has(stubName)) {
        continue;
      }
      this.claimedStubExportNames.add(stubName);
      claimed.push(stubName);
    }
    return claimed;
  }

  private convertMethods(cls: ParsedClass): string[] {
    const methods = cls.methods.filter((method) => {
      if (!this.options.includePrivateMembers && method.isPrivate) {
        return false;
      }
      return true;
    });

    return methods.map((method) => method.name);
  }

  // RC-A (issue #99) — `importerFilePath` is the ABSOLUTE path of the module
  // whose `imports`/`exports` list this call is building (both call sites
  // pass their own `module.filePath`). Threaded through to
  // `resolveImportToEntity` so it can key `moduleGraphResolution` by
  // `(sourceModule, specifier)` — the analyzer records that edge per
  // IMPORTING module, so the specifier alone is not enough to look it up.
  private convertImports(importerFilePath: string, imports: readonly ParsedImport[], moduleExports?: readonly ParsedExport[]): string[] {
    const importNames: string[] = [];

    // Process regular imports
    for (const imp of imports) {
      if (this.isExternalPackage(imp.specifier)) {
        // For external packages, add the dependency entity name
        const dependencyName = this.createDependencyName(imp.specifier);
        if (this.dependencies.has(imp.specifier)) {
          importNames.push(dependencyName);
        }
      } else {
        // For internal imports, add the specific imported entity names
        // Now using the complete export registry for proper resolution

        if (imp.defaultImport) {
          const entityName = this.resolveImportToEntity(importerFilePath, imp.defaultImport, imp.specifier);
          if (entityName) {
            importNames.push(entityName);
          }
        }

        if (imp.namespaceImport) {
          // Create a class-like entity for the namespace import
          this.createNamespaceEntity(imp.namespaceImport, imp.specifier);
          const entityName = this.resolveImportToEntity(importerFilePath, imp.namespaceImport, imp.specifier);
          if (entityName) {
            importNames.push(entityName);
          }
        }

        for (const namedImport of imp.namedImports) {
          const entityName = this.resolveImportToEntity(importerFilePath, namedImport, imp.specifier);
          if (entityName) {
            importNames.push(entityName);
          }
        }
      }
    }

    // Process re-exports as imports (export { X } from './module' means import { X })
    if (moduleExports) {
      for (const reExport of moduleExports) {
        if (reExport.source && !this.isExternalPackage(reExport.source)) {
          // Treat re-export as an import of the entity from the source module
          const entityName = this.resolveImportToEntity(importerFilePath, reExport.name, reExport.source);
          if (entityName) {
            importNames.push(entityName);
          }
        }
      }
    }

    return importNames;
  }

  private resolveImportToEntity(importerFilePath: string, importName: string, specifier: string): string | undefined {
    // Handle external packages
    if (this.isExternalPackage(specifier)) {
      const dependencyName = this.createDependencyName(specifier);
      if (this.dependencies.has(specifier)) {
        return dependencyName;
      }
      return undefined;
    }

    // RC-A (issue #99) — prefer the analyzer's own `ts.resolveModuleName`
    // resolution (X-AN-1, recorded per-edge in `analysis.moduleGraph` and
    // indexed into `moduleGraphResolution` at the top of `convert()`) over
    // the guessed-specifier lookup below. The analyzer resolves relative to
    // the IMPORTING module's own directory, so it has no blind spot for a
    // specifier crossing into an arbitrary subdirectory
    // (`./pages/Home.js`, `./commands/tenant.js`, ...) — the guessed-key
    // list a few lines down only ever covers a fixed enumeration of shapes
    // and is kept only as a fallback for callers (unit-test mocks) that
    // construct a `TypeScriptProjectAnalysis` with an empty `moduleGraph`.
    const importerSourceModule = this.getRelativePath(importerFilePath);
    const resolvedTarget = this.moduleGraphResolution.get(
      TypeScriptToTypedMindConverter.moduleGraphResolutionKey(importerSourceModule, specifier),
    );

    // Handle internal imports using the export registry. issue #87: the
    // registry's keys are always extension-less; the raw specifier may
    // carry an explicit extension (nodenext/verbatimModuleSyntax style), so
    // strip a known source extension before looking up.
    const moduleExports =
      (resolvedTarget !== undefined ? this.exportRegistry[this.stripKnownSourceExtension(resolvedTarget)] : undefined) ??
      this.exportRegistry[specifier] ??
      this.exportRegistry[this.stripKnownSourceExtension(specifier)];
    if (!moduleExports) {
      return undefined;
    }

    // Check if this import name is actually exported by the target module
    const isExported =
      moduleExports.defaultExport === importName ||
      moduleExports.namedExports.has(importName) ||
      moduleExports.namespaceExport === importName;

    if (!isExported) {
      return undefined;
    }

    // Now check if we have the entity in our registry
    const entityName = createEntityName(importName);

    // RFC-TM-9 §4 (rfc-tm-9-diamond.md, X-CONV-2) — a `types`-registry name
    // predicted to become a TypeDef is EXCLUDED from import/export
    // resolution: TM-8 froze `imports.to`/`exports.to` without TypeDef
    // ("no other reference verb changes" beyond `schema.to` —
    // rfc-tm-8-diamond.md §5), so naming a TypeDef in a File's `imports` or
    // `exports` list is `checker/reference-to-illegal` by design. A
    // predicted-DTO type alias (object-like shape) is unaffected — DTO IS
    // `imports.to`-legal, matching its pre-existing behavior.
    if (this.isPredictedTypeDef(importName)) {
      return undefined;
    }

    // Check all entity types for this name
    const foundInFunctions = this.entityRegistry.functions.has(importName);
    const foundInClasses = this.entityRegistry.classes.has(importName);
    const foundInInterfaces = this.entityRegistry.interfaces.has(importName);
    const foundInTypes = this.entityRegistry.types.has(importName);
    const foundInConstants = this.entityRegistry.constants.has(importName);

    if (foundInFunctions || foundInClasses || foundInInterfaces || foundInTypes || foundInConstants) {
      return entityName;
    }

    // Check if it's already in our created entity names (this covers DTOs converted from interfaces)
    if (this.entityNames.has(entityName)) {
      return entityName;
    }

    // For type imports from ./types, they should resolve to Constants entities
    // But defer until they're actually created
    if (specifier.includes('types') && this.isTypeOrConstantName(importName)) {
      return undefined;
    }

    return undefined;
  }

  private isTypeOrConstantName(name: string): boolean {
    // Check if this looks like a type alias or constant
    const typeAliasNames = ['EntityType', 'ReferenceType', 'AnyEntity', 'EntityTypeName'];
    const constantNames = ['ENTITY_PATTERNS', 'CONTINUATION_PATTERNS', 'GENERAL_PATTERNS', 'ENTITY_TYPE_NAMES', 'PATTERN_DESCRIPTIONS'];

    return typeAliasNames.includes(name) || constantNames.includes(name);
  }

  // RFC-TM-11 §RX-4 (rfc-tm-11-diamond.md) — a re-exported name now lands
  // in `reExportNames` instead of being dropped: `convertExports`'s
  // exclusion of re-exports from the returned `exports` array is UNCHANGED
  // (a re-exported name still never appears in `exportNames`, still never
  // routes through `exports:`'s VALID_REFERENCES-checked slot regardless
  // of kind, so `isPredictedTypeDef`'s exclusion stays scoped to the
  // non-re-export branch only), but the excluded name is no longer
  // discarded — it is returned as the RFC's new `reExports` field's
  // source. Every call site now destructures the pair.
  private convertExports(module: ParsedModule, excludeName?: string): { exportNames: string[]; reExportNames: string[] } {
    const exportNames: string[] = [];
    const reExportNames: string[] = [];
    const seenNames = new Set<string>();

    for (const exp of module.exports) {
      // X-AN-3 residual — `export * from '<source>'` carries the literal
      // name `'*'`, which `isValidEntityName` rejects, so the star used to
      // contribute NOTHING to this File's `reExports`. That starved the two
      // consumers of that list: RX-6's `foldReExportedNamesIntoImporterFiles`
      // (so a real importer of a starred name never marked the barrel
      // consumed -> `checker/orphaned-file`) and `isFileConsumed`'s own
      // `reExports` branch. Expanding the star here routes the real names
      // through the EXISTING re-export machinery rather than adding a
      // parallel path. `reExports` is the correct list (not `exports`): the
      // names are declared by the source module, and listing them under the
      // barrel's `exports:` would claim two files export the same entity —
      // exactly the `checker/multi-exported` this expansion must not cause.
      if (exp.name === '*' && this.isReExport(exp)) {
        for (const starName of this.resolveStarReExportNames(module.filePath)) {
          if (starName !== excludeName && this.isValidEntityName(starName) && !seenNames.has(starName)) {
            seenNames.add(starName);
            reExportNames.push(starName);
          }
        }
        continue;
      }
      if (exp.name !== excludeName && this.isValidEntityName(exp.name) && !seenNames.has(exp.name)) {
        if (this.isReExport(exp)) {
          reExportNames.push(exp.name);
        } else if (!this.isPredictedTypeDef(exp.name)) {
          // issue #88 — a TypeDef-predicted export name (a non-object-like
          // `type` alias, or an enum) is excluded here: `exports.to`
          // (valid-references.ts) has no TypeDef slot, so listing one
          // would always produce `checker/reference-to-illegal`. Scoped to
          // this branch only — a re-exported TypeDef-shaped name still
          // lands in `reExportNames` above, since it is never routed
          // through `exports:`'s checked slot regardless of kind.
          //
          // RFC-TM-10 Q3 amendment (lead-authorized, X-CONV-4 extension) —
          // a top-level function renamed by `reserveFunctionEntityNames`/
          // `convertFunction` on a bare-name collision must be named by
          // its ACTUAL emitted entity name here too, or this File's
          // `exports:` list would reference a name no entity carries.
          // `functionNameRemap` returns `undefined` for every export that
          // isn't a renamed function (constants, classes, interfaces,
          // ...), which is exactly when the raw `exp.name` is already
          // correct.
          const remapped = this.functionNameRemap.get(`${module.filePath}::${exp.name}`);
          exportNames.push(remapped ?? exp.name);
        }
        seenNames.add(exp.name);
      }
    }

    return { exportNames, reExportNames };
  }

  private isReExport(exportItem: ParsedExport): boolean {
    // Check if this export has a source (indicating it's a re-export)
    return exportItem.source !== undefined;
  }

  private isConstantExported(constant: { name: string }, module: ParsedModule): boolean {
    return module.exports.some((exp) => exp.name === constant.name && exp.type === 'constant');
  }

  private extractInputDTO(func: ParsedFunction, functionEntityName: string): string | undefined {
    // Look for single parameter that looks like a DTO
    if (func.parameters.length === 1) {
      const param = func.parameters[0];
      if (param && isInlineObjectLiteralType(param.type)) {
        // issue #72 — synthesize a named DTO instead of D-LEG-1's
        // `isDTOLikeType` `{`-prefix exclusion (checked BEFORE that
        // classifier runs, since the classifier's job here is now moot:
        // an inline object-literal parameter type is unconditionally
        // DTO-shaped by construction, no elimination heuristic needed).
        return this.synthesizeInlineDTO(param.type, `${functionEntityName}Input`);
      }
      if (param && this.isDTOLikeType(param.type)) {
        // If this is an external type, add it to the dependency's exports
        this.addExternalTypeToDepExports(param.type);
        // D-LEG-2 (issue #65) — walk the type's structured TypeExprNode for
        // any generic-argument external type (`Pick<S3Client, "send">`)
        // that also needs a Dependency-exports stub, on the same path
        // D-LEG-1 (below) proves is DTO-like.
        this.walkGenericArgsForExternalStubs(parseTypeExprText(param.type).typeExpr);
        // issue #77 — `isDTOLikeType` proves the type is DTO-like BY KIND,
        // but the `input` field is emitted verbatim into the grammar's
        // bare-`entity_name`-only `input_name` slot (grammar.js:811,
        // `/[A-Za-z_]\w*/`). A DTO-like type whose text carries a union
        // (`| null`), an array suffix (`[]`), a generic-argument suffix
        // (`<Args>`), or a function-type shape (`() => void`) is a real,
        // legal TypeScript type but not a legal `entity_name` token — same
        // disclosed-loss trade D-LEG-1/D-LEG-5 already accepted for
        // Class-kind/literal-union/inline-object types above: leave `input`
        // undefined rather than emit text the grammar cannot parse. The type
        // stays visible in `entity.signature` regardless (emitted verbatim,
        // `emit-shortform.ts`), so only the machine-checked graph edge is
        // lost, not the DSL reader's visibility into the real type.
        return isBareEntityName(param.type) ? param.type : undefined;
      }
    }
    return undefined;
  }

  private extractOutputDTO(func: ParsedFunction, functionEntityName: string): string | undefined {
    // issue #86 follow-up — collapse BEFORE the `Promise<...>` strip, not
    // after. The strip's `.` does not match a newline, so a multi-line-
    // authored `Promise<\n  WidgetList\n>` fails the anchored pattern
    // outright and the wrapper survives into classification; collapsing
    // first turns it into `Promise< WidgetList >`, which strips to
    // ` WidgetList ` and then trims to the bare name the grammar's
    // `output_name` slot accepts. Collapsing after the strip would fix this
    // one shape but leave the wrapper itself unstrippable whenever the
    // newline sits inside the `Promise<>` brackets.
    const returnType = collapseTypeWhitespace(collapseTypeWhitespace(func.returnType).replace(/^Promise<(.+)>$/, '$1'));
    if (isInlineObjectLiteralType(returnType)) {
      // issue #72 — same synthesis path as `extractInputDTO`, applied to
      // the return-type position. `Output` is the codomain-disambiguation
      // suffix so a function whose parameter AND return type are both
      // inline object literals gets two distinct synthesized DTOs, never
      // one name serving both.
      return this.synthesizeInlineDTO(returnType, `${functionEntityName}Output`);
    }
    if (this.isDTOLikeType(returnType)) {
      // If this is an external type, add it to the dependency's exports
      this.addExternalTypeToDepExports(returnType);
      // D-LEG-2 (issue #65) — same generic-argument walk as extractInputDTO
      // above; this is the FUNCTION-SIGNATURE path issue #65's evidence
      // (`Pick<S3Client, "send">` in outbound-delivery's return type) lives
      // on, per the Diamond's revised §2 (the r0 draft's walk never reached
      // this call site).
      this.walkGenericArgsForExternalStubs(parseTypeExprText(returnType).typeExpr);
      // issue #77 — same bare-`entity_name` guard as extractInputDTO above,
      // applied to the `output_name` grammar slot (grammar.js:815).
      return isBareEntityName(returnType) ? returnType : undefined;
    }
    return undefined;
  }

  // issue #114 — a naive `.includes('{')` check treats a UNION of object
  // literals (`{ tagged: false } | { tagged: true; label: string }`, a
  // TypeScript discriminated-union idiom) as "one object literal," routing
  // it to `parseInlineObjectLiteralToFields`. That parser's own
  // `startsWith('{') && endsWith('}')` slice then strips only the
  // OUTERMOST leading `{` and trailing `}` of the whole multi-member text,
  // leaving an unbalanced middle (`tagged: false } | { tagged: true; label:
  // string`) that `splitObjectLiteralProperties` cannot recover — the
  // corrupted `- tagged: false } | { tagged: true` field line issue #114
  // reports. Detected here, BEFORE the DTO/TypeDef branch decision, so a
  // union-shaped type routes to the TypeDef/alias path instead: that path's
  // `parseTypeExprText` already parses a top-level `|` outside any bracket
  // depth as a real `union` TypeExprNode (confirmed empirically — each
  // `{...}` member individually balances and falls to the grammar's own
  // `type_opaque` leaf, per type-expr-from-text.ts's opaque-run scanner),
  // which is a real, parseable grammar production — the "degrade honestly,
  // anything that parses" option the issue itself names, with no new
  // grammar surface and no field-list modeling attempted for the union.
  // Adversarial review finding, round 1 (PR #115) — the ORIGINAL depth
  // tracker below counted `{()[]}` only, so a union nested inside a
  // generic (`Record<string, { a: string } | { b: string }>`) misread its
  // `|` as top-level the instant the first `{...}` member closed, routing
  // an alias that should stay a DTO into the TypeDef/alias path and
  // corrupting a PREVIOUSLY-correct emission.
  //
  // Adversarial review finding, round 2 (PR #115) — adding `<`/`>` to the
  // depth tracker fixed that case but was still too permissive: a union
  // whose top-level members are THEMSELVES generics each containing their
  // own nested union of object literals (`Record<string, {a}|{b}> |
  // Map<string, {c}|{d}>`) still has a genuinely top-level `|` between
  // the two generics — so the OLD "any top-level `|` plus any `{`
  // anywhere" test still fired, routing the whole thing into
  // `parseTypeExprText`, which has its OWN pre-existing, PR-independent
  // bug in `scanOpaqueRun` (lib/typed-mind/src/pipeline/
  // type-expr-from-text.ts): its bracket-depth tracker ALSO omits `<`/`>`,
  // so it mis-nests a top-level union of generics and corrupts the
  // output — confirmed present on `main` too (`parseTypeExprText` on this
  // exact text already mis-parses on `main`, unrelated to this PR).
  // Fixing that shared core parser is design work (a broader bracket-depth
  // fix touching every `parseTypeExprText` caller) outside this
  // increment's mechanical-fix mandate — filed as issue #118 instead of
  // silently routing more inputs into a parser known to mishandle them.
  //
  // The fix: narrow the check from "any top-level `|` plus any `{`" to
  // "every top-level-split member is ITSELF a bare object literal"
  // (`startsWith('{') && endsWith('}')`, the exact same test
  // `isInlineObjectLiteralType` already uses) — this is precisely the
  // shape `parseTypeExprText`'s opaque-run scanner can safely absorb (each
  // member independently brace-balances with no unaccounted `<`/`>`
  // inside it), and it correctly excludes a member that is a generic
  // (`Record<...>`, `Map<...>`) since that member does not itself start
  // with `{`.
  private isUnionOfObjectLiterals(type: string): boolean {
    const trimmed = type.trim();
    if (!trimmed.includes('{') || !trimmed.includes('|')) {
      return false;
    }
    const members = this.splitTopLevelUnionMembers(trimmed);
    return members.length > 1 && members.every((member) => isInlineObjectLiteralType(member));
  }

  // Splits `type` on every top-level `|` (outside `{()[]}`/`<>` bracket
  // depth), mirroring the bracket-tracking discipline `isUnionOfObjectLiterals`
  // needs — shared here so both the union-detection guard and the
  // per-member `isInlineObjectLiteralType` check operate on the exact same
  // split.
  private splitTopLevelUnionMembers(type: string): string[] {
    const members: string[] = [];
    let depth = 0;
    let memberStart = 0;
    for (let i = 0; i < type.length; i += 1) {
      const ch = type[i];
      if (ch === '{' || ch === '(' || ch === '[' || ch === '<') {
        depth += 1;
      } else if (ch === '}' || ch === ')' || ch === ']' || ch === '>') {
        depth -= 1;
      } else if (ch === '|' && depth === 0) {
        members.push(type.slice(memberStart, i).trim());
        memberStart = i + 1;
      }
    }
    members.push(type.slice(memberStart).trim());

    if (members.length > 1 && members[0] === '') {
      members.shift();
    }

    return members;
  }

  private isObjectLikeType(type: string): boolean {
    if (this.isUnionOfObjectLiterals(type)) {
      return false;
    }
    return type.includes('{') || type.includes('Record<') || type.includes('Map<');
  }

  // RFC-TM-10 §1 (rfc-tm-10-diamond.md, D-LEG-1, issue #59) — REPLACES the
  // prior single-heuristic `charAt(0).toUpperCase() === charAt(0)` check,
  // which had two proven false-positive faces: a quoted-string-union-literal
  // type (`"empty" | "processed"`) starts with `"`, trivially passing the
  // check; a Class/ClassFile-kind reference (`CheckContext`, `LinkIndex`)
  // also passes the uppercase check — both routed through the DTO-only
  // `input`/`output` continuation grammar the checker correctly rejects.
  //
  // The fix consults classification the converter already computes instead
  // of re-deriving semantic kind from the type string's surface characters:
  //   - A name resolving against `entityRegistry.classes` is Class/ClassFile
  //     kind — NOT DTO-like. `extractInputDTO`/`extractOutputDTO` then leave
  //     `input`/`output` `undefined` (a disclosed, accepted loss of the
  //     cross-reference EDGE — `FunctionNode` has no other reference-capable
  //     field per `VALID_REFERENCES.input.to`/`.output.to`'s frozen
  //     `['DTO']`-only table, RFC-TM-4 — the type stays visible in the
  //     signature TEXT regardless, `entity.signature` always emits
  //     verbatim).
  //   - A name resolving against `entityRegistry.interfaces` is the
  //     ORIGINAL true positive this heuristic exists to serve (a real
  //     `interface CreateUserRequest` parameter/return type) — DTO-like,
  //     unchanged from before this fix.
  //   - A type text starting with `"` (string-literal or string-literal-
  //     union) parses via `parseTypeExprText`; a top-level `kind` of
  //     `'literal'` or a `'union'` of only literal members is NOT DTO-like
  //     for the same reason as the Class-kind case (`"empty" | "processed"`
  //     is not a DTO reference).
  //   - Everything else that isn't a bare primitive is DTO-like by
  //     elimination — the same fallback the heuristic approximated, now
  //     gated by classification instead of a first-character guess.
  private isDTOLikeType(type: string): boolean {
    const primitives = ['string', 'number', 'boolean', 'void', 'any', 'unknown', 'null', 'undefined'];
    const cleaned = type.replace(/\[\]$/, ''); // Remove array suffix
    if (primitives.includes(cleaned.toLowerCase())) {
      return false;
    }

    // Class/ClassFile-kind reference: leave input/output undefined, per
    // this item's disclosed-loss rationale above.
    if (this.entityRegistry.classes.has(cleaned)) {
      return false;
    }

    // issue #88 — a TypeDef-predicted name (a non-object-like `type` alias,
    // e.g. a discriminated union, or an enum) is NOT DTO-like: `input`/
    // `output.to` (valid-references.ts) accept only DTO, so routing a
    // TypeDef there always produces `checker/reference-to-illegal` (and,
    // once resolved, `checker/{input,output}-not-dto`). Checked before the
    // interfaces/elimination branches below, mirroring the Class-kind
    // exclusion's placement.
    if (this.isPredictedTypeDef(cleaned)) {
      return false;
    }

    // Gap 69/67 — a METHOD-BEARING interface now converts to a ClassNode
    // (`convertInterfaceToClass`), so it takes the identical exclusion the
    // `entityRegistry.classes` branch above applies to a real `class`
    // declaration. Checked BEFORE the interfaces branch below, mirroring the
    // Class-kind and TypeDef exclusions' own placement. See
    // `isPredictedClassInterface`'s comment for why the edge is dropped
    // rather than emitted.
    if (this.isPredictedClassInterface(cleaned)) {
      return false;
    }

    // Interface-kind reference: the ORIGINAL true positive — still DTO-like,
    // now narrowed to the PROPERTY-ONLY interfaces that still emit a DtoNode.
    if (this.entityRegistry.interfaces.has(cleaned)) {
      return true;
    }

    // A quoted-string-literal or string-literal-union type is a structured
    // literal/union of literals, not a DTO reference.
    if (cleaned.startsWith('"') || cleaned.startsWith("'")) {
      const parsed = parseTypeExprText(cleaned).typeExpr;
      if (parsed.kind === 'literal') {
        return false;
      }
      if (parsed.kind === 'union' && parsed.members.every((member) => member.kind === 'literal')) {
        return false;
      }
    }

    // RFC-TM-10 §5 amendment (rfc-tm-10-diamond.md, D-LEG-5, issue #66) — a
    // THIRD false-positive face of the original `charAt(0).toUpperCase()`
    // heuristic, found by D-LEG-5's own fixture after D-LEG-1 landed: an
    // inline object-literal type (`{ current?: string }`, no enclosing
    // Class/Interface name to resolve) starts with `{`, which is not a
    // letter — `'{'.toUpperCase() === '{'` is trivially true, the same
    // vacuous-pass shape D-LEG-1 already fixed for `"`. Routing this text
    // through `input`/`output` is worse than the disclosed-loss cases above:
    // the grammar's `input_name`/`output_name` productions
    // (`grammar.js:811-812` et al.) accept only a bare `entity_name` token
    // ([A-Za-z_]\w*), so an inline object-literal type in that position is
    // UNPARSABLE, not merely duplicated (confirmed:
    // `tests/ladder/q2-destructured-params.test.ts` reproduces
    // `syntax/error: unparsable text` on this exact shape). Leaving
    // input/output undefined is the same accepted trade D-LEG-1 already made
    // for Class-kind and literal-union types — the type stays visible in the
    // signature TEXT (`entity.signature` always emits verbatim), only the
    // machine-checked edge is gone.
    //
    // issue #72 (rfc-tm-10-diamond.md §5's tracked follow-up, CLOSED) — the
    // richer fix landed: `extractInputDTO`/`extractOutputDTO` now detect an
    // inline object-literal type via `isInlineObjectLiteralType` and route
    // it through `synthesizeInlineDTO` BEFORE calling `isDTOLikeType` at
    // all, so this branch is no longer reached by either call site for that
    // shape in practice. It stays as a defensive fallback — `isDTOLikeType`
    // is a general classifier callers besides the two current ones could
    // reasonably add in the future, and a `{`-prefixed type reaching it
    // directly (bypassing the synthesis-aware call sites) must still be
    // excluded rather than misclassified as DTO-like-by-elimination text
    // the grammar cannot parse.
    if (cleaned.startsWith('{')) {
      return false;
    }

    // DTO-like by elimination: not a primitive, not a known Class, not a
    // literal/literal-union, not an inline object-literal — matches the
    // heuristic's original fallback, gated by classification instead of a
    // surface-character guess.
    return cleaned.charAt(0).toUpperCase() === cleaned.charAt(0);
  }

  // RFC-TM-10 §2 (rfc-tm-10-diamond.md, D-LEG-2, issue #65) — a walk
  // distinct from `ensureBuiltinExtendsStub`'s `extends`-triggered
  // allowlist mechanism. Once a `TypeExprNode` exists for a DTO field, a
  // function parameter, or a return type (via `parseTypeExprText`), every
  // `generic`-kind node's `args` is walked for a `named`-kind argument whose
  // name resolves via `externalTypeToPackage` to an external package import
  // — `Pick<S3Client, "send">`'s `S3Client` argument, not `Pick` itself
  // (`Pick` is a builtin generic, matches the checker's own PRIMITIVES
  // allowlist, check-dto-fields.ts:30-49) and not `"send"` (a literal, no
  // stub needed). Reuses `addExternalTypeToDepExports`'s existing
  // rebuild-and-append `DependencyNode.exports` mechanism directly — no new
  // stub-synthesis function, closing the latent duplication risk between
  // this item and D-LEG-1's independently-authored issue.
  private walkGenericArgsForExternalStubs(node: TypeExprNode): void {
    switch (node.kind) {
      case 'generic':
        for (const arg of node.args) {
          if (arg.kind === 'named') {
            this.addExternalTypeToDepExports(arg.name);
          } else {
            this.walkGenericArgsForExternalStubs(arg);
          }
        }
        return;
      case 'union':
      case 'intersection':
        for (const member of node.members) {
          this.walkGenericArgsForExternalStubs(member);
        }
        return;
      case 'array':
        this.walkGenericArgsForExternalStubs(node.element);
        return;
      case 'named':
      case 'literal':
      case 'opaque':
        return;
      default: {
        const exhaustive: never = node;
        void exhaustive;
        return;
      }
    }
  }

  // issue #72 (rfc-tm-10-diamond.md §5's tracked follow-up) — synthesizes a
  // named DTO entity from an inline object-literal function
  // parameter/return type, mirroring D-LEG-2's external-stub synthesis
  // mechanism (`walkGenericArgsForExternalStubs`/`addExternalTypeToDepExports`,
  // RFC-TM-10 §2): rather than dropping the type from the graph
  // (`isDTOLikeType`'s `{`-prefix exclusion, D-LEG-1/§5), give it a real
  // bare `entity_name` and real `DtoFieldNode`s, so `input`/`output`
  // resolve to an actual DTO instead of staying `undefined`.
  //
  // Naming: deterministic and collision-safe. The caller passes
  // `${functionEntityName}${suffix}` (`suffix` is `'Input'` or `'Output'`,
  // the same codomain-disambiguation convention `walkGenericArgsForExternalStubs`'s
  // sibling mechanisms use for input-vs-output distinction) — collision-free
  // ACROSS FUNCTIONS because `functionEntityName` is already the
  // converter's own collision-resolved function name (`functionNameRemap`,
  // X-CONV-4). This function runs that candidate through
  // `sanitizeEntityName` first (the same PascalCasing sanitizer every other
  // DTO-shaped entity name in this converter already passes through —
  // `convertInterfaceToDTO`/`convertTypeAliasToDTO` use `createEntityName`,
  // which is identity, but D-LEG-3's namespace-qualified-implements stub
  // uses this exact sanitizer for the same "derive a name, not author one"
  // reason), so `updateProfileInput` becomes `UpdateProfileInput` —
  // matching the PascalCase convention every hand-authored DTO in this
  // codebase's fixtures already follows, and ensuring a collision against a
  // hand-authored `interface FooInput` is detected (both names normalize to
  // the same PascalCase form). A collision can still occur AGAINST AN
  // UNRELATED entity that happens to share the derived name (e.g. a
  // hand-named `DTO FooInput %` already exists) or between the input DTO
  // and output DTO for the SAME function if the caller derived the same
  // suffix twice — resolved by appending the same `__2`, `__3`, ...
  // double-underscore disambiguator `reserveFunctionEntityNames` already
  // uses for function-name collisions, walked upward until a free name is
  // found.
  //
  // Nesting: a field whose own type is ALSO an inline object literal
  // recurses into its own synthesized DTO, named by running
  // `${dtoName}_${fieldName}` through `sanitizeEntityName` (the same
  // sanitizer D-LEG-3's namespace-qualified-`implements` stub uses) — which
  // PascalCases each underscore-delimited segment and JOINS THEM WITH NO
  // SEPARATOR (`createOrderInput_shipping` -> `CreateOrderInputShipping`,
  // not `CreateOrderInput_Shipping`), rather than falling to an `opaque`
  // TypeExprNode leaf. This
  // is a stronger restoration than TM-8's own `TypeExprNode` grammar
  // supports for an UNNAMED nested shape (there is no `'struct'`/`'object'`
  // TypeExprNode kind — `named | literal | generic | array | union |
  // intersection | opaque` is the complete set, `ast/type-expr-node.ts`),
  // but a NAMED nested DTO with a `named`-kind field reference IS fully
  // supported (`check-dto-fields.ts`'s `PRIMITIVES`-gated resolution accepts
  // DTO/Class/TypeDef kinds) — so recursing preserves strictly more
  // information than an opaque leaf would, at zero grammar cost.
  private synthesizeInlineDTO(objectLiteralType: string, baseName: string): string {
    const dtoName = this.reserveSynthesizedDTOName(this.sanitizeEntityName(baseName));
    this.addEntityName(dtoName, 'synthesizeInlineDTO');

    const dtoEntity = new DtoNode({
      name: dtoName,
      span: SYNTHETIC_SPAN,
      raw: `${dtoName} %`,
      sourceForm: 'shortform',
      fields: this.parseInlineObjectLiteralToFields(objectLiteralType, dtoName),
      purpose: 'Synthesized from an inline object-literal parameter/return type (issue #72).',
    });

    this.entities.push(dtoEntity);
    return dtoName;
  }

  // Collision resolution shared by `synthesizeInlineDTO`'s two call sites
  // (an input DTO and an output DTO for the same function, or a synthesized
  // name colliding with an unrelated pre-existing entity). Mirrors
  // `reserveFunctionEntityNames`'s own `<baseName>__<disambiguator>` shape
  // (X-CONV-4) rather than inventing a second collision convention.
  private reserveSynthesizedDTOName(baseName: string): string {
    // issue #72 (tm10-inc2), adversarial-review blocker fix (PR #84) —
    // `reservedNamedTypeNames` holds this module's own
    // interface/type-alias/enum names, reserved ahead of function
    // conversion but not yet real entities (see that set's own doc
    // comment). A synthesized name must avoid BOTH `entityNames` (real
    // entities already converted) and this reservation set (entities that
    // WILL exist once this module's own interface/type-alias/enum loop
    // runs) — checking only `entityNames` is exactly the gap that let a
    // synthesized DTO evict a same-module hand-authored interface.
    const isTaken = (name: string): boolean => this.entityNames.has(name) || this.reservedNamedTypeNames.has(name);
    if (!isTaken(baseName)) {
      return baseName;
    }
    let attempt = 2;
    while (isTaken(`${baseName}__${attempt}`)) {
      attempt += 1;
    }
    return `${baseName}__${attempt}`;
  }

  // Brace-depth-aware property split for an inline object-literal type's
  // body — REPLACES `parseObjectProperties`'s naive `content.split(/[;,\n]/)`
  // for this synthesis path specifically. That split is unsound the moment
  // a field's own type contains a nested `{`/`}`, `<`/`>`, or `(`/`)` pair
  // (a nested object literal, a generic argument list, or a function-type
  // parameter list each contain the SAME `;`/`,` delimiters the naive split
  // treats as field boundaries) — `parseObjectProperties` was never
  // exercised against a nested shape before this item (zero nested-object
  // test coverage existed), so this is a new, correct splitter for the new
  // call site rather than a behavior change to the existing one.
  //
  // Adversarial review (PR #84) found two real defects in an earlier
  // version of this scanner, both fixed here:
  //   (1) treating bare `<`/`>` as a matched bracket pair breaks on an
  //       arrow-function-typed field (`onDone: (result: string) => void`)
  //       — the `=>` arrow's `>` has no matching `<`, driving `angleDepth`
  //       permanently negative and suppressing every later `;`/`,` split
  //       for the rest of the string (repro: `label` silently merges into
  //       `onDone`'s type text). Fixed by tracking angle-bracket depth
  //       SEPARATELY from brace/paren/bracket depth and clamping it at
  //       zero (never negative) — an unmatched `>` from `=>`/`>=`/`<=` is
  //       simply ignored rather than corrupting the running depth count.
  //   (2) a quoted string-literal type (a literal-union member,
  //       `kind: 'a,b' | 'c;d'`) contains `,`/`;` characters that are NOT
  //       field delimiters — fixed by skipping over `'...'`/`"...'`
  //       string-literal spans entirely (delimiter chars inside a string
  //       never reach the split/depth logic).
  private splitObjectLiteralProperties(content: string): string[] {
    const properties: string[] = [];
    let braceDepth = 0;
    let angleDepth = 0;
    let current = '';
    let quoteChar: string | undefined;

    for (let i = 0; i < content.length; i += 1) {
      const char = content[i];

      if (quoteChar !== undefined) {
        current += char;
        if (char === '\\') {
          // Consume the escaped character verbatim so an escaped quote
          // (`\'` or `\"`) does not end the string span early.
          i += 1;
          if (i < content.length) {
            current += content[i];
          }
          continue;
        }
        if (char === quoteChar) {
          quoteChar = undefined;
        }
        continue;
      }

      if (char === "'" || char === '"') {
        quoteChar = char;
        current += char;
        continue;
      }

      if (char === '{' || char === '(' || char === '[') {
        braceDepth += 1;
      } else if (char === '}' || char === ')' || char === ']') {
        braceDepth -= 1;
      } else if (char === '<') {
        angleDepth += 1;
      } else if (char === '>') {
        // Clamp at zero: an unmatched `>` (from `=>`, `>=`, or a stray
        // comparison-shaped token in a type position) must never drive
        // angleDepth negative — a negative depth would never return to
        // zero and would suppress every subsequent split for the rest of
        // the string, per this function's own doc comment above.
        angleDepth = Math.max(0, angleDepth - 1);
      }

      if ((char === ';' || char === ',' || char === '\n') && braceDepth === 0 && angleDepth === 0) {
        if (current.trim()) {
          properties.push(current.trim());
        }
        current = '';
        continue;
      }
      current += char;
    }
    if (current.trim()) {
      properties.push(current.trim());
    }
    return properties;
  }

  // Parses one property line (`name?: Type` or `name: Type`) from an inline
  // object-literal's body into its name/type/optionality — the same
  // `^(\w+)(\?)?\s*:\s*(.+)$` shape `parseObjectProperties` uses, applied to
  // one brace-depth-correct property string instead of a naively-split line.
  private parseObjectLiteralProperty(propertyText: string): { name: string; type: string; optional: boolean } | undefined {
    const match = propertyText.match(/^(\w+)(\?)?\s*:\s*(.+)$/s);
    if (!match?.[1] || !match[3]) {
      return undefined;
    }
    return { name: match[1], type: match[3].trim(), optional: !!match[2] };
  }

  private parseInlineObjectLiteralToFields(objectLiteralType: string, dtoName: string): DtoFieldNode[] {
    const trimmed = objectLiteralType.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
      return [];
    }
    const content = trimmed.slice(1, -1);
    const propertyTexts = this.splitObjectLiteralProperties(content);
    const fields: DtoFieldNode[] = [];

    for (const propertyText of propertyTexts) {
      const prop = this.parseObjectLiteralProperty(propertyText);
      if (!prop) {
        continue;
      }

      // A nested inline object-literal field type recurses into its own
      // synthesized DTO (see `synthesizeInlineDTO`'s doc comment above for
      // why this beats an `opaque` leaf). The nested DTO's name is derived
      // from the PARENT DTO's name plus the field name, sanitized and
      // PascalCased with `sanitizeEntityName` — the same sanitizer
      // D-LEG-3's namespace-qualified-`implements` stub mechanism uses,
      // reused rather than re-derived.
      if (isInlineObjectLiteralType(prop.type)) {
        const nestedBaseName = this.sanitizeEntityName(`${dtoName}_${prop.name}`);
        const nestedDtoName = this.synthesizeInlineDTO(prop.type, nestedBaseName);
        const typeExpr = parseTypeExprText(nestedDtoName).typeExpr;
        fields.push(
          new DtoFieldNode({
            name: prop.name,
            type: nestedDtoName,
            typeExpr,
            optionalityMarker: prop.optional ? 'question' : 'none',
            span: SYNTHETIC_SPAN,
          }),
        );
        continue;
      }

      const propType = this.sanitizeFieldType(prop.type);
      const typeExpr = parseTypeExprText(propType).typeExpr;
      // D-LEG-2 (issue #65) — same generic-argument external-stub walk
      // every other field-synthesis call site applies.
      this.walkGenericArgsForExternalStubs(typeExpr);
      fields.push(
        new DtoFieldNode({
          name: prop.name,
          type: propType,
          typeExpr,
          optionalityMarker: prop.optional ? 'question' : 'none',
          span: SYNTHETIC_SPAN,
        }),
      );
    }

    return fields;
  }

  private addExternalTypeToDepExports(typeName: string): void {
    // Clean the type name (remove array suffixes, Promise wrapper, etc.)
    const cleanedType = typeName.replace(/\[\]$/, '').replace(/^Promise<(.+)>$/, '$1');

    // Check if this type is from an external package
    const packageName = this.externalTypeToPackage.get(cleanedType);
    if (packageName) {
      // Find the dependency entity
      const depEntity = this.dependencies.get(packageName);
      if (depEntity) {
        // DependencyNode.exports is readonly (EntityNode fields are populated
        // once at construction, never written back — no_side_effects rule).
        // Add the type to a rebuilt node's exports if not already there.
        const existingExports = depEntity.exports ?? [];
        if (!existingExports.includes(cleanedType)) {
          this.dependencies.set(
            packageName,
            new DependencyNode({
              name: depEntity.name,
              span: depEntity.span,
              raw: depEntity.raw,
              sourceForm: depEntity.sourceForm,
              purpose: depEntity.purpose,
              version: depEntity.version,
              exports: [...existingExports, cleanedType],
            }),
          );
        }
      }
    }
  }

  private sanitizeFieldType(fieldType: string): string {
    // Fix discriminated union issues - convert 'Function' type to string literal
    if (fieldType === 'Function') {
      return 'string'; // Functions should be string literals in DTOs
    }

    // Convert literal union types to string
    if (fieldType.includes("'") && fieldType.includes('|')) {
      return 'string'; // Union of string literals -> string
    }

    // Convert entity types to string literals (they're usually discriminated unions)
    const entityTypePattern = /^'(Program|File|Function|Class|ClassFile|Constants|DTO|Asset|UIComponent|RunParameter|Dependency)'$/;
    if (entityTypePattern.test(fieldType)) {
      return 'string';
    }

    // Clean up the type string. Reconciles fixture 87 (PR #161,
    // sammons/bens-almanac) and fixture 91 (PR #158, sammons/mail-agent),
    // which found the SAME defect from two corpora: this fallthrough ended in
    // a bare `fieldType.trim()`, which strips only the LEADING and TRAILING
    // whitespace run. A field type authored across multiple source lines
    // therefore arrived with its interior newlines and indentation intact.
    // Every DTO field line in the grammar is single-line (`- name: type`), so
    // an interior `\n` emitted verbatim splits one field across several lines:
    // the leading fragments become `syntax/error`s and the trailing one an
    // unparsable stray.
    //
    // Corpora: bens-almanac packages/{nhtsa,usda}-ingestion/src/handler.ts
    // (`IngestionDeps.checkSupersession` / `.createPr`) and mail-agent
    // `src/harness/singleton.ts:338` (`HarnessDeps.executeMutation`) /
    // `src/store/revert.ts:143` (`Reverters.modifyLabels`).
    //
    // `collapseToSingleLineType` supersedes the bare `collapseTypeWhitespace`
    // both PRs started from. Collapsing alone is necessary but NOT sufficient:
    // the multi-line spelling also carries a dangling comma before its closing
    // `)` and a space just inside its brackets, both legal across lines and
    // neither legal — nor emitted — in the single-line form. Fixture 87's own
    // `singleLineTarget` control is the proof: after the collapse alone, the
    // multi-line and single-line spellings of the same type still differed.
    // The full normalization makes them byte-identical, which is what both
    // fixtures' controls assert.
    //
    // Meaning-preserving throughout: TypeScript treats inter-token whitespace
    // as insignificant everywhere a type can appear, a dangling comma before a
    // closer carries no type information, and this collapses rather than
    // truncates — the full text survives on one line. The rewrites are
    // literal-aware (PR #158 review comment 22136), so a string-literal type's
    // exact characters are never touched.
    //
    // `parenthesizeTypeQueryText` then wraps any bare `typeof X` so it lands
    // in the grammar's existing `(typeof X)` production (fixture 92).
    return parenthesizeTypeQueryText(collapseToSingleLineType(fieldType));
  }

  private convertTypeToSchema(type: string): string {
    // Convert TypeScript types to schema names.
    //
    // The Constants type slot is grammatically an `entity_name`
    // (`grammar/grammar.js:761` — `optional(seq(':', $.entity_name))`,
    // matching `grammar.md:35`), so whatever this returns must match
    // `/[A-Za-z_]\w*/`. Anything else emits a line the checker rejects as
    // "Unparsable text".
    if (type.includes('[]')) {
      return 'Array';
    }
    if (type.includes('Record<')) {
      return 'Record';
    }
    if (type.includes('Map<')) {
      return 'Map';
    }
    if (type.includes('{') && type.includes('}')) {
      return 'Object';
    }

    // Ladder rung `artifice-with-intelligence` (fixture 94), corpus
    // `server/lib/parse-embed.ts:7`: `ReadonlySet<string>`. The two
    // allowlist entries above generalize — ANY generic must degrade to its
    // base name, or its `<...>` argument list reaches the entity_name slot
    // verbatim. Reducing to the base is the same lossy-but-grammatical
    // answer `Record<string, string>` -> `Record` already gives.
    const genericBase = /^([A-Za-z_]\w*)\s*</.exec(type);
    if (genericBase?.[1] !== undefined) {
      return genericBase[1];
    }

    // A type that is still not a bare identifier (a union, an intersection,
    // a function type, a tuple, a qualified `ns.Type`) has no entity_name
    // rendering at all. Drop the annotation rather than emit an
    // ungrammatical line — the Constants entity itself is still recorded.
    if (!/^[A-Za-z_]\w*$/.test(type)) {
      return '';
    }

    return type;
  }

  private getRelativePath(filePath: string): string {
    // X-CONV-3 — relativize against the target project root (the tsconfig's
    // directory), never `process.cwd()`. The prior `process.cwd()`-based
    // implementation produced different emitted paths depending on where
    // the CLI happened to be invoked from — a correctness bug, since the
    // extracted `.tmd`'s paths are meant to describe the target project's
    // own layout, not the operator's shell location.
    return path.relative(this.projectRoot, filePath);
  }

  private sanitizeEntityName(name: string): string {
    // Convert to PascalCase and remove invalid characters
    return name
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/^(\d)/, '_$1') // Ensure doesn't start with number
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  private isValidEntityName(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }

  private deriveProgramName(fileName: string): string {
    // X-CONV-4 — collision-proof naming. The prior `endsWith('App') ? base :
    // `${base}App`` scheme produces bare `App` for `App.tsx`, colliding with
    // the real exported `App` component (census gap 6, issue #45's crash
    // case). `<Base>__App` is provably outside `sanitizeEntityName`'s
    // codomain: that function collapses every run of underscores to a
    // single one and never re-inserts a separator when joining
    // PascalCase-cased parts (`'_+' -> '_'` then `split('_').join('')` —
    // see its own comment), so no sanitized identifier can ever contain
    // `__`. A literal `__` separator therefore cannot collide with any real
    // entity name derived from source, without needing a runtime collision
    // probe or a nondeterministic suffix (both rejected in the Diamond
    // Doc's Rejected Alternatives — `App2`/`AppProgram` are not
    // collision-proof against adversarial real names).
    const base = this.sanitizeEntityName(fileName);
    return `${base}__App`;
  }

  private addError(message: string, filePath?: string): void {
    const error: ConversionError = {
      message,
      filePath: filePath || undefined,
      line: undefined,
      column: undefined,
    };
    this.errors.push(error);
  }

  private addWarning(message: string, filePath?: string, suggestion?: string): void {
    const warning: ConversionWarning = {
      message,
      filePath: filePath || undefined,
      suggestion: suggestion || undefined,
    };
    this.warnings.push(warning);
  }

  private isFunctionExported(func: ParsedFunction, module: ParsedModule): boolean {
    // Check if function is in module exports
    return module.exports.some((exp) => exp.name === func.name);
  }

  private isExternalPackage(specifier: string): boolean {
    // Check if it's a Node.js built-in or external package
    return !specifier.startsWith('.') && !specifier.startsWith('/');
  }

  // issue #87 — `registerModuleExports` indexes `exportRegistry` under
  // extension-LESS specifier guesses only (`./foo`, never `./foo.ts`). A
  // codebase that writes explicit-extension internal imports (this repo's
  // own `module_is_nodenext`/`verbatimModuleSyntax` convention — e.g.
  // `import { x } from './foo.ts'`) reports `imp.specifier` verbatim WITH
  // the extension, so the registry lookup misses on every internal import.
  // Fix (issue #87's suggested option (b), the more robust of the two):
  // strip a known source extension off the specifier before every
  // `exportRegistry` lookup, rather than trying to register every
  // extension-including permutation on the write side. Only a KNOWN source
  // extension is stripped (not an arbitrary trailing `.something`, which
  // could be a real directory/file segment with a dot in its name).
  private stripKnownSourceExtension(specifier: string): string {
    return specifier.replace(/\.(ts|tsx|js|jsx|mts|cts|mjs|cjs)$/, '');
  }

  private isModuleEntryPoint(module: ParsedModule): boolean {
    // Check if this module's file path matches any entry point
    const relativePath = this.getRelativePath(module.filePath);
    return this.entryPoints.has(relativePath);
  }

  private findEntryEntityName(entryFilePath: string): string {
    const relativePath = this.getRelativePath(entryFilePath);

    // Look for a File OR ClassFile entity at this path. issue #90 (lead
    // ruling) — a ClassFile is a File fused with a Class (`--prefer-class-file`
    // fuses an entrypoint module that declares a top-level class into a
    // ClassFile instead of a plain File), and is now a legal Program.entry
    // target (VALID_REFERENCES.entry.to, valid-references.ts) — the search
    // must match that shape too, or a class-containing entrypoint module
    // would still fall through to the synthesized fallback name below,
    // which corresponds to no real entity.
    const matchingFileEntity = this.entities.find((entity) => {
      if ((entity.kind === 'File' || entity.kind === 'ClassFile') && 'path' in entity) {
        return entity.path === relativePath;
      }
      return false;
    });

    if (matchingFileEntity) {
      return matchingFileEntity.name;
    }

    // Since we force File/ClassFile entity creation for entry points in
    // convertModule, this should always find one of those two. Fallback to
    // predictable name.
    const fileName = path.basename(entryFilePath, path.extname(entryFilePath));
    return this.sanitizeEntityName(`${fileName}File`);
  }

  private createNamespaceEntity(namespaceName: string, specifier: string): void {
    const entityName = createEntityName(namespaceName);

    // Don't create if it already exists
    if (this.entityNames.has(entityName)) {
      return;
    }

    this.entityNames.add(entityName);

    // For external packages, check if it's a known namespace with methods
    const methods = this.extractNamespaceMethods(namespaceName, specifier);

    const namespaceEntity = new ClassNode({
      name: entityName,
      span: SYNTHETIC_SPAN,
      raw: `${entityName} <: NamespaceImport`,
      sourceForm: 'shortform',
      extends: undefined,
      implements: ['NamespaceImport'], // Mark as namespace import
      methods: methods,
      purpose: `Namespace import: ${namespaceName} from ${specifier}`,
    });

    this.entities.push(namespaceEntity);
  }

  private extractNamespaceMethods(_namespaceName: string, specifier: string): string[] {
    // For external packages, we might know common methods
    const knownNamespaceMethods: Record<string, string[]> = {
      path: ['join', 'resolve', 'dirname', 'basename', 'extname', 'relative'],
      fs: ['readFile', 'writeFile', 'exists', 'mkdir', 'readdir'],
      util: ['promisify', 'inspect', 'format', 'deprecate'],
      crypto: ['createHash', 'randomBytes', 'createCipher'],
      os: ['platform', 'arch', 'type', 'release', 'hostname'],
    };

    // Check if it's a known Node.js namespace
    if (this.isExternalPackage(specifier)) {
      const packageMethods = knownNamespaceMethods[specifier];
      if (packageMethods) {
        return [...packageMethods];
      }
    }

    // For internal modules, try to extract methods from export registry.
    // issue #87 twin lookup — same extension-stripping fallback as
    // resolveImportToEntity.
    const moduleExports = this.exportRegistry[specifier] ?? this.exportRegistry[this.stripKnownSourceExtension(specifier)];
    if (moduleExports) {
      return Array.from(moduleExports.namedExports);
    }

    // Default fallback - we'll add common methods that might be called
    return ['default']; // Most namespaces have at least some callable methods
  }
}
