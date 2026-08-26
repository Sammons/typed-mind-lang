// RFC-TM-5 §1 (rfc-tm-5-diamond.md) check binding — "hover fixtures per
// affected kind (Function, UIComponent, RunParameter, Dependency, DTO,
// ClassFile) assert link data renders, the ClassFile fixture asserts the A12
// self-name entry, and a fixture documents the fromType grouping."

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TypedMind } from '@sammons/typed-mind';
import { buildEntityByNameIndex } from './document-state.ts';
import { renderHoverContents } from './hover.ts';

const HOVER_FIXTURE = `AppEntry @ src/index.ts:
  <- [PaymentDto, PaymentProcessor]
  -> [PaymentProcessor]

PaymentProcessor :: process(input: PaymentDto) -> Result
  <- PaymentDto
  ~ [MainScreen]
  $< [StripeKey]

PaymentDto %
  - amount: number
  - currency?: string
  - note: string (optional)

MainScreen &! "Root screen"
  > [DetailScreen]

DetailScreen & "Detail screen"
  < [MainScreen]

StripeKey $env "Stripe secret key"

StripeSdk ^ "Stripe SDK dependency"

UserController #: src/controllers/user.ts
  -> [handleRequest]
  => [get, post]
`;

const buildHoverContext = async () => {
  const typedMind = await TypedMind.create();
  const parsed = typedMind.parseWithCst(HOVER_FIXTURE);
  const byName = buildEntityByNameIndex(parsed);
  return { parsed, byName };
};

const hoverFor = (
  byName: ReturnType<typeof buildEntityByNameIndex>,
  links: Awaited<ReturnType<typeof buildHoverContext>>['parsed']['links'],
  name: string,
): string => {
  const entity = byName.get(name);
  if (entity === undefined) {
    throw new Error(`fixture defect: ${name} not found`);
  }
  return renderHoverContents(entity, links);
};

describe('hover (RFC-TM-5 §1, S-CONS-LSP-2)', () => {
  it('Function: renders signature, calls/affects/consumes, and referencedBy grouped by fromType', async () => {
    const { parsed, byName } = await buildHoverContext();
    const contents = hoverFor(byName, parsed.links, 'PaymentProcessor');
    assert.match(contents, /\*\*Function\*\*: PaymentProcessor/);
    assert.match(contents, /\*\*Signature\*\*: `process\(input: PaymentDto\) -> Result`/);
    assert.match(contents, /\*\*Input\*\*: PaymentDto/);
    assert.match(contents, /\*\*Affects\*\*: MainScreen/);
    assert.match(contents, /\*\*Consumes\*\*: StripeKey/);
    // fromType grouping documented: AppEntry (a File) referencing
    // PaymentProcessor groups under the referencer's kind, "File", not a
    // legacy relationship verb.
    assert.match(contents, /\*\*Referenced By\*\*: File: AppEntry/);
  });

  it('UIComponent: renders contains, declared purpose/root, and containedBy/affectedBy from LinkIndex', async () => {
    const { parsed, byName } = await buildHoverContext();
    const contents = hoverFor(byName, parsed.links, 'MainScreen');
    assert.match(contents, /\*\*UIComponent\*\*: MainScreen/);
    assert.match(contents, /\*\*Root Component\*\*: ✓/);
    assert.match(contents, /\*\*Contains\*\*: DetailScreen/);

    const detailContents = hoverFor(byName, parsed.links, 'DetailScreen');
    assert.match(detailContents, /\*\*Contained By\*\*: MainScreen/);

    // PaymentProcessor's `~ [MainScreen]` continuation declares MainScreen
    // (not DetailScreen) as affected.
    const mainScreenContents = hoverFor(byName, parsed.links, 'MainScreen');
    assert.match(mainScreenContents, /\*\*Affected By\*\*: PaymentProcessor/);
  });

  it('RunParameter: renders paramType/description and consumedBy from LinkIndex', async () => {
    const { parsed, byName } = await buildHoverContext();
    const contents = hoverFor(byName, parsed.links, 'StripeKey');
    assert.match(contents, /\*\*RunParameter\*\*: StripeKey/);
    assert.match(contents, /\*\*Parameter Type\*\*: env/);
    assert.match(contents, /\*\*Consumed By\*\*: PaymentProcessor/);
  });

  it('Dependency: renders purpose and importedBy from LinkIndex', async () => {
    const source = `StripeSdk ^ "Stripe SDK dependency"

AppEntry @ src/index.ts:
  <- [StripeSdk]
`;
    const typedMind = await TypedMind.create();
    const parsed = typedMind.parseWithCst(source);
    const byName = buildEntityByNameIndex(parsed);
    const contents = hoverFor(byName, parsed.links, 'StripeSdk');
    assert.match(contents, /\*\*Dependency\*\*: StripeSdk/);
    assert.match(contents, /\*\*Purpose\*\*: Stripe SDK dependency/);
    assert.match(contents, /\*\*Imported By\*\*: AppEntry/);
  });

  it('DTO: renders fields with the optionalityMarker-derived isOptional flag', async () => {
    const { parsed, byName } = await buildHoverContext();
    const contents = hoverFor(byName, parsed.links, 'PaymentDto');
    assert.match(contents, /\*\*DTO\*\*: PaymentDto/);
    assert.match(contents, /`amount: number`/);
    assert.match(contents, /`currency: string` \*\(optional\)\*/);
    assert.match(contents, /`note: string` \*\(optional\)\*/);
  });

  it('ClassFile: A12 self-export entry renders in Exports alongside declared exports (rfc-tm-4-diamond.md A12)', async () => {
    const { parsed, byName } = await buildHoverContext();
    const contents = hoverFor(byName, parsed.links, 'UserController');
    assert.match(contents, /\*\*ClassFile\*\*: UserController/);
    assert.match(contents, /\*\*Path\*\*: src\/controllers\/user\.ts/);
    assert.match(contents, /\*\*Methods\*\*: get, post/);
    // A12: the declared export list (`-> [handleRequest]`) plus the
    // construction-time auto-self-export both render — no special case, just
    // `.exports` shown directly.
    assert.match(contents, /\*\*Exports\*\*: handleRequest, UserController/);
  });
});
