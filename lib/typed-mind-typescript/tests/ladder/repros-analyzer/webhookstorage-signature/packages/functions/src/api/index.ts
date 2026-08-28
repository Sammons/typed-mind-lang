// Q2 addition — the SST handler target that `infra/api.ts`'s `handler:
// "packages/functions/src/api/index.handler"` string references. Not part
// of the root tsconfig's program (root excludes `packages/`), matching the
// real webhookstorage clone: the recognizer resolves this by filesystem
// probe, not by TS module resolution.
export const handler = async (): Promise<{ statusCode: number }> => {
  return { statusCode: 200 };
};
