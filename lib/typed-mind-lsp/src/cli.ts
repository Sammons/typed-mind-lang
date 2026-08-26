#!/usr/bin/env node

import { startServer } from './start-server.ts';

// Start the TypedMind Language Server. startServer() awaits
// TypedMind.create() before the connection starts listening (RFC-TM-5 §1 leaf
// b) — void here is intentional: startup failure exits the process itself
// (start-server.ts's own catch arm), so there is no caller-side rejection to
// handle.
void startServer();
