// RFC-TM-14 U5b (rfc-tm-14-diamond.md §S5, leaf R6b): constants whose
// initializer is a call/new expression with explicit type arguments and
// no annotation — the checker-read path resolves the type structurally.

export interface Signal<T> { readonly value: T }
export function signal<T>(v: T): Signal<T> { return { value: v } }
export interface Toast { id: string }
export const toasts = signal<Toast[]>([])

// Control: opaque object type argument — credits Legacy via R4a opaque walk
export interface Legacy { tier: string }
function wrap<T>(v: T): T { return v }
export const wrapped = wrap<{ a: Legacy }>({ a: { tier: 'free' } })

// Control: conditional type — no schema + warning inferred-constant-type-unsupported
type Cond<T> = T extends 1 ? 2 : 3
function condFn<T>(): Cond<T> { return 2 as Cond<T> }
export const cond = condFn<1>()

// Control: defaulted second parameter — renders Box<Toast> only (no default)
export class Box<T, _U = string> { constructor(public item: T) {} }
export const boxed = new Box<Toast>({ id: '1' })
