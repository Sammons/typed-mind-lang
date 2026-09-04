// The unbuilt half of gap 81. Same shape as fixture 81's consumer, but the
// sibling has never been built, so `@fixture-unbuilt/core` resolves to nothing
// at all rather than to a `dist/index.d.ts`. Before the fix this produced an
// `unresolvable-import` diagnostic and the sibling's types degraded to
// `checker/dto-field-unknown-type` — a SECOND, independent trigger for the same
// underlying defect (extraction quality varying with build state).
import type { ReportFormat, ReportRow } from '@fixture-unbuilt/core';

export interface ReportOptions {
  format: ReportFormat;
  limit: number;
}

export interface RenderedReport {
  title: string;
  row: ReportRow | null;
}

export const describeReport = (options: ReportOptions, rendered: RenderedReport): string => {
  return `${options.format}:${options.limit}:${rendered.title}`;
};
