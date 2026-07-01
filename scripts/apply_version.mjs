import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error("Usage: node scripts/apply_version.mjs <semver>");
  process.exit(1);
}

async function readJson(path) {
  const content = await readFile(path, "utf8");
  return JSON.parse(content);
}

async function writeJson(path, data) {
  await writeFile(path, `${JSON.stringify(data, null, 4)}\n`, "utf8");
}

const packageJsonPath = resolve("package.json");
const packageLockPath = resolve("package-lock.json");

const packageJson = await readJson(packageJsonPath);
packageJson.version = version;
await writeJson(packageJsonPath, packageJson);

try {
  const packageLock = await readJson(packageLockPath);
  packageLock.version = version;

  if (packageLock.packages?.[""]) {
    packageLock.packages[""].version = version;
  }

  await writeJson(packageLockPath, packageLock);
} catch (error) {
  if (error.code !== "ENOENT") {
    throw error;
  }
}

console.log(`Applied version ${version}`);
