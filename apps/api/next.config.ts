import type { NextConfig } from "next";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: resolve(import.meta.dirname, "../.."),
  output:
    process.env.TRUSTCAPTCHA_STANDALONE === "true" ? "standalone" : undefined,
  serverExternalPackages: ["pg"],
  transpilePackages: [
    "@trustcaptcha/captcha-core",
    "@trustcaptcha/database",
    "@trustcaptcha/risk-engine",
    "@trustcaptcha/shared",
    "@trustcaptcha/token",
  ],
};

export default nextConfig;
