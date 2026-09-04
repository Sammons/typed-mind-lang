// Corpus: sammons/slat products/slat/src/handlers/http-server.ts
// (`export type ExactRoutes = Record<string, RouteHandler>`) and
// src/infrastructure/logger.ts (`export type LogContext = Record<string, unknown>`).
// The repo's HTTP dispatcher stance (dispatch_is_a_lookup_not_a_chain) makes
// `Record<string, Handler>` route tables a load-bearing shape.
//
// `RouteHandler` is reachable ONLY as the Record's value type.
export type RouteHandler = (path: string) => string;

/** A bare Record alias — no `{` anywhere in the type text. */
export type ExactRoutes = Record<string, RouteHandler>;

/** A Map alias takes the same path. */
export type HandlerIndex = Map<string, RouteHandler>;

/** A Record whose VALUE is an inline object literal still has fields to split. */
export type NestedRoutes = Record<string, { readonly handler: RouteHandler }>;

export const dispatch = (routes: ExactRoutes, path: string): string => {
  const handler = routes[path];
  return handler === undefined ? '' : handler(path);
};
