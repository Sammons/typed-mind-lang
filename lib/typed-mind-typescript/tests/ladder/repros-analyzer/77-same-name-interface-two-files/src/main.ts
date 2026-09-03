// Distilled from itp-maker `functions/save-job.ts:58` +
// `functions/lib/job-store.ts:58`, which each independently declare
// their own `export interface JobRecord` (different fields — the
// customer-facing shape vs. the stored shape). `save-job.ts` imports the
// store's version ALIASED (`JobRecord as JobStoreRecord`) and never
// re-exports it, so no re-export relationship exists between the two.
//
// `convertInterfaceToDTO` derives the entity name via
// `createEntityName(iface.name)`, which is the identity function
// (types.ts:338 — no module or file qualification), then rejects on a
// single GLOBAL `this.entityNames` set spanning the whole conversion
// run. The second file's declaration therefore raises
// `Duplicate entity name: JobRecord`, the conversion reports failure,
// and the CLI writes only partial output. This is NOT the deferred
// barrel/multi-exported re-export shape: `isReExport` gates on
// `exportItem.source !== undefined` and never fires here, because
// neither declaration has a `from` clause at all.
import { type JobRecord as JobStoreRecord, readJob } from './job-store.ts';

export interface JobRecord {
  id: string;
  title: string;
}

export const saveJob = (record: JobRecord): JobStoreRecord => {
  return readJob(record.id);
};
