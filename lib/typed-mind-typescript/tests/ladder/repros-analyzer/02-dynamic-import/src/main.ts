export async function run(): Promise<string> {
  const mod = await import('./worker.js');
  return mod.doWork();
}
