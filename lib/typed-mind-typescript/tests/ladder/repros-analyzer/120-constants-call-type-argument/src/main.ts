import { toasts, wrapped, cond, boxed } from './signals.ts'

export const main = () => toasts.value.length + JSON.stringify(wrapped).length + cond + boxed.item.id.length
