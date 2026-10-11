import { closeSync, existsSync, fchmodSync, fstatSync, openSync, mkdtempSync, rmSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, realpathSync, renameSync, symlinkSync, unlinkSync, writeFileSync, writeSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { dirname, join, basename, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";

const source = realpathSync(dirname(dirname(fileURLToPath(import.meta.url))));
const { name } = JSON.parse(readFileSync(join(source, "tools/metadata.json"), "utf8"));
if (!/^[a-z0-9-]+$/.test(name)) throw new Error("The plugin has no valid name.");
if (!process.env.HOME || !isAbsolute(process.env.HOME)) {
  process.stderr.write("HOME must be an absolute path.\n");
  process.exit(2);
}
const home = realpathSync(process.env.HOME);
const physical = (path) => existsSync(path) ? realpathSync(path) : join(physical(dirname(path)), basename(path));
const dataHome = process.env.XDG_DATA_HOME;
const data = join(physical(dataHome && isAbsolute(dataHome) ? dataHome : join(home, ".local/share")), name);
const skills = physical(join(home, ".intent/skills"));
const specialists = physical(join(home, ".intent/specialists"));
const recordPath = join(dirname(data), `${name}-install-record.json`);
const pendingPrefix = `.${name}-install-pending-`;
const rulePhases = ["due", "attempted", "settled"];
const unreadableEvidence = new Set();
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
function validEntry(entry) {
  return entry && allowed(entry.path) && (entry.kind === "link" && typeof entry.target === "string" || entry.kind === "file" && typeof entry.sha256 === "string" && /^[a-f0-9]{64}$/.test(entry.sha256) && Number.isInteger(entry.mode) && entry.mode >= 0 && entry.mode <= 0o777);
}
function validEntries(entries) {
  return Array.isArray(entries) && entries.every(validEntry) && new Set(entries.map((entry) => entry.path)).size === entries.length;
}
function pendingRuns() {
  if (!existsSync(dirname(recordPath))) return [];
  const runs = [];
  for (const file of readdirSync(dirname(recordPath)).sort()) {
    if (!new RegExp(`^\\.${name}-install-pending-[a-f0-9-]{36}\\.json$`).test(file)) continue;
    const path = join(dirname(recordPath), file);
    try {
      if (!lstatSync(path).isFile()) throw new Error("Not a regular file.");
      const run = JSON.parse(readFileSync(path, "utf8"));
      const operation = run?.operation;
      if (run?.schemaVersion !== 1 || !Number.isInteger(run.pid) || run.pid < 1 || !rulePhases.includes(run.ruleLifecycle) || !validEntries(run.entries) || !(operation === null || operation && validEntry(operation.after) && operation.after.kind === "link" && (operation.before === null || validEntry(operation.before) && operation.before.path === operation.after.path))) throw new Error("Invalid pending evidence.");
      runs.push({ ...run, path });
    } catch (error) {
      if (error.code !== "ENOENT" && !unreadableEvidence.has(path)) {
        unreadableEvidence.add(path);
        console.log(`kept ${path}: pending evidence is unreadable. Move it aside to stop this notice.`);
      }
    }
  }
  return runs;
}
function loadRecord() {
  const path = recordPath;
  try {
    if (!lstatSync(path).isFile()) throw new Error("The record is not a regular file.");
    const record = JSON.parse(readFileSync(path, "utf8"));
    if (record.schemaVersion !== 1 || !validEntries(record.entries) || record.entries.length === 0 || !record.modeRule || record.modeRule.location !== location || !["added", "existing", "manual", "unchanged"].includes(record.modeRule.status) || record.ruleLifecycle !== undefined && !rulePhases.includes(record.ruleLifecycle)) throw new Error("Invalid record.");
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
  if (statAt(join(data, ".git"))) throw new Error(`kept ${data}: it holds a .git entry and may be your checkout. Choose a separate data folder.`);
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
  try {
    if (existsSync(data)) renameSync(data, previous);
    renameSync(incoming, data);
  } catch (error) {
    const changed = ["ENOENT", "EEXIST", "ENOTEMPTY"].includes(error.code);
    throw new Error(`Could not replace the plugin copy at ${data}. ${changed ? "Another install may be running; let it finish, then run the installer again." : "Fix the error below, then run the installer again."} Left temporary folder ${staging} for you to inspect. ${error.message}`, { cause: error });
  }
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
const lockPath = `${recordPath}.lock`;
const acquisitionPath = `${lockPath}.acquire`;
const quote = (value) => "'" + value.replaceAll("'", "'\\''") + "'";
const locked = (path, reason) => new Error(`Installation is locked at ${path}.
${reason}
No host links or installation record were changed by this run.
Wait for any active installer to finish, then run the same installer command again.
If the lock remains after you confirm no installer is active, keep a copy by moving only this lock aside:
mv ${quote(path)} ${quote(`${path}.saved-${randomUUID()}`)}
Then run the same installer command again.`);
function releaseLock(path, descriptor, identity) {
  try {
    closeSync(descriptor);
    const remaining = statAt(path);
    if (remaining?.dev === identity.dev && remaining.ino === identity.ino) unlinkSync(path);
  } catch (error) {
    throw new Error(`Could not release installation lock at ${path}. ${error.message}
Wait for any active installer to finish. If the lock remains after you confirm no installer is active, keep it by moving only this lock aside:
mv ${quote(path)} ${quote(`${path}.saved-${randomUUID()}`)}
Then run the same installer command again.`, { cause: error });
  }
}
function acquireLock() {
  let acquisition;
  try { acquisition = openSync(acquisitionPath, "wx", 0o600); }
  catch (error) {
    if (error.code === "EEXIST") return { kind: "wait", path: acquisitionPath, reason: "Another install may be taking the installation lock. Waiting up to 30 seconds." };
    const message = `Could not create installation acquisition file at ${acquisitionPath}. ${error.message}`;
    if (["EACCES", "EPERM"].includes(error.code)) throw new Error(message, { cause: error });
    throw locked(acquisitionPath, message);
  }
  const acquired = fstatSync(acquisition);
  let fd;
  let created;
  try {
    const current = statAt(lockPath);
    if (current) {
      let bytes;
      let owner;
      try {
        if (!current.isFile()) throw new Error("Not a regular owner file.");
        bytes = readFileSync(lockPath).toString();
        owner = JSON.parse(bytes.split("\n").slice(0, -1).at(-1));
        if (owner?.schemaVersion !== 1 || owner.name !== name || owner.home !== home || !Number.isInteger(owner.pid) || owner.pid < 1) throw new Error("Invalid owner.");
      } catch (error) { throw locked(lockPath, `The owner record cannot be read or validated, so the installer cannot prove the earlier run stopped. ${error.message}`); }
      try {
        process.kill(owner.pid, 0);
        return { kind: "wait", path: lockPath, reason: `Another process holds the installation lock at ${lockPath}. Waiting up to 30 seconds.` };
      } catch (error) {
        if (error.code !== "ESRCH") throw locked(lockPath, `The installer could not check recorded PID ${owner.pid} and will not clear its lock. ${error.message}`);
      }
      const latest = statAt(lockPath);
      if (latest?.dev !== current.dev || latest.ino !== current.ino || !latest.isFile() || readFileSync(lockPath).toString() !== bytes) return { kind: "wait", path: lockPath, reason: "The installation lock changed. Nothing was removed. Run the same installer command again." };
      unlinkSync(lockPath);
      console.log(`Cleared stale installation lock ${lockPath} because no process has its recorded PID ${owner.pid}.`);
    }
    try { fd = openSync(lockPath, "wx", 0o600); }
    catch (error) {
      if (error.code === "EEXIST") return { kind: "wait", path: lockPath, reason: "Another run acquired the installation lock. Waiting up to 30 seconds." };
      const message = `Could not create installation owner file at ${lockPath}. ${error.message}`;
      if (["EACCES", "EPERM"].includes(error.code)) throw new Error(message, { cause: error });
      throw locked(lockPath, message);
    }
    created = fstatSync(fd);
    const bytes = Buffer.from(JSON.stringify({ schemaVersion: 1, name, home, pid: process.pid }) + "\n");
    for (let offset = 0; offset < bytes.length;) offset += writeSync(fd, bytes, offset, bytes.length - offset);
    return { kind: "owned", fd, identity: created };
  } catch (error) {
    if (fd !== undefined) releaseLock(lockPath, fd, created);
    if (fd !== undefined) throw locked(lockPath, `Could not publish the installation owner at ${lockPath}. ${error.message}`);
    throw error;
  } finally { releaseLock(acquisitionPath, acquisition, acquired); }
}
function withInstallLock(action) {
  mkdirSync(dirname(recordPath), { recursive: true });
  const deadline = performance.now() + 30000;
  let announced = false;
  const sleeper = new Int32Array(new SharedArrayBuffer(4));
  while (true) {
    const lock = acquireLock();
    if (lock.kind === "owned") {
      try { return action(); }
      finally { releaseLock(lockPath, lock.fd, lock.identity); }
    }
    if (!announced) { console.log(lock.reason); announced = true; }
    const remaining = deadline - performance.now();
    if (remaining <= 0) throw locked(lock.path, `Stopped waiting after 30 seconds. ${lock.reason}`);
    Atomics.wait(sleeper, 0, 0, Math.min(100, remaining));
  }
}
function main() {
  const { values } = parseArgs({ options: { "report-only": { type: "boolean" } } });
  if (values["report-only"]) {
    console.log("Report only. No install, update, move, delivery, or rule write was run.");
    console.log(`Installation record ${recordPath} is ${loadRecord().state}.`);
    console.log(`The always-on mode rule belongs in ${location}.`);
    return;
  }
  let exemption;
  try {
    exemption = readFileSync(join(source, "hooks/mode-exemption.txt"), "utf8").trimEnd();
  } catch {
    throw new Error("Cannot read the mode exemption. Reinstall the complete plugin before updating Intent.");
  }
  preflight();
  if (root === data) replaceCopy();
  return withInstallLock(() => deliverHost(exemption));
}
function deliverHost(exemption) {
  preflight();
  const loaded = loadRecord();
  const previous = new Map(loaded.record.entries.map((entry) => [entry.path, entry]));
  const owned = new Map(previous);
  const desired = new Set();
  let modeRule = loaded.record.modeRule;
  const mode = join(skills, `${name}-mode`);
  const modeEntry = fingerprint(mode);
  const fallbackPhase = modeEntry?.kind === "link" ? "settled" : "due";
  const initialRuns = pendingRuns();
  const recordPhase = (record, runs) => {
    if (record.ruleLifecycle !== undefined) return record.ruleLifecycle;
    if (record.entries.some((entry) => entry.path === mode)) return "settled";
    return runs.length ? null : fallbackPhase;
  };
  let ruleLifecycle = (loaded.state === "valid" ? recordPhase(loaded.record, initialRuns) : initialRuns.length ? null : fallbackPhase) ?? "due";
  const pendingPath = join(dirname(recordPath), `${pendingPrefix}${randomUUID()}.json`);
  const journal = { schemaVersion: 1, pid: process.pid, entries: [], operation: null, ruleLifecycle };
  let journalStarted = false;
  const savePending = () => {
    mkdirSync(dirname(recordPath), { recursive: true });
    journal.entries = [...owned.values()].filter((entry) => same(fingerprint(entry.path), entry));
    journal.ruleLifecycle = ruleLifecycle;
    replaceFile(pendingPath, JSON.stringify(journal, null, 2) + "\n", 0o600);
    journalStarted = true;
  };
  const prune = () => {
    for (const [path, entry] of owned) if (!same(fingerprint(path), entry)) owned.delete(path);
  };
  const save = () => {
    prune();
    if (journalStarted) savePending();
    mkdirSync(dirname(recordPath), { recursive: true });
    replaceFile(recordPath, JSON.stringify({ schemaVersion: 1, entries: [...owned.values()].sort((a, b) => a.path.localeCompare(b.path)), modeRule, ruleLifecycle }, null, 2) + "\n");
  };
  const legacyRoots = new Set([source, data]);
  if (loaded.state !== "valid" && modeEntry?.kind === "link") {
    const candidate = dirname(dirname(resolve(dirname(mode), modeEntry.target)));
    try {
      if (JSON.parse(readFileSync(join(candidate, "tools/metadata.json"), "utf8")).name === name && modeEntry.target === join(candidate, "skills", `${name}-mode`)) legacyRoots.add(candidate);
    } catch {}
  }
  const legacy = (entry, relativePath) => loaded.state !== "valid" && entry?.kind === "link" && [...legacyRoots].some((base) => entry.target === join(base, relativePath));
  const kept = new Set();
  const keep = (path) => {
    if (kept.has(path)) return;
    kept.add(path);
    if (statAt(path)?.isSymbolicLink() && !existsSync(path)) console.log(`kept ${path}: its link target is gone. No matching installation record authorizes removal.`);
    else console.log(`left your own ${basename(path)} as it is`);
  };
  function finishOperation(operation) {
    if (dirname(operation.after.path) === skills && !existsSync(join(source, "skills", basename(operation.after.path), "SKILL.md"))) return;
    const current = fingerprint(operation.after.path);
    if (current && !same(current, operation.after) && !same(current, operation.before)) {
      owned.delete(operation.after.path);
      keep(operation.after.path);
      return;
    }
    if (!same(current, operation.after)) {
      mkdirSync(dirname(operation.after.path), { recursive: true });
      if (current) {
        try { unlinkSync(operation.after.path); } catch (error) { if (error.code !== "ENOENT") throw error; }
      }
      try { symlinkSync(operation.after.target, operation.after.path); }
      catch (error) {
        if (error.code !== "EEXIST") throw error;
        if (!same(fingerprint(operation.after.path), operation.after)) {
          owned.delete(operation.after.path);
          keep(operation.after.path);
          return;
        }
      }
      console.log(`linked ${operation.after.path}`);
    }
    owned.set(operation.after.path, operation.after);
    previous.set(operation.after.path, operation.after);
  }
  const recover = () => {
    const phases = [ruleLifecycle, ...initialRuns.map((run) => run.ruleLifecycle)];
    ruleLifecycle = rulePhases[Math.max(...phases.map((phase) => rulePhases.indexOf(phase)))];
    for (const entry of initialRuns.flatMap((run) => run.entries)) {
      if (same(fingerprint(entry.path), entry)) owned.set(entry.path, entry);
    }
    prune();
    const runs = initialRuns;
    if (runs.some((run) => run.operation)) {
      savePending();
      for (const run of runs) {
        if (!run.operation) continue;
        journal.operation = run.operation;
        savePending();
        finishOperation(run.operation);
        save();
        journal.operation = null;
        savePending();
      }
    }
  };
  function place(entry, relativePath) {
    desired.add(entry.path);
    if (!allowed(entry.path)) {
      owned.delete(entry.path);
      keep(entry.path);
      return;
    }
    const current = fingerprint(entry.path);
    const recorded = owned.get(entry.path) ?? previous.get(entry.path);
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
    journal.operation = { before: current, after: entry };
    savePending();
    finishOperation(journal.operation);
    save();
    journal.operation = null;
    savePending();
  }
  if (loaded.state !== "valid") console.log(`Installation record ${loaded.state}. No host entries were removed.`);
  recover();
  for (const entry of owned.values()) previous.set(entry.path, entry);
  if (ruleLifecycle === "due" && !journalStarted) savePending();
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
  {
    const earlierRules = [
      `Before any other step, read the \`${name}-mode\` skill's SKILL.md from your skills list and follow it for the rest of the session.`,
    ];
    const rule = `Before any other step, read the \`${name}-mode\` skill's SKILL.md from your skills list and follow it for the rest of the session, ${exemption}`;
    const firstInstall = ruleLifecycle === "due";
    const uncertain = ruleLifecycle === "attempted";
    const binary = intentCommand();
    modeRule = { location, status: "manual" };
    const unchanged = `Left the ${name}-mode rule unchanged in ${location}.`;
    const manual = `${unchanged} New rule text is available. To use it, paste this at the top of your personal rule text:\n${rule}`;
    const interrupted = `The earlier install may not have finished adding the ${name}-mode rule in ${location}. To finish it, paste this at the top of your personal rule text:\n${rule}`;
    let message = uncertain ? interrupted : manual;
    let ruleChanged = false;
    if (binary) {
      const call = (method, params) => {
        try { return JSON.parse(execFileSync(binary, ["call", method, "--params", JSON.stringify(params)], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 120000, killSignal: "SIGKILL" })); }
        catch { return null; }
      };
      const key = { workspaceId: "global", ruleType: "workspace" };
      const current = call("rules.get", key);
      const updateRule = (migration) => {
        ruleLifecycle = "attempted";
        savePending();
        const latest = call("rules.get", key);
        if (typeof latest?.content !== "string" || typeof latest.enabled !== "boolean") return false;
        const paragraph = latest.content.split(/\r?\n[ \t]*\r?\n/, 1)[0].trimEnd();
        if (latest.content.includes(rule)) { message = unchanged; return false; }
        if (migration ? !earlierRules.includes(paragraph) : latest.content.includes(`${name}-mode`) || !latest.enabled && latest.content.trim() !== "") return false;
        const content = migration ? rule + latest.content.slice(paragraph.length) : latest.content.trim() === "" ? rule : `${rule}\n\n${latest.content}`;
        ruleChanged = call("rules.update", { ...key, content, enabled: migration ? latest.enabled : true }) !== null;
        return ruleChanged;
      };
      if (typeof current?.content === "string" && typeof current.enabled === "boolean") {
        const firstParagraph = current.content.split(/\r?\n[ \t]*\r?\n/, 1)[0].trimEnd();
        if (earlierRules.includes(firstParagraph)) {
          if (updateRule(true)) {
            modeRule.status = "existing";
            message = `added the thin-seat exemption to the ${name}-mode rule in ${location}, at the top of your personal rule text.`;
          }
        } else if (firstParagraph === rule || uncertain && current.content.includes(rule)) {
          modeRule.status = "existing";
          message = unchanged;
        } else if (firstInstall && !current.content.includes(`${name}-mode`) && (current.enabled || current.content.trim() === "")) {
          if (updateRule(false)) {
            modeRule.status = "added";
            message = `added the ${name}-mode rule in ${location}, at the top of your personal rule text.`;
          }
        } else if (current.content.includes(`${name}-mode`)) modeRule.status = "existing";
        try {
          if (firstInstall && modeRule.status !== "manual" && execFileSync(binary, ["settings", "git.autoCommit"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 120000, killSignal: "SIGKILL" }).includes("= true")) console.log(`Intent commits agent work with Agent-Id trailers. To stop it, run: ${binary} settings git.autoCommit false`);
        } catch {}
      }
    }
    if (ruleLifecycle === "attempted" && message === manual) message = interrupted;
    console.log(message);
    ruleLifecycle = "settled";
    if (journalStarted || firstInstall || uncertain || ruleChanged) savePending();
    if (!ruleChanged && loaded.state === "valid" && loaded.record.ruleLifecycle === "settled") modeRule = loaded.record.modeRule;
  }
  save();
  const runs = pendingRuns();
  if (loadRecord().state === "valid") {
    for (const run of runs) unlinkSync(run.path);
  }
}
try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 2; }
