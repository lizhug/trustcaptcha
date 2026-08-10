import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: { trustcaptcha: "src/index.ts" },
  format: ["iife"],
  globalName: "TrustCaptcha",
  minify: true,
  outDir: "dist",
  outExtension: () => ({ js: ".js" }),
  platform: "browser",
  sourcemap: true,
  target: "es2020",
});
