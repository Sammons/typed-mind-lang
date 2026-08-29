// RFC-TM-10 Q3 (D-LEG-6) visited-set-guard fixture. This module IS inside
// the fixture's own tsconfig include set (unlike webhookstorage-signature's
// deliberately-excluded target) so it is reachable BOTH via a normal static
// import AND via the SST handler-string convention pointing at the same
// file — the exact double-reference shape the guard exists to dedupe.
export const handler = async (): Promise<{ statusCode: number }> => {
  return { statusCode: 200 };
};
