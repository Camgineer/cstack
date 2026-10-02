// Build the CStack file preset without network calls or bot settings writes.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = resolve(ROOT, "dist/openmausbot");
const LINK = /\[[^\]\n]+\]\(([^)\s]+)\)/g;
const digest = data => createHash("sha256").update(data).digest("hex");

function sourcePath(root, path) {
  const target = resolve(root, path);
  const local = relative(root, target);
  if (local.startsWith("../") || isAbsolute(local)) throw new Error(`Source outside repository: ${path}`);
  return target;
}

const readSource = (root, path) => readFileSync(sourcePath(root, path), "utf8");

export function metadata(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error("Missing skill frontmatter");
  const fields = {};
  for (const line of match[1].split("\n")) {
    const item = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (item) fields[item[1]] = item[2].replace(/^["']|["']$/g, "").trim();
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fields.name ?? "") || fields.name.length > 64) throw new Error("Invalid skill name");
  if (!fields.description || fields.description.length > 1024) throw new Error("Invalid skill description");
  return fields;
}

export function bundle(root, spec) {
  const paths = [spec.entry, ...spec.references];
  if (paths.length !== new Set(paths).size) throw new Error("Duplicate bundled source");
  const anchors = new Map(paths.map((path, i) => [path, `cstack-part-${i}`]));
  function rewrite(text, current) {
    return text.replace(LINK, (match, target) => {
      if (/^(https?:\/\/|mailto:|#)/.test(target)) return match;
      if (target.includes("#")) throw new Error(`Local fragment needs an explicit bundle mapping: ${target}`);
      const resolved = sourcePath(root, relative(root, resolve(root, dirname(current), target)));
      const path = relative(root, resolved);
      if (!anchors.has(path)) throw new Error(`Unbundled reference in ${current}: ${target}`);
      return match.replace(`(${target})`, `(#${anchors.get(path)})`);
    });
  }
  const raw = readSource(root, paths[0]);
  const fields = metadata(raw);
  const boundary = raw.indexOf("\n---\n", 4) + "\n---\n".length;
  let instructions = raw.slice(0, boundary) + `\n<a id="${anchors.get(paths[0])}"></a>\n` + rewrite(raw.slice(boundary), paths[0]);
  for (const path of paths.slice(1)) {
    instructions += `\n\n<a id="${anchors.get(path)}"></a>\n\n` + rewrite(readSource(root, path), path).trimEnd() + "\n";
  }
  instructions += `\n## Source and adaptation\n\nSource: ${spec.source}\n\n${spec.adaptation}\n`;
  for (const path of spec.licenses) instructions += "\n## License notice\n\n" + readSource(root, path).trimEnd() + "\n";
  if (Buffer.byteLength(instructions) > 256 * 1024) throw new Error(`Skill exceeds platform byte limit: ${fields.name}`);
  for (const [, target] of instructions.matchAll(LINK)) {
    if (target.startsWith("#") && !instructions.includes(`id="${target.slice(1)}"`)) throw new Error(`Missing bundled anchor: ${target}`);
  }
  const entry = { name: fields.name, description: fields.description, source: spec.source, instructions };
  for (const key of ["license", "compatibility"]) if (fields[key]) entry[key] = fields[key];
  return entry;
}

const jsonBytes = value => Buffer.from(JSON.stringify(value, null, 2) + "\n");

export function render(root = ROOT) {
  const config = JSON.parse(readSource(root, "openmausbot/pilot.json"));
  const entries = config.skills.map(spec => bundle(root, spec));
  const names = entries.map(entry => entry.name);
  if (names.length !== new Set(names).size || names.length > 30) throw new Error("Duplicate skill name or too many skills for one bot");
  const soul = readSource(root, config.activation);
  if (Buffer.byteLength(soul) > 24000) throw new Error("Activation exceeds platform byte limit");
  const fields = ["id", "release", "name", "tagline", "summary", "category", "author", "license", "outcomes", "setupMinutes", "requirements"];
  const pkg = Object.fromEntries(fields.map(field => [field, config[field]]));
  Object.assign(pkg, {
    agents: [],
    skills: { version: 1, entries },
    presets: [{
      key: "cstack-pilot", name: "CStack pilot",
      description: "How code works, with writing rules for human and agent audiences. Review and enable the three skills before use.",
      bot: { soul }, skills: names,
    }],
  });
  const encoded = jsonBytes({ format: "openmaus.package", version: 2, package: pkg });
  if (encoded.length > 4 * 1024 * 1024) throw new Error("Package exceeds platform byte limit");
  const outputs = new Map([[`${config.id}-${config.release}.openmaus.json`, encoded]]);
  for (const entry of entries) outputs.set(`skills/${entry.name}/SKILL.md`, Buffer.from(entry.instructions));
  const inputs = new Set(["scripts/build_openmausbot.mjs", "openmausbot/pilot.json", config.activation]);
  for (const spec of config.skills) for (const path of [spec.entry, ...spec.references, ...spec.licenses]) inputs.add(path);
  const manifest = {
    platformReference: config.platformReference,
    inputs: Object.fromEntries([...inputs].sort().map(path => [path, digest(readFileSync(sourcePath(root, path)))])),
    outputs: Object.fromEntries([...outputs].sort(([a], [b]) => a.localeCompare(b)).map(([path, data]) => [path, digest(data)])),
  };
  outputs.set("manifest.json", jsonBytes(manifest));
  return outputs;
}

function main() {
  if (process.argv.slice(2).some(arg => arg !== "--check")) throw new Error("Usage: node scripts/build_openmausbot.mjs [--check]");
  const check = process.argv.includes("--check");
  const outputs = render();
  const stale = [];
  for (const [path, data] of outputs) {
    const destination = resolve(OUTPUT, path);
    if (check) {
      if (!existsSync(destination) || !readFileSync(destination).equals(data)) stale.push(path);
    } else {
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, data);
    }
  }
  if (stale.length) throw new Error(`Stale or missing artifacts: ${stale.join(", ")}`);
  console.log(`${check ? "Checked" : "Built"} ${outputs.size} artifacts in ${OUTPUT}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
