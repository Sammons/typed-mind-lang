// D-LEG-4 (rfc-tm-10-diamond.md §4, issue #60) — a real multi-paragraph
// JSDoc comment, the shape webhookstorage's functions-api/web-main/ops-cli
// actually carry. The converter must collapse to the first paragraph,
// whitespace-normalized, never emitting the raw multi-line text verbatim.
/**
 * Shared header for all public (unauthenticated) pages.
 *
 * Renders a consistent nav bar with logo, page links, and sign-in button.
 * The `current` prop highlights the active page link.
 */
export function publicHeader(current: string): string {
  return current;
}
