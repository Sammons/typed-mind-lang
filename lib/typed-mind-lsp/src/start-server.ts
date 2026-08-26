import { TypedMindLanguageServer } from './server.ts';

export function startServer(): void {
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
    const server = new TypedMindLanguageServer();
    server.start();
  } catch (error) {
    console.error('Failed to start TypedMind Language Server:', error);
    process.exit(1);
  }
}
