#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { closeSync, fchmodSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, readlinkSync, realpathSync, renameSync, rmdirSync, symlinkSync, unlinkSync, writeFileSync, writeSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const source = dirname(dirname(fileURLToPath(import.meta.url)));
const { name } = JSON.parse(readFileSync(join(source, "tools/metadata.json"), "utf8"));
const hash = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => JSON.stringify(value, null, 2) + "\n";
const stat = (path) => {
  try { return lstatSync(path); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
};
const physical = (path) => stat(path) ? realpathSync(path) : join(physical(dirname(path)), basename(path));
const text = (value) => typeof value === "string" && value.trim() !== "" && !/[\r\n\0]/.test(value);
const help = `Usage: node <plugin-root>/hooks/intent-setup.mjs <report|apply|revert> [options]

  report --choices <file> --catalog <file>   Show every old and new file. Write nothing.
  apply --choices <file> --catalog <file> --yes --approval <digest>
                                          Apply the exact report you approved.
  revert                                  Undo recorded changes. Keep later edits.
  revert --report-only                    Show the undo without writing.
  --show-all                              Show all eight seats if hidden delegation fails.
  --help                                  Show this help.

Choices are a JSON object keyed by seat. Every seat needs provider, model, and
reasoningEffort. Reviewer and verifier also need modelOptions, an ordered array
of those triples whose first entry equals the seat's triple. No duplicate pairs.
Catalog is {providers:[{id,models:[{id,efforts:[...]}]}]}, collected from Intent.
Revert keeps original bytes in the record until restored. Move a later-edited
seat file aside, then run revert again to restore its original without overwriting.
An unreadable record still supports revert --report-only. Keep a backup to recover it.
Dead process locks are cleared; previous-run temporary files are named and kept.
No provider, model, or effort is chosen for you. Without --yes, apply writes nothing.
Install first. Setup reads its recorded mode link to find the plugin copy.
Setup records only its file writes. It changes no daemon setting or rule.
`;

function fileState(path) {
  const entry = stat(path);
  if (!entry) return { kind: "absent" };
  if (entry.isSymbolicLink()) return { kind: "link", target: readlinkSync(path) };
  if (!entry.isFile()) throw new Error(`Kept ${path}. It is not a regular file or a recorded link.`);
  const bytes = readFileSync(path);
  return { kind: "file", content: bytes.toString("base64"), sha256: hash(bytes), mode: entry.mode & 0o777 };
}
function same(a, b) {
  return a.kind === b.kind && (a.kind === "absent" || (a.kind === "link" ? a.target === b.target : a.sha256 === b.sha256 && a.mode === b.mode));
}
let trackTemporary = () => {};
function atomicReplace(path, create) {
  const temporary = join(dirname(path), `.setup-${randomUUID()}.tmp`);
  trackTemporary(temporary, true);
  let created;
  try {
    create(temporary, (entry) => { created = entry; });
    renameSync(temporary, path);
  } finally {
    const remaining = stat(temporary);
    if (created && remaining?.dev === created.dev && remaining.ino === created.ino) unlinkSync(temporary);
    if (!stat(temporary)) trackTemporary(temporary, false);
  }
}
function atomicWrite(path, bytes, mode) {
  atomicReplace(path, (temporary, owned) => {
    const fd = openSync(temporary, "wx", mode);
    owned(fstatSync(fd));
    try { writeFileSync(fd, bytes); fchmodSync(fd, mode); } finally { closeSync(fd); }
  });
}
function atomicLink(path, target) {
  atomicReplace(path, (temporary, owned) => { symlinkSync(target, temporary); owned(lstatSync(temporary)); });
}
function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    help: { type: "boolean" }, choices: { type: "string" }, catalog: { type: "string" },
    yes: { type: "boolean" }, approval: { type: "string" },
    "report-only": { type: "boolean" }, "show-all": { type: "boolean" },
  } });
  if (values.help) { process.stdout.write(help); return; }
  const [command] = positionals;
  if (positionals.length !== 1 || !["report", "apply", "revert"].includes(command)) throw new Error(help);
  if (!/^[a-z0-9-]+$/.test(name)) throw new Error("The plugin has no valid name.");
  if (!process.env.HOME || !isAbsolute(process.env.HOME)) throw new Error("HOME must be an absolute path.");
  const home = realpathSync(process.env.HOME);
  const specialists = join(home, ".intent/specialists");
  const dataHome = process.env.XDG_DATA_HOME;
  const data = physical(dataHome && isAbsolute(dataHome) ? dataHome : join(home, ".local/share"));
  const recordPath = join(data, `${name}-setup-record.json`);
  const installPath = join(data, `${name}-install-record.json`);
  const lockPath = `${recordPath}.lock`;
  const seatFiles = readdirSync(join(source, "agents")).sort().filter((file) => file.endsWith(".md") && /^seat:$/m.test(readFileSync(join(source, "agents", file), "utf8").split("\n---\n")[0]));
  const seatId = (file) => file === `${name}-agent.md` ? `${name}-agent` : `${name}-${basename(file, ".md")}`;
  const paths = new Set(seatFiles.map((file) => join(specialists, `${seatId(file)}.md`)));
  function safeParents(path) {
    for (let parent = dirname(path); parent !== dirname(parent); parent = dirname(parent)) {
      const entry = stat(parent);
      if (entry && !entry.isDirectory()) throw new Error(`Kept ${parent}. A parent is not a regular directory.`);
    }
  }
  safeParents(join(specialists, "probe"));
  safeParents(recordPath);
  function validateState(state) {
    if (!state || !["absent", "file", "link"].includes(state.kind)) throw new Error("Invalid file state in setup record.");
    if (state.kind === "link" && !text(state.target)) throw new Error("Invalid link in setup record.");
    if (state.kind === "file" && (typeof state.content !== "string" || Buffer.from(state.content, "base64").toString("base64") !== state.content || hash(Buffer.from(state.content, "base64")) !== state.sha256 || !Number.isInteger(state.mode) || state.mode < 0 || state.mode > 0o777)) throw new Error("Invalid file in setup record.");
  }
  function validateChange(change) {
    if (!change || change.kind !== "file-written" || !paths.has(change.path)) throw new Error("Invalid path in setup record.");
    validateState(change.before);
    validateState(change.after);
    if (change.after.kind !== "file") throw new Error("Setup writes only regular files.");
  }
  const empty = { schemaVersion: 1, pluginRoot: source, ranUnderVersion: "", phase: "ready", changes: [] };
  function loadRecord() {
    if (!stat(recordPath)) return empty;
    if (!stat(recordPath).isFile()) throw new Error("The setup record is not a regular file.");
    const record = JSON.parse(readFileSync(recordPath, "utf8"));
    if (record.schemaVersion !== 1 || !text(record.pluginRoot) || !isAbsolute(record.pluginRoot) || typeof record.ranUnderVersion !== "string" || !["ready", "applying"].includes(record.phase) || !Array.isArray(record.changes)) throw new Error("Invalid setup record.");
    record.changes.forEach(validateChange);
    if (record.phase === "applying") {
      if (!Array.isArray(record.pending) || !Array.isArray(record.createdDirectories)) throw new Error("Invalid pending setup record.");
      validateState(record.previousRecord);
      if (record.previousRecord.kind === "link") throw new Error("A setup record cannot replace a link.");
      record.pending.forEach(validateChange);
      if (new Set(record.pending.map((change) => change.path)).size !== record.pending.length) throw new Error("Duplicate pending paths in setup record.");
      const allowedDirectories = [join(home, ".intent"), specialists];
      if (record.createdDirectories.some((path) => !allowedDirectories.includes(path))) throw new Error("Invalid created directory in setup record.");
    }
    return record;
  }
  const save = (record) => atomicWrite(recordPath, json(record), 0o600);
  function restore(change, rollingBack = false) {
    safeParents(change.path);
    const kept = (reason) => ({
      resolved: change.before.kind !== "file",
      message: `${reason}${change.before.kind === "file" ? ` Original bytes are held in ${recordPath} for ${change.path}. To restore them, move the edited file aside, then run revert again.` : ""}`,
    });
    const done = (message) => ({ resolved: true, message });
    const entry = stat(change.path);
    if (entry && !entry.isFile() && !entry.isSymbolicLink()) return kept(`Kept ${change.path}. You replaced it after setup.`);
    const current = fileState(change.path);
    if (current.kind === "absent" && change.before.kind === "absent") return done(`Already absent ${change.path}. You deleted it after setup.`);
    if (same(current, change.before)) return done(`Already reverted ${change.path}.`);
    if (current.kind !== "absent" && !same(current, change.after)) return kept(`Kept ${change.path}. You changed it after setup.`);
    if (change.before.kind === "file") atomicWrite(change.path, Buffer.from(change.before.content, "base64"), change.before.mode);
    else if (change.before.kind === "link") {
      let owned = rollingBack;
      if (!owned && stat(installPath)?.isFile()) {
        try {
          const installation = JSON.parse(readFileSync(installPath, "utf8"));
          owned = installation.schemaVersion === 1 && installation.entries?.some((entry) => entry.path === change.path && same(entry, change.before));
        } catch { owned = false; }
      }
      if (owned) atomicLink(change.path, change.before.target);
      else {
        if (current.kind !== "absent") unlinkSync(change.path);
        return done(`Removed ${change.path}. The installer no longer owns its prior link.`);
      }
    } else if (current.kind !== "absent") unlinkSync(change.path);
    return done(`${change.before.kind === "absent" ? "Removed" : "Restored"} ${change.path}.`);
  }
  function rollback(record) {
    const messages = [];
    const unresolved = [];
    for (const change of [...record.pending].reverse()) {
      try {
        const result = restore(change, true);
        messages.push(result.message);
        if (!result.resolved) unresolved.push(change.path);
      } catch (error) { unresolved.push(change.path); messages.push(`Could not restore ${change.path}. ${error.message}`); }
    }
    if (unresolved.length) throw new Error(`Rollback is incomplete. Recorded recovery remains at ${recordPath}. Run revert to retry.
${messages.join("\n")}
Files still needing recovery:
${unresolved.join("\n")}`);
    for (const directory of [...record.createdDirectories].reverse()) {
      try { rmdirSync(directory); } catch (error) { if (!["ENOENT", "ENOTEMPTY", "EEXIST"].includes(error.code)) throw new Error(`Could not remove the empty directory ${directory}. Recovery remains at ${recordPath}. Run revert to retry. ${error.message}`); }
    }
    if (record.previousRecord.kind === "absent") unlinkSync(recordPath);
    else atomicWrite(recordPath, Buffer.from(record.previousRecord.content, "base64"), record.previousRecord.mode);
    return { ready: loadRecord(), messages };
  }
  function withLock(action) {
    if (!stat(data)?.isDirectory()) throw new Error("Install first. The plugin data directory is missing.");
    if (stat(lockPath)) {
      const current = fileState(lockPath);
      let owner;
      try { owner = JSON.parse(Buffer.from(current.content, "base64").toString().split("\n").slice(0, -1).at(-1)); } catch { owner = null; }
      const validTemporary = Array.isArray(owner?.temporaries) && owner.temporaries.every((path) => typeof path === "string" && [data, specialists].includes(dirname(path)) && /^\.setup-[a-f0-9-]{36}\.tmp$/.test(basename(path)) && resolve(path) === path);
      if (current.kind !== "file" || owner?.schemaVersion !== 1 || owner.name !== name || owner.home !== home || !Number.isInteger(owner.pid) || owner.pid < 1 || !validTemporary) throw new Error(`Setup is locked at ${lockPath}. Its owner record is unreadable. Nothing was removed. Confirm the earlier run stopped, keep a copy of this lock, then move only that lock aside and run revert.`);
      try { process.kill(owner.pid, 0); throw new Error(`Setup is locked at ${lockPath}. Its recorded PID ${owner.pid} is still running. Wait for that run to finish.`); }
      catch (error) {
        if (error.code !== "ESRCH") {
          if (!error.code) throw error;
          throw new Error(`Kept lock ${lockPath}. Could not confirm that its recorded PID ${owner.pid} stopped. ${error.message}`);
        }
      }
      if (!same(fileState(lockPath), current)) throw new Error(`Setup lock changed at ${lockPath}. Nothing was removed. Retry the command.`);
      unlinkSync(lockPath);
      process.stdout.write(`Cleared stale lock ${lockPath} because no process has its recorded PID ${owner.pid}.\n`);
      for (const path of owner.temporaries) if (stat(path)) process.stdout.write(`Left temporary file ${path}. The interrupted run listed it; this run did not create it. Keep it until recovery is verified, then remove it yourself.\n`);
    }
    let fd;
    try { fd = openSync(lockPath, "wx", 0o600); }
    catch (error) { if (error.code === "EEXIST") throw new Error(`Setup is locked at ${lockPath}. Another run acquired it. Retry after that run finishes.`); throw error; }
    const created = fstatSync(fd);
    const owner = { schemaVersion: 1, name, home, pid: process.pid, temporaries: [] };
    const updateLock = (temporary, present) => {
      if (temporary) owner.temporaries = present ? [...owner.temporaries, temporary] : owner.temporaries.filter((path) => path !== temporary);
      const bytes = Buffer.from(JSON.stringify(owner) + "\n");
      for (let offset = 0; offset < bytes.length;) offset += writeSync(fd, bytes, offset, bytes.length - offset);
    };
    try {
      updateLock(null);
      trackTemporary = updateLock;
      return action();
    } finally {
      trackTemporary = () => {};
      closeSync(fd);
      for (const path of owner.temporaries) if (stat(path)) process.stderr.write(`Left temporary file ${path}. Run revert to recover the recorded changes before removing the leftover yourself.\n`);
      const remaining = stat(lockPath);
      if (remaining?.dev === created.dev && remaining.ino === created.ino) unlinkSync(lockPath);
    }
  }
  let record;
  try { record = loadRecord(); }
  catch (error) {
    const message = `Cannot use the setup record at ${recordPath}. It is damaged or belongs to a different setup.\n${error.message}\nNothing was changed. Run revert --report-only for a diagnostic report. Keep a backup of this record because it may hold your original files. Restore a known-good backup, or use the helper from the recorded release and home for an outdated record. If you move it aside to start over, keep that backup for manual recovery.`;
    if (values["report-only"]) { process.stdout.write(json({ recordPath, error: message })); return; }
    throw new Error(message, { cause: error });
  }
  if (command === "revert") {
    if (values.choices || values.catalog || values["show-all"] || values.approval) throw new Error("Revert takes no choices, catalog, visibility, or approval digest.");
    if (values["report-only"]) {
      process.stdout.write(json({ recordPath, phase: record.phase, changes: [...record.changes, ...(record.pending ?? [])].reverse() }));
      return;
    }
    if (!stat(recordPath) && !stat(lockPath)) { process.stdout.write("Nothing to revert.\n"); return; }
    withLock(() => {
      let latest = loadRecord();
      if (latest.phase === "applying") {
        const recovery = rollback(latest);
        latest = recovery.ready;
        process.stdout.write(`Recovered the interrupted apply.\n${recovery.messages.join("\n")}\n`);
      }
      if (latest.changes.length === 0) { process.stdout.write("Nothing to revert.\n"); return; }
      const blocked = new Set();
      for (let index = latest.changes.length - 1; index >= 0; index--) {
        const change = latest.changes[index];
        if (blocked.has(change.path)) continue;
        const result = restore(change);
        if (result.resolved) {
          latest.changes.splice(index, 1);
          save(latest);
        } else blocked.add(change.path);
        process.stdout.write(result.message + "\n");
      }
      process.stdout.write(latest.changes.length ? `Revert kept unresolved originals in ${recordPath}.\n` : "Revert complete.\n");
    });
    return;
  }
  if (record.phase !== "ready") throw new Error("An apply was interrupted. Run revert before a new report or apply.");
  if (!values.choices || !values.catalog) throw new Error("Report and apply need --choices and --catalog. No seat inherits a default.");
  if (!stat(installPath)?.isFile()) throw new Error("Install first. A regular installation record is required.");
  const installation = JSON.parse(readFileSync(installPath, "utf8"));
  if (installation.schemaVersion !== 1 || !Array.isArray(installation.entries) || installation.modeRule?.location !== "Intent's Settings, under Agent Behavior" || !["added", "existing", "manual", "unchanged"].includes(installation.modeRule.status)) throw new Error("Invalid installation record. Run the installer first.");
  const installedPaths = new Set();
  for (const entry of installation.entries) {
    if (!entry || typeof entry.path !== "string" || resolve(entry.path) !== entry.path || ![join(home, ".intent/skills"), specialists].includes(dirname(entry.path)) || installedPaths.has(entry.path) || !(entry.kind === "link" && text(entry.target) || entry.kind === "file" && /^[a-f0-9]{64}$/.test(entry.sha256) && Number.isInteger(entry.mode) && entry.mode >= 0 && entry.mode <= 0o777)) throw new Error("Invalid installation entry. Run the installer first.");
    safeParents(entry.path);
    installedPaths.add(entry.path);
  }
  const modePath = join(home, ".intent/skills", `${name}-mode`);
  const mode = installation.entries.find((entry) => entry.path === modePath);
  if (!mode || mode.kind !== "link" || !same(fileState(modePath), mode)) throw new Error("Install first. The recorded mode link no longer matches.");
  const pluginRoot = realpathSync(dirname(dirname(resolve(dirname(modePath), mode.target))));
  if (resolve(dirname(modePath), mode.target) !== join(pluginRoot, "skills", `${name}-mode`)) throw new Error("Invalid recorded plugin root.");
  const metadata = JSON.parse(readFileSync(join(pluginRoot, "tools/metadata.json"), "utf8"));
  if (metadata.name !== name || !text(metadata.version)) throw new Error("The installed plugin metadata does not match.");
  const choices = JSON.parse(readFileSync(values.choices, "utf8"));
  const catalog = JSON.parse(readFileSync(values.catalog, "utf8"));
  if (!Array.isArray(catalog.providers) || catalog.providers.length === 0) throw new Error("The available-model catalog has no providers.");
  const available = new Set();
  for (const provider of catalog.providers) {
    if (!text(provider.id) || !Array.isArray(provider.models)) throw new Error("Invalid provider in the catalog.");
    for (const model of provider.models) {
      if (!text(model.id) || model.id.includes(":") || !Array.isArray(model.efforts) || model.efforts.some((effort) => !text(effort))) throw new Error("Invalid model in the catalog.");
      for (const effort of model.efforts) available.add(JSON.stringify([provider.id, model.id, effort]));
    }
  }
  function triple(choice) {
    if (!choice || !text(choice.provider) || !text(choice.model) || choice.model.includes(":") || !text(choice.reasoningEffort)) throw new Error("Every seat and menu entry needs an explicit provider, bare model, and effort.");
    const result = { provider: choice.provider, model: choice.model, reasoningEffort: choice.reasoningEffort };
    if (!available.has(JSON.stringify(Object.values(result)))) throw new Error(`Intent does not offer ${JSON.stringify(result)} in this catalog.`);
    return result;
  }
  const operations = [];
  const expectedSeats = seatFiles.map((file) => file === `${name}-agent.md` ? "builder" : basename(file, ".md"));
  if (!choices || Array.isArray(choices) || Object.keys(choices).length !== expectedSeats.length || Object.keys(choices).some((seat) => !expectedSeats.includes(seat))) throw new Error("Choose exactly the eight seats from the plugin.");
  for (const file of seatFiles) {
    const seat = file === `${name}-agent.md` ? "builder" : basename(file, ".md");
    const choice = triple(choices[seat]);
    const seatPath = join(pluginRoot, "agents", file);
    const frontmatter = readFileSync(seatPath, "utf8").split("\n---\n")[0];
    const description = frontmatter.match(/^description: (.+)$/m)?.[1];
    if (!description || !/^seat:$/m.test(frontmatter)) throw new Error(`Missing seat definition at ${seatPath}.`);
    const pointer = `Read the file at ${seatPath} and follow it for the rest of the session.`;
    const fields = [`name: ${JSON.stringify(seatId(file))}`, `description: ${JSON.stringify(description)}`, `codingAgent: ${JSON.stringify(choice.provider)}`, `model: ${JSON.stringify(choice.model)}`, `reasoningEffort: ${JSON.stringify(choice.reasoningEffort)}`];
    if (/^  menu: true$/m.test(frontmatter)) {
      if (!Array.isArray(choices[seat].modelOptions) || choices[seat].modelOptions.length === 0) throw new Error(`${seat} needs a nonempty modelOptions menu.`);
      const menu = choices[seat].modelOptions.map(triple);
      if (JSON.stringify(menu[0]) !== JSON.stringify(choice)) throw new Error(`${seat}'s first menu entry must equal its own triple.`);
      if (new Set(menu.map((entry) => JSON.stringify([entry.provider, entry.model]))).size !== menu.length) throw new Error(`${seat}'s menu repeats a provider and model.`);
      fields.push(`modelOptions: ${JSON.stringify(menu)}`);
    } else if (choices[seat].modelOptions !== undefined) throw new Error(`${seat} does not take a model menu.`);
    fields.push(`roleReminder: ${JSON.stringify(pointer)}`, `hidden: ${seat !== "lead" && !values["show-all"]}`);
    const content = Buffer.from(`---\n${fields.join("\n")}\n---\n${pointer}\n`);
    const path = join(specialists, `${seatId(file)}.md`);
    const before = fileState(path);
    if (before.kind === "link") {
      const owned = installation.entries.find((entry) => entry.path === path);
      if (!owned || !same(before, owned)) throw new Error(`Kept ${path}. The installation record does not own this link. Move it aside yourself before setup.`);
    }
    const after = { kind: "file", content: content.toString("base64"), sha256: hash(content), mode: 0o644 };
    if (!same(before, after)) operations.push({ kind: "file-written", path, before, after });
  }
  const approval = hash(json({ pluginRoot, version: metadata.version, record, choices, catalog, operations }));
  const displayState = (state) => state.kind === "file" ? { ...state, content: Buffer.from(state.content, "base64").toString("utf8") } : state;
  process.stdout.write(json({ recordPath, pluginRoot, version: metadata.version, approval, changes: operations.map((operation) => ({ ...operation, before: displayState(operation.before), after: displayState(operation.after) })) }));
  if (values["show-all"]) process.stdout.write("All eight seats will show. Use this fallback only when hidden delegation fails.\n");
  if (command === "report" || values["report-only"] || !values.yes) { process.stdout.write("Report only. Nothing was written.\n"); return; }
  if (values.approval !== approval) throw new Error("The approval digest does not match this report. Show the new report and ask for a yes again.");
  if (operations.length === 0) { process.stdout.write("Already set. Nothing was written.\n"); return; }
  withLock(() => {
    if (json(loadRecord()) !== json(record)) throw new Error("The setup record changed after the report. Report again.");
    for (const operation of operations) if (!same(fileState(operation.path), operation.before)) throw new Error(`Kept ${operation.path}. It changed after the report.`);
    const missingDirectories = [join(home, ".intent"), specialists].filter((path) => !stat(path));
    const pending = { schemaVersion: 1, pluginRoot, ranUnderVersion: metadata.version, phase: "applying", changes: record.changes, pending: operations, createdDirectories: [], previousRecord: fileState(recordPath) };
    save(pending);
    try {
      for (const directory of missingDirectories) {
        mkdirSync(directory);
        pending.createdDirectories.push(directory);
        save(pending);
      }
      for (const operation of operations) {
        safeParents(operation.path);
        if (!same(fileState(operation.path), operation.before)) throw new Error(`${operation.path} changed during setup.`);
        atomicWrite(operation.path, Buffer.from(operation.after.content, "base64"), operation.after.mode);
      }
      save({ schemaVersion: 1, pluginRoot, ranUnderVersion: metadata.version, phase: "ready", changes: [...record.changes, ...operations] });
    } catch (error) {
      let recovery;
      try { recovery = rollback(pending); }
      catch (rollbackError) { throw new Error(`Apply failed. Rollback is incomplete. Recovery remains at ${recordPath}. Run revert to retry.\n${error.message}\n${rollbackError.message}`, { cause: rollbackError }); }
      throw new Error(`Apply failed. Rolled back this run.\n${recovery.messages.join("\n")}\n${error.message}`, { cause: error });
    }
    process.stdout.write(`Applied ${operations.length} seat files. Record saved at ${recordPath}.\n`);
  });
}
try { main(); } catch (error) { process.stderr.write(error.message + "\n"); process.exitCode = 2; }
