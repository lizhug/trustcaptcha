import type { NextConfig } from "next";
import { resolve } from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: resolve(import.meta.dirname, "../.."),
  output:
    process.env.TRUSTCAPTCHA_STANDALONE === "true" ? "standalone" : undefined,
  serverExternalPackages: ["pg"],
  transpilePackages: ["@trustcaptcha/database", "@trustcaptcha/shared"],
};

export default nextConfig;
