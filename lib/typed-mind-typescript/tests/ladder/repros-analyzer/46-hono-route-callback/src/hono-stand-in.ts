// RC-F repro support — a minimal stand-in for Hono's `OpenAPIHono`, just
// enough surface (`.openapi(route, handler)`) to reproduce the real shape
// without pulling in the actual npm package.
export class OpenApiApp {
  openapi(route: unknown, handler: (c: unknown) => Promise<unknown>): this {
    void route;
    void handler;
    return this;
  }
}
