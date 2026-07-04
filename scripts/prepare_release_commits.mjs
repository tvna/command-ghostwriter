import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const developRef = process.argv[2] ?? "origin/develop";
const releaseMetadataPath = ".release-signals.json";
const releaseStateGitPath = "command-ghostwriter-release-state.json";
const conventionalSubjectPattern = /^[a-z][a-z0-9-]*(?:\([^)]+\))?!?: .+$/;
const releaseSubjectPattern =
  /^(?:(?:feat|fix)(?:\([^)]+\))?!?: .+|[a-z][a-z0-9-]*(?:\([^)]+\))?!: .+)$/;
const breakingFooterPattern = /^BREAKING CHANGE(?:\([^)]+\))?: .+/m;
const releaseSignalSourcePattern = /^Release-Signal-Source: ([0-9a-f]{40})$/gm;

function git(args, options = {}) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", options.stderr ?? "pipe"],
  }).trim();
}

function gitQuiet(args) {
  try {
    git(args);
    return true;
  } catch {
    return false;
  }
}

function gitOptional(args) {
  try {
    return git(args);
  } catch {
    return null;
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function ensureRef(ref) {
  if (!gitQuiet(["rev-parse", "--verify", `${ref}^{commit}`])) {
    fail(`develop ref not found: ${ref}`);
  }
}

function latestReleaseTag() {
  try {
    return git([
      "describe",
      "--tags",
      "--match",
      "v[0-9]*.[0-9]*.[0-9]*",
      "--abbrev=0",
    ]);
  } catch {
    fail(
      "No v-prefixed semver tag found. Seed the release baseline before preparing release commits.",
    );
  }
}

function releaseEntryFromCommit(commit) {
  const { sha, message } = commit;
  const lines = message.split(/\r?\n/);
  const firstSubject = lines[0]?.trim() ?? "";
  const subjectIndex = releaseSubjectPattern.test(firstSubject)
    ? 0
    : lines.findIndex((line) => conventionalSubjectPattern.test(line.trim()));

  if (subjectIndex === -1) {
    return null;
  }

  const subject = lines[subjectIndex].trim();
  const body = lines
    .slice(subjectIndex + 1)
    .join("\n")
    .trim();

  if (releaseSubjectPattern.test(subject) || breakingFooterPattern.test(body)) {
    return { sourceSha: sha, subject, body };
  }

  return null;
}

function firstParentCommitsSince(tag, ref) {
  const output = git([
    "log",
    "--first-parent",
    "--format=%x1e%H%x1f%B",
    `${tag}..${ref}`,
  ]);
  if (!output) {
    return [];
  }
  return output
    .split("\x1e")
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [sha, message] = record.split("\x1f", 2);
      return { sha, message };
    });
}

function releasedSourceShas(tag) {
  const output = git(["log", "--format=%B", tag]);
  const sources = new Set(
    [...output.matchAll(releaseSignalSourcePattern)].map((match) => match[1]),
  );
  const metadata = gitOptional(["show", `${tag}:${releaseMetadataPath}`]);

  if (metadata) {
    try {
      const parsed = JSON.parse(metadata);
      for (const entry of parsed.releasedSources ?? []) {
        if (/^[0-9a-f]{40}$/.test(entry.sourceSha ?? "")) {
          sources.add(entry.sourceSha);
        }
      }
    } catch {
      // Ignore malformed historical metadata and fall back to commit trailers.
    }
  }

  return sources;
}

function writeReleaseState(baseHead, tag, releaseEntries) {
  const statePath = git(["rev-parse", "--git-path", releaseStateGitPath]);
  writeFileSync(
    statePath,
    `${JSON.stringify(
      {
        baseHead,
        latestTag: tag,
        sources: releaseEntries.map((entry) => ({
          sourceSha: entry.sourceSha,
          subject: entry.subject,
        })),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function syntheticCommitEnvironment() {
  return {
    ...process.env,
    GIT_AUTHOR_NAME:
      process.env.GIT_AUTHOR_NAME ?? "command-ghostwriter release",
    GIT_AUTHOR_EMAIL:
      process.env.GIT_AUTHOR_EMAIL ?? "release@users.noreply.github.com",
    GIT_COMMITTER_NAME:
      process.env.GIT_COMMITTER_NAME ?? "command-ghostwriter release",
    GIT_COMMITTER_EMAIL:
      process.env.GIT_COMMITTER_EMAIL ?? "release@users.noreply.github.com",
  };
}

function createSyntheticCommit(entry) {
  const tree = git(["write-tree"]);
  const parent = git(["rev-parse", "HEAD"]);
  const body = [entry.body, `Release-Signal-Source: ${entry.sourceSha}`]
    .filter(Boolean)
    .join("\n\n");
  const messageArgs = ["-m", entry.subject, "-m", body];
  const commit = execFileSync(
    "git",
    ["commit-tree", tree, "-p", parent, ...messageArgs],
    {
      encoding: "utf8",
      env: syntheticCommitEnvironment(),
      stdio: ["ignore", "pipe", "pipe"],
    },
  ).trim();
  git(["reset", "--soft", commit]);
}

ensureRef(developRef);
const tag = latestReleaseTag();
const baseHead = git(["rev-parse", "HEAD"]);
const commits = firstParentCommitsSince(tag, developRef);
const releasedSources = releasedSourceShas(tag);
const releaseEntries = commits
  .filter((commit) => !releasedSources.has(commit.sha))
  .map(releaseEntryFromCommit)
  .filter((entry) => entry !== null)
  .reverse();

writeReleaseState(baseHead, tag, releaseEntries);

for (const entry of releaseEntries) {
  createSyntheticCommit(entry);
}

console.log(
  `prepare-release-commits: accepted ${releaseEntries.length} release title(s), ignored ${
    commits.length - releaseEntries.length
  } title(s) from ${developRef} since ${tag}`,
);
