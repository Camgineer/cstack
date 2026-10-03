#!/usr/bin/env bun
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";

type Metadata = {
  readonly name: string;
  readonly displayName: string;
  readonly version: string;
  readonly description: string;
  readonly shortDescription: string;
  readonly license: string;
  readonly logo: string;
  readonly keywords: readonly string[];
};

type Skill = {
  readonly directory: string;
  readonly name: string;
  readonly description: string;
  readonly explicitOnly: boolean;
};

const codexDescriptionLimit = 120;
const lowercaseTitleWords = new Set(["a", "an", "and", "as", "at", "for", "in", "of", "on", "or", "the", "to"]);

function readMetadata(root: string): Metadata {
  const value: unknown = JSON.parse(readFileSync(join(root, "tools/metadata.json"), "utf8"));
  if (typeof value !== "object" || value === null) throw new Error("tools/metadata.json must be an object");
  const record = value as Record<string, unknown>;
  for (const key of ["name", "displayName", "version", "description", "shortDescription", "license", "logo"]) {
    if (typeof record[key] !== "string" || record[key] === "") throw new Error(`tools/metadata.json needs a non-empty "${key}"`);
  }
  if (!Array.isArray(record.keywords) || !record.keywords.every((keyword) => typeof keyword === "string")) {
    throw new Error('tools/metadata.json needs a "keywords" string array');
  }
  return value as Metadata;
}

function readSkill(root: string, directory: string): Skill {
  const path = join(root, "skills", directory, "SKILL.md");
  const match = /^---\n([\s\S]*?)\n---\n/.exec(readFileSync(path, "utf8"));
  if (match?.[1] === undefined) throw new Error(`${relative(root, path)} has no frontmatter`);
  const frontmatter: unknown = Bun.YAML.parse(match[1]);
  if (typeof frontmatter !== "object" || frontmatter === null) throw new Error(`${relative(root, path)} frontmatter must be a mapping`);
  const { name, description } = frontmatter as Record<string, unknown>;
  const policy = (frontmatter as Record<string, unknown>)["disable-model-invocation"];
  if (name !== directory) throw new Error(`${relative(root, path)} name must match its directory "${directory}"`);
  if (typeof description !== "string" || description === "") throw new Error(`${relative(root, path)} needs a description`);
  if (policy !== undefined && typeof policy !== "boolean") throw new Error(`${relative(root, path)} disable-model-invocation must be a boolean`);
  return { directory, name, description, explicitOnly: policy === true };
}

// A directory holding only generated metadata is a removed skill's leftover, which the stale check reports.
function holdsOnlyGeneratedFiles(directory: string): boolean {
  return readdirSync(directory, { recursive: true, encoding: "utf8" })
    .every((path) => path === join("agents", "openai.yaml") || statSync(join(directory, path)).isDirectory());
}

function readSkills(root: string): Skill[] {
  const skills: Skill[] = [];
  for (const entry of readdirSync(join(root, "skills"), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const directory = join(root, "skills", entry.name);
    if (existsSync(join(directory, "SKILL.md"))) skills.push(readSkill(root, entry.name));
    else if (!holdsOnlyGeneratedFiles(directory)) throw new Error(`skills/${entry.name} has no SKILL.md`);
  }
  return skills.sort((left, right) => left.name.localeCompare(right.name));
}

function titleCase(name: string): string {
  return name
    .split("-")
    .map((word, index) => (index > 0 && lowercaseTitleWords.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}

function shorten(text: string, limit: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= limit) return flat;
  const cut = flat.slice(0, limit - 3);
  const space = cut.lastIndexOf(" ");
  return `${(space > 0 ? cut.slice(0, space) : cut).replace(/[\s,;:.(]+$/, "")}...`;
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function codexSkillMetadata(skill: Skill): string {
  return [
    "interface:",
    `  display_name: ${JSON.stringify(titleCase(skill.name))}`,
    `  short_description: ${JSON.stringify(shorten(skill.description, codexDescriptionLimit))}`,
    "policy:",
    `  allow_implicit_invocation: ${!skill.explicitOnly}`,
    "",
  ].join("\n");
}

function expectedFiles(root: string): Map<string, string> {
  const metadata = readMetadata(root);
  const developer = `${metadata.displayName} contributors`;
  const author = { name: developer };
  const files = new Map<string, string>();

  files.set(".claude-plugin/plugin.json", json({
    name: metadata.name,
    displayName: metadata.displayName,
    version: metadata.version,
    description: metadata.description,
    author,
    license: metadata.license,
    keywords: metadata.keywords,
  }));
  files.set(".claude-plugin/marketplace.json", json({
    name: metadata.name,
    owner: author,
    metadata: { description: metadata.shortDescription },
    plugins: [{ name: metadata.name, source: "./", description: metadata.description, version: metadata.version }],
  }));

  files.set(".codex-plugin/plugin.json", json({
    name: metadata.name,
    version: metadata.version,
    description: metadata.description,
    author,
    skills: "./skills/",
    interface: {
      displayName: metadata.displayName,
      shortDescription: metadata.shortDescription,
      longDescription: metadata.description,
      developerName: developer,
      category: "Productivity",
      capabilities: [],
      defaultPrompt: `Use ${metadata.displayName} to understand this project.`,
    },
    license: metadata.license,
  }));
  files.set(".agents/plugins/marketplace.json", json({
    name: metadata.name,
    interface: { displayName: metadata.displayName },
    plugins: [{
      name: metadata.name,
      source: { source: "local", path: "." },
      policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
      category: "Productivity",
    }],
  }));

  files.set(".cursor-plugin/plugin.json", json({
    name: metadata.name,
    displayName: metadata.displayName,
    version: metadata.version,
    description: metadata.description,
    author,
    license: metadata.license,
    logo: metadata.logo,
    keywords: metadata.keywords,
    category: "developer-tools",
    skills: "./skills/",
    agents: "./agents/",
  }));

  for (const skill of readSkills(root)) {
    files.set(`skills/${skill.directory}/agents/openai.yaml`, codexSkillMetadata(skill));
  }
  return files;
}

function staleSkillMetadata(root: string, expected: Map<string, string>): string[] {
  return readdirSync(join(root, "skills"))
    .map((directory) => `skills/${directory}/agents/openai.yaml`)
    .filter((path) => existsSync(join(root, path)) && !expected.has(path));
}

function main(): void {
  const { values } = parseArgs({ options: { check: { type: "boolean", default: false } } });
  const root = resolve(import.meta.dir, "..");
  const expected = expectedFiles(root);
  const changed = [...expected].filter(([path, content]) => !existsSync(join(root, path)) || readFileSync(join(root, path), "utf8") !== content);
  const stale = staleSkillMetadata(root, expected);

  if (values.check) {
    if (changed.length === 0 && stale.length === 0) {
      console.log(`Host files match tools/metadata.json and skill frontmatter (${expected.size} files).`);
      return;
    }
    for (const [path] of changed) console.error(`out of date: ${path}`);
    for (const path of stale) console.error(`stale: ${path}`);
    console.error("Run `bun run --cwd skills/poteto-mode/scripts sync:hosts` and commit the result.");
    process.exit(1);
  }

  for (const [path, content] of changed) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
    console.log(`wrote ${path}`);
  }
  for (const path of stale) {
    rmSync(join(root, path));
    console.log(`removed ${path}`);
  }
}

main();
