// issue #72 (rfc-tm-10-diamond.md §5's tracked follow-up) — an inline
// object-literal function parameter/return type previously left
// `input`/`output` `undefined` (D-LEG-1's `isDTOLikeType` `{`-prefix
// exclusion, a disclosed loss). This fixture exercises the richer fix:
// `synthesizeInlineDTO` gives the type a real bare `entity_name` and real
// `DtoFieldNode`s instead of dropping the graph edge.

// Parameter position: a single-property inline object-literal parameter
// synthesizes `<FunctionName>Input`.
export function updateProfile(request: { name: string; email: string }): void {
  console.log(request.name, request.email);
}

// Return position: an inline object-literal return type synthesizes
// `<FunctionName>Output`.
export function lookupProfile(id: string): { name: string; email: string } {
  return { name: id, email: `${id}@example.com` };
}

// Optional fields: a `?`-marked property carries `optionalityMarker:
// 'question'` on the synthesized DTO field, mirroring an ordinary
// hand-authored interface's optional property.
export function updateSettings(settings: { theme?: string; locale?: string }): void {
  console.log(settings.theme, settings.locale);
}

// Both positions on the SAME function: distinct `Input`/`Output` DTOs, not
// one name serving both.
export function transformRecord(input: { id: string; value: number }): { id: string; doubled: number } {
  return { id: input.id, doubled: input.value * 2 };
}

// Nesting: a field whose own type is an inline object literal recurses into
// its own synthesized DTO (named `<ParentDtoName>_<fieldName>`) rather than
// an opaque leaf — see `synthesizeInlineDTO`'s doc comment for why nesting
// gets a real DTO instead of TM-8's `opaque` TypeExprNode kind.
export function createOrder(order: { id: string; shipping: { street: string; city: string } }): void {
  console.log(order.id, order.shipping.street, order.shipping.city);
}

// Collision: two functions, each with an identically-shaped inline
// object-literal parameter type. Each function's own collision-resolved
// entity name seeds its DTO's name (`<FunctionName>Input`), so
// `RegisterUserInput` and `InviteUserInput` are naturally distinct — this
// exercises that the SHAPE being identical does not cause a naming
// collision (no reason it would, given the naming scheme), while the
// paired assertion below (two functions colliding on their OWN entity name
// before this mission's X-CONV-4 collision handling) exercises the
// disambiguator suffix path.
export function registerUser(user: { name: string; email: string }): void {
  console.log(user.name, user.email);
}

export function inviteUser(user: { name: string; email: string }): void {
  console.log(user.name, user.email);
}

// Control case: a named-interface parameter is unaffected by this fixture
// — it must keep routing through the existing D-LEG-1 true-positive path,
// not through inline-DTO synthesis.
export interface Widget {
  name: string;
}

export function useWidget(widget: Widget): string {
  return widget.name;
}

// Collision: `craftInvoice`'s synthesized input DTO name would be
// `CraftInvoiceInput` (`${functionEntityName}Input`, PascalCased). A
// SIBLING FUNCTION literally named `CraftInvoiceInput` (unconventional
// casing, but a syntactically legal TS identifier) is declared immediately
// after, on purpose: `reserveFunctionEntityNames` reserves every exported
// function's bare name in `entityNames` in one pre-pass BEFORE any
// function converts, so `CraftInvoiceInput` (the function) already owns
// that exact name by the time `craftInvoice`'s parameter synthesis runs.
// `craftInvoice`'s synthesis must fall back to
// `reserveSynthesizedDTOName`'s `__2` disambiguator
// (`CraftInvoiceInput__2`) rather than silently colliding with the
// function's own entity name or erroring.
export function craftInvoice(payload: { orderId: string; note: string }): void {
  console.log(payload.orderId, payload.note);
}

export function CraftInvoiceInput(id: string): void {
  console.log(id);
}

// Collision (adversarial-review blocker #1, PR #84): `archiveOrder`'s
// synthesized input DTO name would be `ArchiveOrderInput`. A HAND-AUTHORED
// interface of that EXACT name is declared in the SAME module, AFTER
// `archiveOrder` in source order — `convertToSeparateEntities` always
// converts functions before interfaces (its own fixed loop order,
// unrelated to source declaration order), so without
// `reserveNamedTypeEntityNames`'s pre-pass, `archiveOrder`'s synthesis
// would see an empty slot, claim `ArchiveOrderInput`, and the
// hand-authored interface would then hit the pre-existing "Duplicate
// entity name" hard error and be SILENTLY DROPPED from the entity list —
// exactly backwards: an author-provided name must win over a
// converter-invented one. The hand-authored interface must keep the clean
// bare name; `archiveOrder`'s synthesized DTO must disambiguate to
// `ArchiveOrderInput__2`.
export function archiveOrder(request: { orderId: string; note: string }): void {
  console.log(request.orderId, request.note);
}

export interface ArchiveOrderInput {
  reason: string;
}

// Arrow-typed field (adversarial-review blocker #2, PR #84):
// `splitObjectLiteralProperties` must not corrupt its running depth count
// on an arrow function type's `=>` — an EARLIER version of this splitter
// treated bare `<`/`>` as a matched bracket pair, and `=>`'s unmatched `>`
// drove that shared depth counter permanently negative, silently merging
// every subsequent field into the arrow-typed field's own type text
// (`label` would vanish into `onDone`'s type here). Both fields below
// must appear as independent DtoFieldNodes.
export function subscribe(options: { onDone: (result: string) => void; label: string }): void {
  options.onDone(options.label);
}
