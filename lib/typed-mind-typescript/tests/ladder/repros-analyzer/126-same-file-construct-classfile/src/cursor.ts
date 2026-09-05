// RFC-TM-14 R1a-conv — the live TextCursor/SignatureSource shape (live-02:440,
// 467): the file's only class is NOT exported and still fuses into the
// ClassFile `Cursor`; the exported same-file function constructs it. No return
// annotation: the construct edge, not the signature, is what credits `Cursor`.
class Cursor {}

export const scan = () => new Cursor();
