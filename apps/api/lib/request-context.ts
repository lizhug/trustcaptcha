import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export function getClientIp(request: Request): string {
  if (process.env.TRUST_PROXY !== "true") return "unknown";

  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const candidate = forwarded || realIp;
  return candidate && isIP(candidate) ? candidate : "unknown";
}

export function getUserAgent(request: Request): string | null {
  const value = request.headers.get("user-agent")?.trim();
  return value ? value.slice(0, 512) : null;
}

export function hmacBinding(
  value: string,
  pepperName = "REQUEST_BINDING_PEPPER",
) {
  const pepper = process.env[pepperName];
  if (!pepper) throw new Error(`${pepperName} is required`);
  return createHmac("sha256", pepper).update(value).digest("hex");
}
