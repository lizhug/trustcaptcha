import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: ["src/index.tsx"],
  external: ["react", "react/jsx-runtime"],
  format: ["esm"],
  outDir: "dist",
  platform: "browser",
  sourcemap: true,
  target: "es2020",
});
