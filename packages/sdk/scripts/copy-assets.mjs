import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceFiles = ["trustcaptcha.js", "trustcaptcha.js.map"];
const targets = [
  resolve(packageRoot, "../../apps/api/public"),
  resolve(packageRoot, "../../apps/demo/public"),
];

for (const target of targets) {
  await mkdir(target, { recursive: true });
  for (const sourceFile of sourceFiles) {
    await copyFile(
      resolve(packageRoot, "dist", sourceFile),
      resolve(target, sourceFile),
    );
  }
  const versionedTarget = resolve(target, "v1");
  await mkdir(versionedTarget, { recursive: true });
  await copyFile(
    resolve(packageRoot, "dist", "trustcaptcha.js"),
    resolve(versionedTarget, "api.js"),
  );
  await copyFile(
    resolve(packageRoot, "dist", "trustcaptcha.js.map"),
    resolve(versionedTarget, "trustcaptcha.js.map"),
  );
}
