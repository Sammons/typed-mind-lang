# 119 — Constants schema carries a full type expression

RFC-TM-14 (`rfc-tm-14-diamond.md` §S5), Quantum U5a, leaves R6a and
R6a-grammar (delta R6-ann). Fixture number 119 is the doc's proposed number
(free at `08336db`).

`src/rules.ts` declares `Rule` and five exported constants:

| Constant | Annotation | Expected schema slot |
|---|---|---|
| `RULES` | `Record<string, Rule>` | `RULES ! src/rules.ts : Record<string, Rule>` |
| `NAMES` | `ReadonlyMap<string, Rule>` | `ReadonlyMap<string, Rule>` (was `Map`) |
| `MODE` | `'read' \| 'write'` | `"read" \| "write"` (was dropped) |
| `LIST` | `Rule[]` | `Rule[]` (was `Array`) |
| `BROKEN` | `NonExistentSchema` | control: the existing unresolved-schema behaviour, zero `checker/generic-*` |

Checks (`tests/ladder/constants-schema.test.ts`):

- shortform prints the whole annotation; longform prints `schema: "Record<string, Rule>"` (quoted) and round-trips, including the literal union;
- `Rule` is not orphaned (schema references credit the orphan walk — a proved correction of the legacy port exclusion in `check-orphans.ts`);
- `LIST.ok` resolves `missing-member` (member resolution runs only through a bare named schema, U-7);
- `BROKEN` yields no `checker/generic-*` finding.

Before R6a (`convertTypeToSchema` reduced generics to their base and dropped unions) the shortform read `RULES ! src/rules.ts : Record`, `NAMES ... : Map`, `LIST ... : Array`, and `MODE` had no slot; `Rule` was orphaned.
