// RFC-TM-5 §1 (rfc-tm-5-diamond.md) — async bootstrap with a race guard (leaf
// b). startServer() is now async: it awaits TypedMind.create() (one wasm load
// per process) BEFORE constructing the server and calling connection.listen().
// The connection reads stdin only after listen(), so no request can observe
// an uninitialized parser. Startup failure exits 1 through these same error
// handlers with the cause on stderr — unchanged from legacy except that the
// try/catch now wraps an async construction path.

import { TypedMindLanguageServer } from './server.ts';

export async function startServer(): Promise<void> {
  // Add minimal error handlers to prevent silent crashes
  process.on('uncaughtException', (error: Error) => {
    console.error('TypedMind LSP uncaught exception:', error.message);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    console.error('TypedMind LSP unhandled rejection:', reason);
    process.exit(1);
  });

  try {
    const server = await TypedMindLanguageServer.create();
    server.start();
  } catch (error) {
    console.error('Failed to start TypedMind Language Server:', error);
    process.exit(1);
  }
}
