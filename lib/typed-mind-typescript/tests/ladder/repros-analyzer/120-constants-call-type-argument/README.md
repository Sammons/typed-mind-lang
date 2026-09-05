# 120 — Constants call-type-argument checker-read schema

RFC-TM-14 (`rfc-tm-14-diamond.md` §S5), Quantum U5b, leaf R6b.

`src/signals.ts` declares `Signal<T>`, `signal<T>`, `Toast`, and four
exported constants with call/new initializers carrying explicit type arguments
and no annotation:

| Constant | Initializer | Expected schema slot |
|---|---|---|
| `toasts` | `signal<Toast[]>([])` | `Signal<Toast[]>` — Toast not orphaned |
| `boxed` | `new Box<Toast>({ id: '1' })` | `Box<Toast>` — defaulted `_U = string` omitted |
| `wrapped` | `wrap<{ a: Legacy }>({...})` | none — opaque object argument; Legacy credited by R4a |
| `cond` | `condFn<1>()` | none — conditional type; warning `inferred-constant-type-unsupported` |

Checks (`tests/ladder/constants-schema.test.ts`):

- `toasts` schema `Signal<Toast[]>`, `Toast` not orphaned (A-1);
- `boxed` schema `Box<Toast>`, defaulted second param omitted;
- `wrapped` no schema (opaque object type), Legacy not orphaned;
- `cond` no schema, converter warning present;
- longform round-trips `schema: "Signal<Toast[]>"`.
