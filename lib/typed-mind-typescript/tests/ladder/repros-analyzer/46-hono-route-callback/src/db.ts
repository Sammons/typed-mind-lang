// RC-F repro — the function the route module imports and calls from inside
// its inline arrow handler. Distilled from the real webhookstorage clone's
// `db/account.ts` exporting `getDpaStatus`.
export const getDpaStatus = (): string => 'accepted';
