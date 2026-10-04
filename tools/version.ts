#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

type Level = "major" | "minor" | "patch";
type Version = readonly [major: number, minor: number, patch: number];

const levelByType: ReadonlyMap<string, Level> = new Map([
  ["feat", "minor"],
  ...["fix", "docs", "refactor", "test", "chore", "perf", "ci", "build", "style", "revert"].map((type) => [type, "patch"] as const),
]);

const root = resolve(import.meta.dir, "..");
const metadataPath = join(root, "tools/metadata.json");
const versionField = /("version":\s*")([^"]*)(")/;
const hostFiles = /^(\.claude-plugin\/(plugin|marketplace)\.json|\.codex-plugin\/plugin\.json|\.cursor-plugin\/plugin\.json|\.agents\/plugins\/marketplace\.json|skills\/[^/]+\/agents\/openai\.yaml)$/;

function levelOf(title: string): Level {
  const match = /^(\w+)(?:\([^)]*\))?(!)?: \S/.exec(title);
  const level = match?.[1] === undefined ? undefined : levelByType.get(match[1]);
  if (match === null || level === undefined) {
    throw new Error(`PR title "${title}" must be "type(scope): subject" with a type of ${[...levelByType.keys()].join(", ")}`);
  }
  return match[2] === "!" ? "major" : level;
}

function parseVersion(text: string): Version {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(text);
  if (match === null) throw new Error(`"${text}" is not a major.minor.patch version`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function next([major, minor, patch]: Version, level: Level): string {
  if (level === "major") return `${major + 1}.0.0`;
  if (level === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function versionIn(metadata: string): string {
  const version = versionField.exec(metadata)?.[2];
  if (version === undefined) throw new Error('tools/metadata.json needs a "version"');
  return version;
}

function baseVersion(ref: string): Version {
  const shown = spawnSync("git", ["show", `${ref}:tools/metadata.json`], { cwd: root, encoding: "utf8" });
  if (shown.status !== 0) throw new Error(`cannot read tools/metadata.json at ${ref}: ${shown.stderr.trim()}`);
  return parseVersion(versionIn(shown.stdout));
}

function git(...args: string[]): { status: number | null; stdout: string; stderr: string } {
  return spawnSync("git", args, { cwd: root, encoding: "utf8" });
}

function bump(expected: string): void {
  writeFileSync(metadataPath, readFileSync(metadataPath, "utf8").replace(versionField, `$1${expected}$3`));
  const sync = spawnSync(process.execPath, [join(root, "tools/sync-hosts.ts")], { stdio: "inherit" });
  if (sync.status !== 0) process.exit(sync.status ?? 1);
  console.log(`Version set to ${expected}.`);
}

// Gives all three sides one version before merging metadata.json, so the version line never conflicts.
function resolveMetadata(): boolean {
  const stages = [1, 2, 3].map((stage) => git("show", `:${stage}:tools/metadata.json`));
  if (stages.some((stage) => stage.status !== 0)) return false;
  const directory = mkdtempSync(join(tmpdir(), "plugin-version-"));
  try {
    const [ancestor, ours, theirs] = stages.map((stage, index) => {
      const path = join(directory, String(index));
      writeFileSync(path, stage.stdout.replace(versionField, "$1$3"));
      return path;
    });
    const merged = spawnSync("git", ["merge-file", "-p", ours!, ancestor!, theirs!], { encoding: "utf8" });
    writeFileSync(metadataPath, merged.stdout);
    if (merged.status !== 0) return false;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  return git("add", "tools/metadata.json").status === 0;
}

function merge(base: string, expected: string): void {
  if (git("status", "--porcelain").stdout !== "") throw new Error("Commit or stash your changes before you merge.");
  const merging = git("merge", "--no-commit", "--no-ff", base);
  if (git("rev-parse", "-q", "--verify", "MERGE_HEAD").status !== 0) {
    if (merging.status !== 0) throw new Error(`git merge ${base} failed: ${merging.stderr.trim()}`);
    console.log(`Already up to date with ${base}.`);
    bump(expected);
    console.log("Commit the result if the version changed.");
    return;
  }
  const unmerged = git("diff", "--name-only", "--diff-filter=U").stdout.split("\n").filter(Boolean);
  const left: string[] = [];
  for (const path of unmerged) {
    if (path === "tools/metadata.json") {
      if (!resolveMetadata()) left.push(path);
    } else if (hostFiles.test(path)) {
      git("checkout", "--theirs", "--", path);
      git("add", "--", path);
    } else {
      left.push(path);
    }
  }
  if (left.length > 0) {
    const resolved = left.includes("tools/metadata.json") ? "" : "Resolved the version files. ";
    console.error(`${resolved}Resolve these by hand, then rerun bump and commit the merge:\n${left.join("\n")}`);
    process.exit(1);
  }
  bump(expected);
  git("add", "-A");
  const commit = git("commit", "--no-edit", "--quiet");
  if (commit.status !== 0) throw new Error(`could not commit the merge: ${commit.stderr.trim()}`);
  console.log(`Merged ${base} and committed.`);
}

function main(): void {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { base: { type: "string" }, title: { type: "string" } },
  });
  const [command] = positionals;
  if ((command !== "bump" && command !== "check" && command !== "merge") || values.base === undefined || values.title === undefined) {
    throw new Error('usage: version.ts <bump|check|merge> --base <git ref> --title "<PR title>"');
  }
  const level = levelOf(values.title);
  const expected = next(baseVersion(values.base), level);

  if (command === "check") {
    const actual = versionIn(readFileSync(metadataPath, "utf8"));
    if (actual === expected) {
      console.log(`Version ${actual} is the ${level} bump over ${values.base}.`);
      return;
    }
    console.error(`Version is ${actual}, but a ${level} change over ${values.base} needs ${expected}.`);
    console.error('Run `bun tools/version.ts bump --base origin/<base branch> --title "<PR title>"` and commit the result.');
    process.exit(1);
  }
  if (command === "merge") {
    merge(values.base, expected);
    return;
  }
  bump(expected);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
