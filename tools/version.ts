#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";

type Level = "major" | "minor" | "patch";
type Version = readonly [major: number, minor: number, patch: number];

const levelByType: Readonly<Record<string, Level>> = {
  feat: "minor",
  fix: "patch",
  docs: "patch",
  refactor: "patch",
  test: "patch",
  chore: "patch",
  perf: "patch",
};

const root = resolve(import.meta.dir, "..");
const metadataPath = join(root, "tools/metadata.json");
const versionField = /("version":\s*")([^"]*)(")/;

function levelOf(title: string): Level {
  const match = /^(\w+)(?:\([^)]*\))?(!)?: \S/.exec(title);
  const level = match?.[1] === undefined ? undefined : levelByType[match[1]];
  if (match === null || level === undefined) {
    throw new Error(`PR title "${title}" must be "type(scope): subject" with a type of ${Object.keys(levelByType).join(", ")}`);
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

function main(): void {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { base: { type: "string" }, title: { type: "string" } },
  });
  const [command] = positionals;
  if ((command !== "bump" && command !== "check") || values.base === undefined || values.title === undefined) {
    throw new Error('usage: version.ts <bump|check> --base <git ref> --title "<PR title>"');
  }
  const level = levelOf(values.title);
  const expected = next(baseVersion(values.base), level);
  const metadata = readFileSync(metadataPath, "utf8");

  if (command === "check") {
    const actual = versionIn(metadata);
    if (actual === expected) {
      console.log(`Version ${actual} is the ${level} bump over ${values.base}.`);
      return;
    }
    console.error(`Version is ${actual}, but a ${level} change over ${values.base} needs ${expected}.`);
    console.error(`Run \`bun tools/version.ts bump --base ${values.base} --title "<PR title>"\` and commit the result.`);
    process.exit(1);
  }

  writeFileSync(metadataPath, metadata.replace(versionField, `$1${expected}$3`));
  const sync = spawnSync(process.execPath, [join(root, "tools/sync-hosts.ts")], { stdio: "inherit" });
  if (sync.status !== 0) process.exit(sync.status ?? 1);
  console.log(`Version set to ${expected}.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
