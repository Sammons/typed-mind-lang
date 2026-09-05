// Sorts FIRST by project-relative path (`src/engine.ts` < `src/index.ts`),
// so under the canonical collision rule THIS `runWorker` keeps the bare
// name and the entrypoint's declaration is renamed to `IndexFile.runWorker`.
// `engineConcurrency` calls it so the bare-name entity has a real consumer
// once the Program stops (wrongly) claiming it as an export.
export interface EngineConfig {
  readonly concurrency: number;
}

export function runWorker(config: EngineConfig): number {
  return config.concurrency;
}

export const engineConcurrency = (): number => {
  return runWorker({ concurrency: 1 });
};
