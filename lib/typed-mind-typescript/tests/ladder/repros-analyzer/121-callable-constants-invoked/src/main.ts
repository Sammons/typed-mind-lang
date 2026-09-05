import { createMiddleware, maybeCallable, type Env } from './middleware.ts';
import { audit } from './audit.ts';

export const auth = createMiddleware<{ Variables: { userId: string } }>(async (_c, next) => {
  await next();
});

export const both = createMiddleware<{ Variables: { userId: string } }>(async (c, next) => {
  await auth(c, next);
  await audit();
});

export const N = 1;

export const maybe = maybeCallable(true);
