import type { UpdateCommand } from 'update-client';

// Not exported. Method-bearing, so the converter emits it as a Class. It is
// retained because `run`'s signature names it.
interface ClientLike {
  send(command: UpdateCommand): Promise<unknown>;
}

export async function run(c: ClientLike) {}
