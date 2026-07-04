import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const version = process.argv[2];
const releaseMetadataPath = ".release-signals.json";
const releaseStateGitPath = "command-ghostwriter-release-state.json";

if (
  !version ||
  !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)
) {
  console.error("Usage: node scripts/apply_version.mjs <semver>");
  process.exit(1);
}

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

async function readJson(path) {
  const content = await readFile(path, "utf8");
  return JSON.parse(content);
}

async function writeJson(path, data) {
  await writeFile(path, `${JSON.stringify(data, null, 4)}\n`, "utf8");
}

async function readJsonIfExists(path, fallback) {
  try {
    return await readJson(path);
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

async function restoreReleaseBaseAndReadState() {
  let statePath;

  try {
    statePath = git(["rev-parse", "--git-path", releaseStateGitPath]);
  } catch {
    return null;
  }

  if (!existsSync(statePath)) {
    return null;
  }

  const state = await readJson(statePath);
  if (!/^[0-9a-f]{40}$/.test(state.baseHead ?? "")) {
    throw new Error(`Invalid release base head in ${statePath}`);
  }

  git(["rev-parse", "--verify", `${state.baseHead}^{commit}`]);

  if (git(["rev-parse", "HEAD"]) !== state.baseHead) {
    git(["reset", "--soft", state.baseHead]);
  }

  return { ...state, statePath };
}

async function recordReleaseSources(state) {
  const sources = state?.sources ?? [];
  if (sources.length === 0) {
    return;
  }

  const metadata = await readJsonIfExists(releaseMetadataPath, {
    releasedSources: [],
  });
  const seen = new Set(
    metadata.releasedSources.map((source) => source.sourceSha),
  );

  for (const source of sources) {
    if (
      /^[0-9a-f]{40}$/.test(source.sourceSha ?? "") &&
      !seen.has(source.sourceSha)
    ) {
      metadata.releasedSources.push({
        sourceSha: source.sourceSha,
        version,
        subject: source.subject,
      });
      seen.add(source.sourceSha);
    }
  }

  await writeJson(releaseMetadataPath, metadata);
}

const packageJsonPath = resolve("package.json");
const packageLockPath = resolve("package-lock.json");

const releaseState = await restoreReleaseBaseAndReadState();
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

await recordReleaseSources(releaseState);

if (releaseState?.statePath) {
  await unlink(releaseState.statePath);
}

console.log(`Applied version ${version}`);
