import { closeSync, existsSync, fchmodSync, openSync, mkdtempSync, rmSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, realpathSync, renameSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { dirname, join, basename, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";

const source = realpathSync(dirname(dirname(fileURLToPath(import.meta.url))));
const { name } = JSON.parse(readFileSync(join(source, "tools/metadata.json"), "utf8"));
if (!/^[a-z0-9-]+$/.test(name)) throw new Error("The plugin has no valid name.");
if (!process.env.HOME) throw new Error("HOME is required.");
const home = realpathSync(process.env.HOME);
const physical = (path) => existsSync(path) ? realpathSync(path) : join(physical(dirname(path)), basename(path));
const data = join(physical(resolve(process.env.XDG_DATA_HOME ?? join(home, ".local/share"))), name);
const skills = physical(join(home, ".intent/skills"));
const specialists = physical(join(home, ".intent/specialists"));
const recordPath = join(dirname(data), `${name}-install-record.json`);
const location = "Intent's Settings, under Agent Behavior";
const root = existsSync(join(source, ".git")) ? source : data;
const statAt = (path) => {
  try { return lstatSync(path); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
};
const fingerprint = (path) => {
  const stat = statAt(path);
  if (!stat) return null;
  if (stat.isSymbolicLink()) return { path, kind: "link", target: readlinkSync(path) };
  if (stat.isFile()) return { path, kind: "file", sha256: createHash("sha256").update(readFileSync(path)).digest("hex"), mode: stat.mode & 0o777 };
  return { path, kind: "directory" };
};
const same = (a, b) => a?.kind === b?.kind && (a?.kind === "link" ? a.target === b.target : a?.kind === "file" && a.sha256 === b.sha256 && a.mode === b.mode);
const within = (base, path) => {
  const suffix = relative(base, path);
  return suffix !== "" && suffix !== ".." && !suffix.startsWith("../") && !isAbsolute(suffix);
};
function allowed(path) {
  if (typeof path !== "string" || resolve(path) !== path || path === recordPath || basename(path).startsWith(".install-record-")) return false;
  if (!(dirname(path) === skills || dirname(path) === specialists)) return false;
  return physical(dirname(path)) === dirname(path);
}
function loadRecord() {
  const path = recordPath;
  try {
    if (!lstatSync(path).isFile()) throw new Error("The record is not a regular file.");
    const record = JSON.parse(readFileSync(path, "utf8"));
    if (record.schemaVersion !== 1 || !Array.isArray(record.entries) || record.entries.length === 0 || !record.modeRule || record.modeRule.location !== location || !["added", "existing", "manual", "unchanged"].includes(record.modeRule.status)) throw new Error("Invalid record.");
    const paths = new Set();
    for (const entry of record.entries) {
      if (!allowed(entry.path) || paths.has(entry.path) || !(entry.kind === "link" && typeof entry.target === "string" || entry.kind === "file" && typeof entry.sha256 === "string" && /^[a-f0-9]{64}$/.test(entry.sha256) && Number.isInteger(entry.mode) && entry.mode >= 0 && entry.mode <= 0o777)) throw new Error("Invalid entry.");
      paths.add(entry.path);
    }
    return { state: "valid", record };
  } catch (error) {
    return { state: error.code === "ENOENT" ? "missing" : "unreadable", record: { schemaVersion: 1, entries: [], modeRule: { location, status: "unchanged" } } };
  }
}
function replaceFile(path, content, mode = 0o644) {
  const temporary = join(dirname(path), `.${path === recordPath ? "install-record" : basename(path)}-${randomUUID()}.tmp`);
  const descriptor = openSync(temporary, "wx", mode);
  try {
    try {
      writeFileSync(descriptor, content);
      fchmodSync(descriptor, mode);
    } finally { closeSync(descriptor); }
    renameSync(temporary, path);
  } finally { rmSync(temporary, { force: true }); }
}
function pluginCopy(path) {
  try {
    const metadata = join(path, "tools/metadata.json");
    return lstatSync(path).isDirectory() && lstatSync(join(path, "tools")).isDirectory() && lstatSync(metadata).isFile() && JSON.parse(readFileSync(metadata, "utf8"))?.name === name;
  } catch { return false; }
}
function overlapsProtected(path) {
  const hosts = [".intent", ".claude", ".codex", ".cursor"].flatMap((host) => [host, `${host}/skills`, `${host}/specialists`, `${host}/plugins`, `${host}/plugins/cache`, `${host}/plugins/marketplaces`]);
  const protectedPaths = [home, recordPath, skills, specialists, ...hosts.map((host) => join(home, host))].map(physical);
  return path === dirname(path) || protectedPaths.some((protectedPath) => path === protectedPath || within(path, protectedPath));
}
function preflight() {
  if (statAt(data)?.isSymbolicLink()) throw new Error(`kept ${data}: the plugin data folder is a link. Move that link aside before installing.`);
  if (overlapsProtected(data)) throw new Error(`kept ${data}: the copy path overlaps a protected home, host folder, or installation record. Choose a separate data folder.`);
  if (statAt(data) && !pluginCopy(data)) throw new Error(`kept ${data}: it is not a copy of this plugin`);
  const entry = statAt(recordPath);
  if (entry && !entry.isFile()) throw new Error(`kept ${recordPath}: this protected installation state is not a regular file. Move it aside before installing.`);
}
function replaceCopy() {
  mkdirSync(dirname(data), { recursive: true });
  const staging = mkdtempSync(join(dirname(data), `.${name}-install-`));
  const incoming = join(staging, "copy");
  const previous = join(staging, "previous");
  mkdirSync(incoming);
  const copy = (relativePath) => {
    const path = join(source, relativePath);
    const destination = join(incoming, relativePath);
    const stat = lstatSync(path);
    if (stat.isDirectory()) {
      mkdirSync(destination, { recursive: true });
      for (const child of readdirSync(path).sort()) if (child !== "node_modules") copy(join(relativePath, child));
    } else {
      mkdirSync(dirname(destination), { recursive: true });
      if (stat.isSymbolicLink()) symlinkSync(readlinkSync(path), destination);
      else replaceFile(destination, readFileSync(path), stat.mode & 0o777);
    }
  };
  for (const path of ["agents", "hooks", "skills", "tools/metadata.json", "LICENSE"]) if (existsSync(join(source, path))) copy(path);
  if (existsSync(data)) renameSync(data, previous);
  renameSync(incoming, data);
  rmSync(staging, { recursive: true, force: true });
  console.log(`copied the plugin to ${data}`);
}
function intentCommand() {
  for (const directory of (process.env.PATH ?? "").split(":")) {
    const path = join(directory, "intentd");
    if (existsSync(path)) return path;
  }
  for (const directory of ["/Applications", join(home, "Applications")]) {
    if (!existsSync(directory)) continue;
    for (const app of readdirSync(directory).filter((value) => /^Intent.*\.app$/.test(value))) {
      for (const suffix of ["Contents/MacOS/intentd", "Contents/Resources/intentd"]) {
        const path = join(directory, app, suffix);
        if (existsSync(path)) return path;
      }
    }
  }
  return null;
}
function main() {
  const { values } = parseArgs({ options: { "report-only": { type: "boolean" } } });
  if (values["report-only"]) {
    console.log("Report only. No install, update, move, delivery, or rule write was run.");
    console.log(`Installation record ${recordPath} is ${loadRecord().state}.`);
    console.log(`The always-on mode rule belongs in ${location}.`);
    return;
  }
  preflight();
  const loaded = loadRecord();
  const previous = new Map(loaded.record.entries.map((entry) => [entry.path, entry]));
  const owned = new Map(previous);
  const desired = new Set();
  let modeRule = loaded.record.modeRule;
  const save = () => {
    mkdirSync(dirname(recordPath), { recursive: true });
    replaceFile(recordPath, JSON.stringify({ schemaVersion: 1, entries: [...owned.values()].sort((a, b) => a.path.localeCompare(b.path)), modeRule }, null, 2) + "\n");
  };
  const mode = join(skills, `${name}-mode`);
  const firstInstall = !fingerprint(mode);
  const legacyRoots = new Set([source, data]);
  const modeEntry = fingerprint(mode);
  if (loaded.state !== "valid" && modeEntry?.kind === "link") {
    const candidate = dirname(dirname(resolve(dirname(mode), modeEntry.target)));
    try {
      if (JSON.parse(readFileSync(join(candidate, "tools/metadata.json"), "utf8")).name === name && modeEntry.target === join(candidate, "skills", `${name}-mode`)) legacyRoots.add(candidate);
    } catch {}
  }
  const legacy = (entry, relativePath) => loaded.state !== "valid" && entry?.kind === "link" && [...legacyRoots].some((base) => entry.target === join(base, relativePath));
  const keep = (path) => {
    if (statAt(path)?.isSymbolicLink() && !existsSync(path)) console.log(`kept ${path}: its link target is gone. No matching installation record authorizes removal.`);
    else console.log(`left your own ${basename(path)} as it is`);
  };
  function place(entry, relativePath) {
    desired.add(entry.path);
    if (!allowed(entry.path)) {
      owned.delete(entry.path);
      keep(entry.path);
      return;
    }
    const current = fingerprint(entry.path);
    const recorded = previous.get(entry.path);
    const migrated = legacy(current, relativePath);
    if (current && !same(current, recorded) && !migrated) {
      owned.delete(entry.path);
      keep(entry.path);
      return;
    }
    if (current && same(current, entry)) {
      owned.set(entry.path, entry);
      return;
    }
    if (current && loaded.state !== "valid") {
      owned.set(current.path, current);
      console.log(`Recorded the earlier ${basename(entry.path)} link. Run the installer again to update its target.`);
      return;
    }
    mkdirSync(dirname(entry.path), { recursive: true });
    if (current) unlinkSync(entry.path);
    symlinkSync(entry.target, entry.path);
    owned.set(entry.path, entry);
    save();
    console.log(`linked ${entry.path}`);
  }
  if (loaded.state !== "valid") console.log(`Installation record ${loaded.state}. No host entries were removed.`);
  if (root === data) {
    save();
    replaceCopy();
  }
  for (const directory of readdirSync(join(source, "skills")).sort()) {
    const skill = join(source, "skills", directory, "SKILL.md");
    if (!existsSync(skill)) continue;
    const frontmatter = readFileSync(skill, "utf8").split("\n---\n")[0];
    if (/^disable-model-invocation:[ \t]*true[ \t]*$/m.test(frontmatter)) continue;
    place({ path: join(skills, directory), kind: "link", target: join(root, "skills", directory) }, join("skills", directory));
  }
  for (const persona of readdirSync(join(source, "agents")).filter((entry) => entry.endsWith(".md"))) {
    const path = join(specialists, persona);
    if (fingerprint(path) && !previous.has(path)) keep(path);
  }
  if (loaded.state === "valid") {
    for (const entry of previous.values()) {
      if (desired.has(entry.path)) continue;
      const current = fingerprint(entry.path);
      if (same(current, entry)) {
        unlinkSync(entry.path);
        console.log(`removed ${entry.path}`);
      } else if (current) keep(entry.path);
      owned.delete(entry.path);
    }
  }
  if (existsSync(skills)) {
    for (const child of readdirSync(skills).sort()) {
      const path = join(skills, child);
      if (!desired.has(path) && !previous.has(path) && statAt(path)?.isSymbolicLink() && !existsSync(path)) keep(path);
    }
  }
  if (firstInstall) {
    const rule = `Before any other step, read the \`${name}-mode\` skill's SKILL.md from your skills list and follow it for the rest of the session.`;
    const binary = intentCommand();
    modeRule = { location, status: "manual" };
    if (binary) {
      try {
        const call = (method, params) => JSON.parse(execFileSync(binary, ["call", method, "--params", JSON.stringify(params)], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 120000, killSignal: "SIGKILL" }));
        const key = { workspaceId: "global", ruleType: "workspace" };
        const current = call("rules.get", key);
        if (current.content.includes(`${name}-mode`)) modeRule.status = "existing";
        else if (current.enabled || current.content.trim() === "") {
          call("rules.update", { ...key, content: current.content.trim() === "" ? rule : `${rule}\n\n${current.content}`, enabled: true });
          modeRule.status = "added";
        }
        if (modeRule.status !== "manual" && execFileSync(binary, ["settings", "git.autoCommit"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 120000, killSignal: "SIGKILL" }).includes("= true")) console.log(`Intent commits agent work with Agent-Id trailers. To stop it, run: ${binary} settings git.autoCommit false`);
      } catch {}
    }
    if (modeRule.status === "manual") console.log(`To keep the mode on, paste this into Intent's Settings, under Agent Behavior, at the top of your personal rule text:\n${rule}`);
  }
  if (!firstInstall) console.log(`Left the ${name}-mode rule unchanged in ${location}.`);
  else if (modeRule.status === "added") console.log(`added the ${name}-mode rule in ${location}, at the top of your personal rule text.`);
  else if (modeRule.status === "existing") console.log(`Kept your existing ${name}-mode rule in ${location}.`);
  save();
}
try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 2; }
