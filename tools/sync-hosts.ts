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

const seatNames = ["lead", "builder", "worker", "investigator", "reviewer", "verifier", "advisor", "scout"] as const;
type SeatName = typeof seatNames[number];
type Seat = {
  readonly name: SeatName;
  readonly description: string;
  readonly specialist: string;
  readonly tier: "main" | "build" | "review" | "advisor" | "fast" | "none";
  readonly fallback: "build" | "review" | "advisor" | "none" | "site";
  readonly menu: boolean;
  readonly writes: "none" | "assigned-paths" | "repository" | "verdict-only";
};

function readSeats(root: string, plugin: string): Seat[] {
  const seats = new Map<SeatName, Seat>();
  for (const entry of readdirSync(join(root, "agents"), { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const path = join(root, "agents", entry.name);
    const text = readFileSync(path, "utf8");
    const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
    if (match?.[1] === undefined) throw new Error(`${relative(root, path)} has no frontmatter`);
    const fields: unknown = Bun.YAML.parse(match[1]);
    if (typeof fields !== "object" || fields === null) throw new Error(`${relative(root, path)} frontmatter must be a mapping`);
    if (!("seat" in fields)) continue;
    const seatName = seatNames.find((name) => entry.name === `${name === "builder" ? `${plugin}-agent` : name}.md`);
    if (seatName === undefined) throw new Error(`${relative(root, path)} is not a seat file`);
    const agentName = seatName === "builder" ? `${plugin}-agent` : seatName;
    if (!("name" in fields) || fields.name !== agentName) throw new Error(`${relative(root, path)} name must be ${agentName}`);
    if (!("description" in fields) || typeof fields.description !== "string" || fields.description.trim() === "") {
      throw new Error(`${relative(root, path)} needs a description`);
    }
    for (const key of ["codingAgent", "provider", "model", "reasoningEffort", "effort", "modelOptions"]) {
      if (key in fields) throw new Error(`${relative(root, path)} must not carry ${key}`);
    }
    const seat = fields.seat;
    if (typeof seat !== "object" || seat === null) throw new Error(`${relative(root, path)} seat must be a mapping`);
    if (!("tier" in seat) || (seat.tier !== "main" && seat.tier !== "build" && seat.tier !== "review" && seat.tier !== "advisor" && seat.tier !== "fast" && seat.tier !== "none")) {
      throw new Error(`${relative(root, path)} has an invalid seat tier`);
    }
    if (!("fallback" in seat) || (seat.fallback !== "build" && seat.fallback !== "review" && seat.fallback !== "advisor" && seat.fallback !== "none" && seat.fallback !== "site")) {
      throw new Error(`${relative(root, path)} has an invalid seat fallback`);
    }
    if (!("menu" in seat) || typeof seat.menu !== "boolean") throw new Error(`${relative(root, path)} needs a boolean seat menu`);
    if (!("writes" in seat) || (seat.writes !== "none" && seat.writes !== "assigned-paths" && seat.writes !== "repository" && seat.writes !== "verdict-only")) {
      throw new Error(`${relative(root, path)} has an invalid seat writes rule`);
    }
    if (Object.keys(seat).some((key) => !["tier", "fallback", "menu", "writes"].includes(key))) {
      throw new Error(`${relative(root, path)} has an unknown seat key`);
    }
    if ((seatName === "reviewer" || seatName === "verifier") !== seat.menu) throw new Error(`${relative(root, path)} has an invalid seat menu`);
    seats.set(seatName, {
      name: seatName,
      description: fields.description,
      specialist: seatName === "builder" ? `${plugin}-agent` : `${plugin}-${seatName}`,
      tier: seat.tier,
      fallback: seat.fallback,
      menu: seat.menu,
      writes: seat.writes,
    });
  }
  return seatNames.map((name) => {
    const seat = seats.get(name);
    if (seat === undefined) throw new Error(`agents/ is missing the ${name} seat`);
    return seat;
  });
}

function seatTable(root: string, plugin: string): string {
  const writes = {
    none: "No",
    "assigned-paths": "Only the directory or paths the brief names",
    repository: "Its own branch and the paths the brief names",
    "verdict-only": "Commands, and one verdict or ledger row. No source edits",
  };
  const fallback = {
    build: "`build`",
    review: "`review`",
    advisor: "`advisor`",
    none: "The host's model",
    site: "The role each site resolves to today",
  };
  const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
  const rows = readSeats(root, plugin).map((seat) => {
    const tier = seat.tier === "main" ? "The person's main model" : seat.tier === "none" ? "Explicit choice" : `${seat.tier}${seat.menu ? ", with a menu" : ""}`;
    return `| \`${seat.name}\` | \`${seat.specialist}\` | ${tier} | ${seat.name === "lead" ? "Not delegated to" : fallback[seat.fallback]} | ${seat.name === "lead" ? "Yes" : writes[seat.writes]} | ${cell(seat.description)} |`;
  });
  const table = [
    "<!-- seats:start -->",
    "| Seat | Specialist id in Intent | Setup asks | Fallback on other hosts | May write | Use when |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows,
    "<!-- seats:end -->",
  ].join("\n");
  const path = join(root, "skills", `${plugin}-mode`, "references/runtime.md");
  const runtime = readFileSync(path, "utf8");
  const region = /<!-- seats:start -->[\s\S]*?<!-- seats:end -->/g;
  if ([...runtime.matchAll(region)].length !== 1) throw new Error(`${relative(root, path)} needs one generated seat table region`);
  return runtime.replace(region, () => table);
}

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
    // Cursor would otherwise auto-load hooks/hooks.json, which uses the Claude Code and Codex event names.
    hooks: "./hooks/cursor.json",
  }));

  // `npx github:<owner>/<repo>` reads this to install the plugin into hosts that load no plugins.
  files.set("package.json", json({
    name: metadata.name,
    version: metadata.version,
    description: metadata.description,
    license: metadata.license,
    bin: { [`${metadata.name}-intent`]: "hooks/intent-install.sh" },
    files: ["agents", "hooks", "skills", "tools/metadata.json", "!**/node_modules"],
  }));

  files.set(`skills/${metadata.name}-mode/references/runtime.md`, seatTable(root, metadata.name));

  const skills = readSkills(root);
  // The hooks and the entry-point docs find the mode skill by the plugin's name.
  if (!skills.some((skill) => skill.name === `${metadata.name}-mode`)) throw new Error(`skills/${metadata.name}-mode must exist; rename it with the plugin`);
  for (const skill of skills) {
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
      console.log(`Host files and seat table match tools/metadata.json and frontmatter (${expected.size} files).`);
      return;
    }
    for (const [path] of changed) console.error(`out of date: ${path}`);
    for (const path of stale) console.error(`stale: ${path}`);
    console.error("Run `bun run --cwd skills/cstack-mode/scripts sync:hosts` and commit the result.");
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
