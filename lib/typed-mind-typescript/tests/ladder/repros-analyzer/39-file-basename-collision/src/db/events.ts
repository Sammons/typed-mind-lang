// RC-B repro — same basename (`events.ts`) as `../routes/events.ts`, in a
// different directory. Before the fix, `convertToSeparateEntities`'s
// `fileEntityName` (`createEntityName('EventsFile')`) collided across
// both modules and only ONE of the two File entities was ever created,
// leaving the other module's function ownerless.
export function listEvents(): string {
  return 'db-events';
}
