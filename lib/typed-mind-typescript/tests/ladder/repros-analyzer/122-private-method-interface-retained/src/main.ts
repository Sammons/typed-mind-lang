import { run } from './run.ts';
import type { Batch, Job } from './shapes.ts';

export function main(job: Job, batch: Batch) {
  return run;
}
