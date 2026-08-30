// RC-B repro — same basename (`events.ts`) as `../db/events.ts`, in a
// different directory. See that file's comment for the collision mechanism.
export function getEventRoute(): string {
  return 'routes-events';
}
