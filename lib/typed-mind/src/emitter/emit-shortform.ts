// RFC-TM-4 §2 (rfc-tm-4-diamond.md) — shortform emission, one function per
// entity kind, ported from the legacy per-kind shortform converters
// (syntax-generator.ts:491-729) with one deliberate delta: this module emits
// only DECLARED fields carried by the AST (never LinkIndex/derived data), so
// UIComponent's `containedBy` continuation prints `declaredContainedBy`
// verbatim and nothing else — the round-trip-consistent choice per the RFC's
// Rejected Alternatives ("Emitting derived reverse links").
//
// DTO field optionality (S-CORE-2b): the legacy converter collapsed both
// spellings into one boolean and always re-derived the `(optional)` suffix
// (syntax-generator.ts:647-663); this port switches on the three-way
// `optionalityMarker` so `?` round-trips as `?` and `(optional)` round-trips
// as `(optional)`, per field.
//
import type { AssetNode } from '../ast/asset-node.ts';
import { ClassFileNode } from '../ast/class-file-node.ts';
import { ClassNode } from '../ast/class-node.ts';
import type { ConstantsNode } from '../ast/constants-node.ts';
import type { DependencyNode } from '../ast/dependency-node.ts';
import type { Diagnostic } from '../ast/diagnostic.ts';
import type { DtoNode } from '../ast/dto-node.ts';
import type { EntityNode } from '../ast/entity-node.ts';
import type { FileNode } from '../ast/file-node.ts';
import type { FunctionNode } from '../ast/function-node.ts';
import type { ProgramNode } from '../ast/program-node.ts';
import type { RunParameterNode } from '../ast/run-parameter-node.ts';
import type { TypeDefNode } from '../ast/type-def-node.ts';
import type { UiComponentNode } from '../ast/ui-component-node.ts';
import { genericEmissionDiagnostics, genericNeedsLongform, parameterHeader, printHeritage } from './generic-declaration-emission.ts';
import { printTypeExpr } from './print-type-expr.ts';
import { quoteStringLiteral } from './quote-string-literal.ts';

// A shortform `comment` is an INLINE trailing comment on the declaration's
// own first line (grammar.js: every *_declaration production takes an
// optional inline_comment before its line end — `Name -> Entry # comment`),
// not a preceding standalone comment line (which the walker treats as a
// comment_line that never attaches, cst-to-ast.ts). Appending it to the first
// emitted line is what makes it re-attach on reparse.
const withInlineComment = (lines: string[], comment: string | undefined): string[] => {
  if (comment === undefined || lines.length === 0) {
    return lines;
  }
  const [first, ...rest] = lines;
  return [`${first} # ${comment}`, ...rest];
};

// toggle-fidelity audit (2026-08-31, claude-home knowledge/projects/typedmind/
// toggle-fidelity-audit-2026-08-31.md) — a bucket-a mechanical bug found by
// the toggle round-trip harness: longform-builder.ts sets `entity.comment`
// from the SAME `description:` property value it also assigns to
// `purpose`/`description` ("Legacy longform comment = the description
// property", longform-builder.ts's buildFromLongformBlock). For every kind
// whose shortform body already prints that purpose/description as its own
// quoted continuation line (or on the header line), a longform-sourced
// entity's `comment` therefore always equals what the body already shows —
// re-emitting it via withInlineComment doubles the same text onto the line
// as BOTH the quoted body text and a distinct `# comment`, which then
// reparses into a genuinely-distinct-looking `comment` field that never
// existed in a shortform-authored original (confirmed: shortform CAN
// legally carry a real, DIFFERENT comment alongside a purpose — `Foo %
// "purpose" # a different comment` parses to two separate string values —
// so this function only suppresses the duplicate when the two values are
// actually equal, never blanket-drops a comment). TypeDef has no
// purpose/description line in its shortform body at all (typeDefToShortform
// below), so its comment is never a duplicate and always re-emits.
const bodyAlreadyShows = (entity: EntityNode): string | undefined => {
  switch (entity.kind) {
    case 'Program':
      return (entity as ProgramNode).purpose;
    case 'File':
      return (entity as FileNode).purpose;
    case 'Function':
      return (entity as FunctionNode).description;
    case 'Class':
      return (entity as ClassNode).purpose;
    case 'ClassFile':
      return (entity as ClassFileNode).purpose;
    case 'Constants':
      return (entity as ConstantsNode).purpose;
    case 'DTO':
      return (entity as DtoNode).purpose;
    case 'Asset':
      return (entity as AssetNode).description;
    case 'UIComponent':
      return (entity as UiComponentNode).purpose;
    case 'RunParameter':
      return (entity as RunParameterNode).description;
    case 'Dependency':
      return (entity as DependencyNode).purpose;
    case 'TypeDef':
      return undefined;
  }
};

// Defect fix (issue #126): entity.entry is a required, always-a-string field
// (ProgramNode's honest-fields table calls it Required), but the longform
// builder fills it with '' rather than leaving it undefined whenever the
// source document never resolved a real entry point (a typo'd property key
// like `entryPoint:`, or a different path check-entry-point.ts's "references
// undefined entry point ''" diagnostic already flags). Emitting
// `${name} -> ${entry}` unconditionally on an empty entry produced
// `Name ->  vVersion` — a double space with no real Entry token for the
// reparser to anchor on, which silently mis-split the trailing `v1.0.0` blob
// at the first `.` into a garbage entry ('v1') and a truncated version
// ('.0.0'). No diagnostic ever named that corruption. Refusing to emit here
// is the fix: a document whose Program entry point cannot be honestly
// expressed in shortform must fail loud (this throw), not produce a
// syntactically-parseable-but-semantically-wrong document. Callers
// (browser.ts's toggleFormat/emitShortform, the playground's toggle handler)
// already catch emitter exceptions and surface them as errors instead of
// silently swallowing them.
const programToShortform = (entity: ProgramNode): string[] => {
  if (entity.entry === '') {
    throw new Error(
      `Cannot emit shortform for Program '${entity.name}': entry point is unresolved (empty). ` +
        `Shortform's 'Name -> Entry' line has no token to carry an empty entry, and emitting one ` +
        `anyway would corrupt the version on reparse. Fix the Program's 'entry:' property first.`,
    );
  }
  let line = `${entity.name} -> ${entity.entry}`;
  if (entity.purpose !== undefined) {
    line += ` ${quoteStringLiteral(entity.purpose)}`;
  }
  if (entity.version !== undefined) {
    line += ` v${entity.version}`;
  }
  const lines = [line];
  if (entity.exports !== undefined && entity.exports.length > 0) {
    lines.push(`  -> [${entity.exports.join(', ')}]`);
  }
  return lines;
};

const fileToShortform = (entity: FileNode): string[] => {
  const lines = [`${entity.name} @ ${entity.path}:`];
  if (entity.purpose !== undefined) {
    lines.push(`  ${quoteStringLiteral(entity.purpose)}`);
  }
  if (entity.imports.length > 0) {
    lines.push(`  <- [${entity.imports.join(', ')}]`);
  }
  if (entity.exports.length > 0) {
    lines.push(`  -> [${entity.exports.join(', ')}]`);
  }
  // RFC-TM-11 §RX-5 (rfc-tm-11-diamond.md) — File only, after exports.
  if (entity.reExports.length > 0) {
    lines.push(`  <-> [${entity.reExports.join(', ')}]`);
  }
  return lines;
};

const functionToShortform = (entity: FunctionNode): string[] => {
  const lines = [`${entity.name}${parameterHeader(entity)} :: ${entity.signature}`];
  if (entity.description !== undefined) {
    lines.push(`  ${quoteStringLiteral(entity.description)}`);
  }
  // pendingDependencies is the unresolved residue of the mixed `<- [...]`
  // list after Q4's forward-semantics distribution (§3.4) — the names that
  // resolved into calls/affects/consumes/input are ALREADY carried by those
  // fields below; re-emitting the residue as its own `<- [...]` (the
  // import_list continuation, a distinct production from the unbracketed
  // `<- Name` input line, so the two coexist) is what makes distribution
  // re-derive the identical residue on reparse instead of silently dropping
  // it (the validator's "Function dependency not found" check, RFC §1,
  // consumes exactly this field).
  if (entity.pendingDependencies.length > 0) {
    lines.push(`  <- [${entity.pendingDependencies.join(', ')}]`);
  }
  if (entity.input !== undefined) {
    lines.push(`  <- ${entity.input}`);
  }
  if (entity.output !== undefined) {
    lines.push(`  -> ${entity.output}`);
  }
  if (entity.calls.length > 0) {
    lines.push(`  ~> [${entity.calls.join(', ')}]`);
  }
  if (entity.affects !== undefined && entity.affects.length > 0) {
    lines.push(`  ~ [${entity.affects.join(', ')}]`);
  }
  if (entity.consumes !== undefined && entity.consumes.length > 0) {
    lines.push(`  $< [${entity.consumes.join(', ')}]`);
  }
  return lines;
};

const inheritanceSuffix = (extendsName: string | undefined, implementsList: readonly string[]): string => {
  if (extendsName === undefined) {
    return implementsList.length > 0 ? ` ${implementsList.join(', ')}` : '';
  }
  return implementsList.length > 0 ? ` ${extendsName}, ${implementsList.join(', ')}` : ` ${extendsName}`;
};

const classToShortform = (entity: ClassNode): string[] => {
  const lines = [
    `${entity.name}${parameterHeader(entity)} <:${inheritanceSuffix(entity.heritage.extends === undefined ? undefined : printHeritage(entity.heritage.extends), entity.heritage.implements.map(printHeritage))}`,
  ];
  if (entity.purpose !== undefined) {
    lines.push(`  ${quoteStringLiteral(entity.purpose)}`);
  }
  if (entity.methods.length > 0) {
    lines.push(`  => [${entity.methods.join(', ')}]`);
  }
  return lines;
};

const classFileToShortform = (entity: ClassFileNode): string[] => {
  const inheritance =
    entity.extends === undefined && entity.implements.length === 0
      ? ''
      : ` <:${inheritanceSuffix(entity.heritage.extends === undefined ? undefined : printHeritage(entity.heritage.extends), entity.heritage.implements.map(printHeritage))}`;
  const lines = [`${entity.name}${parameterHeader(entity)} #: ${entity.path}${inheritance}`];
  if (entity.purpose !== undefined) {
    lines.push(`  ${quoteStringLiteral(entity.purpose)}`);
  }
  if (entity.imports.length > 0) {
    lines.push(`  <- [${entity.imports.join(', ')}]`);
  }
  if (entity.methods.length > 0) {
    lines.push(`  => [${entity.methods.join(', ')}]`);
  }
  // Auto-self-export (ClassFileNode constructor) is not re-emitted as a
  // visible export list unless something else is exported too, matching the
  // legacy behavior that only prints exports beyond the implicit self-export
  // would be redundant to reconstruct — but since the AST already folded the
  // self-export in, emit exactly what's declared (round-trip-consistent: the
  // ClassFileNode constructor re-adds the self-export on the next parse if
  // it's ever missing, so omitting a self-export-only list is lossless).
  const visibleExports = entity.exports.filter((exportName) => exportName !== entity.name);
  if (visibleExports.length > 0) {
    lines.push(`  -> [${entity.exports.join(', ')}]`);
  }
  return lines;
};

const constantsToShortform = (entity: ConstantsNode): string[] => {
  let line = `${entity.name} ! ${entity.path}`;
  if (entity.schema !== undefined) {
    line += ` : ${entity.schema}`;
  }
  const lines = [line];
  if (entity.purpose !== undefined) {
    lines.push(`  ${quoteStringLiteral(entity.purpose)}`);
  }
  return lines;
};

const dtoFieldLine = (field: DtoNode['fields'][number]): string => {
  let fieldLine = `  - ${field.name}`;
  if (field.optionalityMarker === 'question') {
    fieldLine += '?';
  }
  fieldLine += `: ${field.type}`;
  if (field.description !== undefined) {
    fieldLine += ` ${quoteStringLiteral(field.description)}`;
  }
  if (field.optionalityMarker === 'parenthesized') {
    fieldLine += ' (optional)';
  }
  return fieldLine;
};

const dtoToShortform = (entity: DtoNode): string[] => {
  let line = `${entity.name}${parameterHeader(entity)} %`;
  if (entity.purpose !== undefined) {
    line += ` ${quoteStringLiteral(entity.purpose)}`;
  }
  const lines = [line];
  for (const field of entity.fields) {
    lines.push(dtoFieldLine(field));
  }
  return lines;
};

const assetToShortform = (entity: AssetNode): string[] => {
  const lines = [`${entity.name} ~ ${quoteStringLiteral(entity.description)}`];
  if (entity.containsProgram !== undefined) {
    lines.push(`  >> ${entity.containsProgram}`);
  }
  return lines;
};

const uiComponentToShortform = (entity: UiComponentNode): string[] => {
  const marker = entity.root ? '&!' : '&';
  const lines = [`${entity.name} ${marker} ${quoteStringLiteral(entity.purpose)}`];
  if (entity.contains !== undefined && entity.contains.length > 0) {
    lines.push(`  > [${entity.contains.join(', ')}]`);
  }
  if (entity.declaredContainedBy !== undefined && entity.declaredContainedBy.length > 0) {
    lines.push(`  < [${entity.declaredContainedBy.join(', ')}]`);
  }
  return lines;
};

const runParameterToShortform = (entity: RunParameterNode): string[] => {
  let line = `${entity.name} $${entity.paramType} ${quoteStringLiteral(entity.description)}`;
  if (entity.required === true) {
    line += ' (required)';
  }
  const lines = [line];
  if (entity.defaultValue !== undefined) {
    lines.push(`  = ${quoteStringLiteral(entity.defaultValue)}`);
  }
  return lines;
};

const dependencyToShortform = (entity: DependencyNode): string[] => {
  let line = `${entity.name} ^ ${quoteStringLiteral(entity.purpose)}`;
  if (entity.version !== undefined) {
    line += ` v${entity.version}`;
  }
  const lines = [line];
  if (entity.exports !== undefined && entity.exports.length > 0) {
    lines.push(`  -> [${entity.exports.join(', ')}]`);
  }
  return lines;
};

// X-TYPE-7 (rfc-tm-8-diamond.md §5): `Name = enum [A, B]` / `Name = TypeExpr`,
// grammar.js's typedef_declaration shape. The alias variant prints its
// aliasType through the canonical printer (X-TYPE-3, print-type-expr.ts) —
// TypeDefNode carries no preserved raw type-text field the way DtoFieldNode
// does (there is no per-field `type` string to fall back on here; the
// aliasType IS the entity's declared type), so this is a genuine synthetic-
// printer consumer, not a raw-carriage byte-preservation case.
const typeDefToShortform = (entity: TypeDefNode): string[] => {
  if (entity.variant === 'enum') {
    return [`${entity.name}${parameterHeader(entity)} = enum [${(entity.members ?? []).join(', ')}]`];
  }
  return [`${entity.name}${parameterHeader(entity)} = ${entity.aliasType === undefined ? '' : printTypeExpr(entity.aliasType)}`];
};

// RC-C (issue #102): shortform's grammar/attachment-rules.ts legality table
// gives Program no `-> [...]` exports continuation and gives a declared
// (`#:`) ClassFile no bare description line for `purpose` — both are real,
// checker-consumed AST fields (ProgramNode.exports feeds check-orphans.ts's
// "program exports are public API" union; ClassFileNode.purpose is a real
// authored/derived doc comment) with no legal shortform slot. `emitShortform`
// used to dispatch straight to `programToShortform`/`classFileToShortform`
// regardless, which is the defect it fixes: it silently produced a `.tmd`
// document `attachment-rules.ts`'s own legality table rejects on reparse.
// Longform already carries both fields legally (`emit-longform.ts`), so this
// is the capability check `syntax-emitter.ts` uses to promote just the ONE
// affected entity to longform instead of either (a) silently dropping the
// data or (b) emitting illegal syntax — no grammar or attachment-rules.ts
// change; the language's shortform contract was already correct, only the
// emitter's per-entity form selection was wrong.
//
// toggle-fidelity audit (2026-08-31, claude-home knowledge/projects/typedmind/
// toggle-fidelity-audit-2026-08-31.md) — the SAME RC-C gap exists for
// UIComponent.declaredAffectedBy: grammar.js/attachment-rules.ts have no
// shortform continuation production for `affectedBy` at all (grep-confirmed:
// zero `affectedBy`/`affected_by` occurrences anywhere in the shortform
// grammar or attachment-rules.ts), while longform's `affectedBy: [...]`
// property (longform-builder.ts's UIComponent case) reads it legally. Before
// this fix, `uiComponentToShortform` silently dropped `declaredAffectedBy`
// on every shortform emission — found by the toggle round-trip harness
// forcing a longform-sourced UIComponent with `affectedBy` through
// shortform. Same fix shape as Program.exports/ClassFile.purpose: promote
// just this one entity to longform when it carries the field.
export const shortformCannotExpress = (entity: EntityNode): boolean => {
  if (genericNeedsLongform(entity)) return true;
  if ((entity instanceof ClassNode || entity instanceof ClassFileNode) && entity.members !== undefined) return true;
  switch (entity.kind) {
    case 'Program': {
      const program = entity as ProgramNode;
      return program.exports !== undefined && program.exports.length > 0;
    }
    case 'ClassFile':
      return (entity as ClassFileNode).purpose !== undefined;
    case 'Dependency':
      // A quoted longform name can contain text outside dependency_name.
      return !/^[@\w\-/]+$/.test(entity.name);
    case 'UIComponent': {
      const uiComponent = entity as UiComponentNode;
      return uiComponent.declaredAffectedBy !== undefined && uiComponent.declaredAffectedBy.length > 0;
    }
    default:
      return false;
  }
};

export const emitShortform = (entity: EntityNode): string[] => {
  const body = ((): string[] => {
    switch (entity.kind) {
      case 'Program':
        return programToShortform(entity as ProgramNode);
      case 'File':
        return fileToShortform(entity as FileNode);
      case 'Function':
        return functionToShortform(entity as FunctionNode);
      case 'Class':
        return classToShortform(entity as ClassNode);
      case 'ClassFile':
        return classFileToShortform(entity as ClassFileNode);
      case 'Constants':
        return constantsToShortform(entity as ConstantsNode);
      case 'DTO':
        return dtoToShortform(entity as DtoNode);
      case 'Asset':
        return assetToShortform(entity as AssetNode);
      case 'UIComponent':
        return uiComponentToShortform(entity as UiComponentNode);
      case 'RunParameter':
        return runParameterToShortform(entity as RunParameterNode);
      case 'Dependency':
        return dependencyToShortform(entity as DependencyNode);
      case 'TypeDef':
        return typeDefToShortform(entity as TypeDefNode);
    }
  })();
  const commentToEmit = entity.comment === bodyAlreadyShows(entity) ? undefined : entity.comment;
  return withInlineComment(body, commentToEmit);
};

// The diagnostic API remains available; escaped output requires no mutation warning.
export const emitShortformWithDiagnostics = (entity: EntityNode): { lines: string[]; diagnostics: Diagnostic[] } => {
  return { lines: emitShortform(entity), diagnostics: genericEmissionDiagnostics(entity) };
};
