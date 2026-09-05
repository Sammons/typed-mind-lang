// Q3 (typedmind residual burndown, 2026-09-05) — the live
// webhookstorage/packages/outbound-delivery/src/index.ts:211-228 shape:
// an `import.meta.url` self-invocation guard whose guarded call chains a
// `.catch` callback that calls the JavaScript builtin `String(error)`.
// The analyzer's X-AN-11 root marking recorded EVERY bare-identifier call
// under the guard (including calls nested inside the callback and calls
// to ambient globals), and the converter folded that list into
// Program.exports verbatim — so `String` surfaced as a Program export and
// the checker reported `Export 'String' is not defined anywhere in the
// codebase`. Only functions this module declares may be self-invoked
// roots; `String`, `console`, `Number`, `setTimeout` never are.
export interface WorkerEnv {
  readonly pollIntervalMs: number;
}

export function readEnv(): WorkerEnv {
  return { pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? '1000') };
}

export async function runWorker(env: WorkerEnv): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, env.pollIntervalMs));
}

// Control: a non-exported same-module function invoked only from inside
// the guarded `.catch` callback. The analyzer records it as a self-invoked
// root (it IS one of this module's functions), but the converter never
// emits a non-exported function as an entity, so it must NOT reach
// Program.exports either — naming it there is the same
// `checker/undefined-export` shape as `String`. `String` and `setTimeout`
// beside it are ambient globals and never appear anywhere.
function reportCrash(error: unknown): void {
  process.exitCode = 1;
  void error;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const env = readEnv();
  runWorker(env).catch((error) => {
    console.error(String(error));
    reportCrash(error);
    setTimeout(() => process.exit(1), 0);
  });
}
