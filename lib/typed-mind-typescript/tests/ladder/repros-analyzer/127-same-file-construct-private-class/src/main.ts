// RFC-TM-14 R1b — a module-private class constructed inside an exported
// same-file function. `main.ts` is the entry, so the class is NOT fused into a
// ClassFile (entry points always convert to separate entities). No return
// annotation: the construct edge, not the signature, is what credits `Registry`.
class Registry {}

export const make = () => new Registry();
