// RFC-TM-11 Amendment 1, RX-6 — the REAL corpus shape issue #109 (RC-G)
// was filed against: a re-export barrel whose target is an external or
// workspace-package specifier, not a same-package sibling file.
// `@scope/core/client-ip` never resolves to a locally-constructed entity
// (isExternalPackage returns true for any bare specifier), so
// resolveImportToEntity returns undefined for `getClientIp` from every
// caller — the exact mechanism the Diamond Doc's Amendment 1 traces.
export { getClientIp } from "@scope/core/client-ip";

// A genuine LOCAL declaration alongside the re-export, used by the bound
// (a) negative fixture: a real importer of `formatIp` (declared here,
// not re-exported) must NOT trigger RX-6's fold, since `formatIp` is not
// in this File's `reExports`.
export function formatIp(ip: string): string {
  return ip.trim();
}
