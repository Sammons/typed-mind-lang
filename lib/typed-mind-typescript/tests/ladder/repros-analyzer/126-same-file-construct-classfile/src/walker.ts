// RFC-TM-14 R1a-conv — the live CstToAstWalker shape (live-02:399): the file's
// only class is exported and fuses into the ClassFile `Walker`; the exported
// same-file function constructs it.
export class Walker {
  constructor(root: string) {}
  walk(): number {
    return 1;
  }
}

export const walk = (root: string): number => new Walker(root).walk();
