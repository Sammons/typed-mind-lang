import { getClientIp } from "./lib/client-ip.js";
import { formatIp } from "./lib/client-ip.js";

export function handleRequest(rawIp: string): string {
  return getClientIp() + formatIp(rawIp);
}
