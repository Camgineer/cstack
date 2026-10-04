#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

type Level = "major" | "minor" | "patch";
type Version = readonly [major: number, minor: number, patch: number];

const levelByType: ReadonlyMap<string, Level> = new Map([
  ["feat", "minor"],
  ...["fix", "docs", "refactor", "test", "chore", "perf", "ci", "build", "style", "revert"].map((type) => [type, "patch"] as const),
]);

// The working directory's checkout, so a newer copy of this script can run against a branch that lacks it.
const root = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).stdout.trim() || resolve(import.meta.dir, "..");
const metadataPath = join(root, "tools/metadata.json");
const versionField = /("version":\s*")([^"]*)(")/;
const releaseSubject = /^chore\(release\): v\d+\.\d+\.\d+$/;

function levelOf(title: string): Level | undefined {
  const match = /^(\w+)(?:\([^)]*\))?(!)?: \S/.exec(title);
  const level = match?.[1] === undefined ? undefined : levelByType.get(match[1]);
  if (match === null || level === undefined) return undefined;
  return match[2] === "!" ? "major" : level;
}

function parseVersion(text: string): Version {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(text);
  if (match === null) throw new Error(`"${text}" is not a major.minor.patch version`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function next([major, minor, patch]: Version, level: Level): Version {
  if (level === "major") return [major + 1, 0, 0];
  if (level === "minor") return [major, minor + 1, 0];
  return [major, minor, patch + 1];
}

function git(...args: string[]): string {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.stderr.trim()}`);
  return result.stdout.trim();
}

function write(version: string): void {
  writeFileSync(metadataPath, readFileSync(metadataPath, "utf8").replace(versionField, `$1${version}$3`));
  const sync = spawnSync(process.execPath, [join(root, "tools/sync-hosts.ts")], { stdio: "inherit" });
  if (sync.status !== 0) process.exit(sync.status ?? 1);
}

// Each squash-merged change since the last release tag bumps once, oldest first, by its PR title.
function release(): void {
  const tag = spawnSync("git", ["describe", "--tags", "--abbrev=0", "--match", "v[0-9]*.[0-9]*.[0-9]*", "HEAD"], { cwd: root, encoding: "utf8" });
  if (tag.status !== 0) {
    console.log("No release tag yet, so the current version is the first release.");
    return;
  }
  const released = tag.stdout.trim();
  const subjects = git("log", "--first-parent", "--reverse", "--format=%s", `${released}..HEAD`).split("\n").filter(Boolean)
    .filter((subject) => !releaseSubject.test(subject));
  if (subjects.length === 0) {
    console.log(`Nothing merged since ${released}.`);
    return;
  }
  let version = parseVersion(released.slice(1));
  for (const subject of subjects) {
    const level = levelOf(subject);
    if (level === undefined) console.warn(`"${subject}" has no Conventional Commits type, so it counts as a patch.`);
    version = next(version, level ?? "patch");
  }
  const text = version.join(".");
  write(text);
  console.log(`Version set to ${text} for ${subjects.length} change(s) since ${released}.`);
}

function versionAt(ref: string): string {
  const version = versionField.exec(git("show", `${ref}:tools/metadata.json`))?.[2];
  if (version === undefined) throw new Error(`tools/metadata.json at ${ref} needs a "version"`);
  return version;
}

// A PR leaves the version alone and names its release level in its title.
function check(base: string, title: string): void {
  const level = levelOf(title);
  if (level === undefined) {
    throw new Error(`PR title "${title}" must be "type(scope): subject" with a type of ${[...levelByType.keys()].join(", ")}`);
  }
  const ours = versionField.exec(readFileSync(metadataPath, "utf8"))?.[2];
  const theirs = versionAt(base);
  if (ours !== theirs) {
    throw new Error(`The PR changes the version from ${theirs} to ${ours}. The release sets it after the merge, so restore ${theirs} and rerun \`sync:hosts\`.`);
  }
  console.log(`Merging "${title}" releases a ${level} version.`);
}

function main(): void {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: { base: { type: "string" }, title: { type: "string" } } });
  const [command] = positionals;
  if (command === "release") return release();
  if (command === "check" && values.base !== undefined && values.title !== undefined) return check(values.base, values.title);
  throw new Error('usage: version.ts release | version.ts check --base <git ref> --title "<PR title>"');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
