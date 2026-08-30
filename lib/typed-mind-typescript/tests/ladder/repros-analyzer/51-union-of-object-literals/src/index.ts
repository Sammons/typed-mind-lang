// issue #114 repro — distilled from the real slat-harness clone's
// `packages/hub/src/repositories/alert-preference-repository.ts` (`Tag`)
// and `notification-preference-service.ts` (`QuietHours` shape): a
// discriminated-union type alias made of two inline object literals. The
// pre-fix converter naively slices the outermost `{`/`}` off the WHOLE
// multi-member text, corrupting the field list.

export type Tag = { tagged: false } | { tagged: true; label: string };

export const app = (t: Tag): boolean => t.tagged;
