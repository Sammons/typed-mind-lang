// RFC-TM-14 D-16 pin — the live ParameterSource shape (live-02:455,
// core/pipeline/parse-type-parameters.ts:81-83): a non-exported class, fused as
// the file's ClassFile, constructed only inside a NON-exported function that an
// exported function calls. Private functions have no entity (P8), so the
// construct edge has no carrier and `Source` stays orphaned until D-16 lands.
// No return annotations: a signature reference would credit `Source` and hide
// the pinned mechanism.
class Source {}

const parse = () => new Source();

export const parseText = () => parse();
