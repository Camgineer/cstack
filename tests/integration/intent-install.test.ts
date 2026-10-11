import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, linkSync, cpSync, lstatSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const setupScript = resolve(import.meta.dir, "../../hooks/intent-setup.mjs");
const setupSeats = ["lead", "builder", "worker", "investigator", "reviewer", "verifier", "advisor", "scout"];

function seatChoices() {
  const first = { provider: "fixture-provider", model: "fixture-model", reasoningEffort: "fixture-effort" };
  const second = { provider: "other-fixture-provider", model: "other-fixture-model", reasoningEffort: "other-fixture-effort" };
  return Object.fromEntries(setupSeats.map((seat) => [seat, seat === "reviewer" || seat === "verifier" ? { ...first, modelOptions: [first, second] } : { ...first }]));
}

function setupFixture(home: string) {
  expect(install(home).status).toBe(0);
  writeFileSync(join(home, "choices.json"), JSON.stringify(seatChoices()));
  writeFileSync(join(home, "catalog.json"), JSON.stringify({ providers: [
    { id: "fixture-provider", models: [{ id: "fixture-model", efforts: ["fixture-effort"] }] },
    { id: "other-fixture-provider", models: [{ id: "other-fixture-model", efforts: ["other-fixture-effort"] }] },
  ] }));
}

function setupRun(home: string, command: string, args: string[] = [], env: Record<string, string> = {}) {
  return spawnSync("node", [setupScript, command, ...args], { env: { HOME: home, PATH: join(home, "bin"), ...env }, encoding: "utf8", timeout: 10000 });
}

function setupInput(home: string) {
  return ["--choices", join(home, "choices.json"), "--catalog", join(home, "catalog.json")];
}

function setupApproval(home: string, args: string[] = []) {
  const result = setupRun(home, "report", [...setupInput(home), ...args]);
  expect(result.status).toBe(0);
  const approval: string = JSON.parse(result.stdout.slice(0, result.stdout.lastIndexOf("\n}") + 2)).approval;
  return approval;
}

function setupApply(home: string, args: string[] = [], env: Record<string, string> = {}) {
  const approval = setupApproval(home, args);
  return setupRun(home, "apply", [...setupInput(home), ...args, "--yes", "--approval", approval], env);
}

function setupRecord(home: string) {
  return JSON.parse(readFileSync(join(home, ".local/share/cstack-setup-record.json"), "utf8"));
}

test("setup reports old and new files, a no writes nothing, and an approved apply writes all eight explicit seats", () => {
  withHome((home) => {
    setupFixture(home);
    const before = homeSnapshot(home);
    const report = setupRun(home, "report", setupInput(home));
    expect(report.status).toBe(0);
    expect(report.stdout).toContain('"before": {\n        "kind": "absent"');
    expect(report.stdout).toContain("codingAgent: \\\"fixture-provider\\\"");
    expect(homeSnapshot(home)).toEqual(before);
    const no = setupRun(home, "apply", setupInput(home));
    expect(no.status).toBe(0);
    expect(no.stdout).toContain("Nothing was written.");
    expect(homeSnapshot(home)).toEqual(before);
    expect(setupApply(home).status).toBe(0);
    const directory = join(home, ".intent/specialists");
    expect(readdirSync(directory).sort()).toEqual(["cstack-advisor.md", "cstack-agent.md", "cstack-investigator.md", "cstack-lead.md", "cstack-reviewer.md", "cstack-scout.md", "cstack-verifier.md", "cstack-worker.md"]);
    for (const file of readdirSync(directory)) {
      expect(lstatSync(join(directory, file)).isFile()).toBe(true);
      const written = readFileSync(join(directory, file), "utf8");
      expect(written).toContain('codingAgent: "fixture-provider"\nmodel: "fixture-model"\nreasoningEffort: "fixture-effort"');
      expect(written).toContain(`hidden: ${file !== "cstack-lead.md"}`);
    }
    expect(readFileSync(join(directory, "cstack-worker.md"), "utf8")).toContain(`Read the file at ${root}/agents/worker.md and follow it for the rest of the session.`);
    expect(readFileSync(join(directory, "cstack-reviewer.md"), "utf8")).toContain('modelOptions: [{"provider":"fixture-provider","model":"fixture-model","reasoningEffort":"fixture-effort"},{"provider":"other-fixture-provider","model":"other-fixture-model","reasoningEffort":"other-fixture-effort"}]');
    expect(setupRecord(home).phase).toBe("ready");
    expect(setupRecord(home).changes).toHaveLength(8);
    expect(lstatSync(join(home, ".local/share/cstack-setup-record.json")).mode & 0o777).toBe(0o600);
    const after = homeSnapshot(home);
    const undoReport = setupRun(home, "revert", ["--report-only"]);
    expect(undoReport.status).toBe(0);
    expect(JSON.parse(undoReport.stdout).changes[0].path).toBe(join(directory, "cstack-worker.md"));
    expect(homeSnapshot(home)).toEqual(after);
    expect(setupApply(home).stdout).toContain("Already set. Nothing was written.");
    expect(homeSnapshot(home)).toEqual(after);
    expect(setupRun(home, "revert").stdout).toContain("Revert complete.");
    expect(readdirSync(directory)).toEqual([]);
    const reverted = homeSnapshot(home);
    expect(setupRun(home, "revert").stdout).toBe("Nothing to revert.\n");
    expect(homeSnapshot(home)).toEqual(reverted);
  });
});

test("setup keeps an edited file on revert and restores an approved personal builder file with its mode", () => {
  withHome((home) => {
    setupFixture(home);
    const directory = join(home, ".intent/specialists");
    mkdirSync(directory);
    const builder = join(directory, "cstack-agent.md");
    const own = "My own specialist and model.\n";
    writeFileSync(builder, own, { mode: 0o600 });
    expect(install(home).status).toBe(0);
    expect(readFileSync(builder, "utf8")).toBe(own);
    const report = setupRun(home, "report", setupInput(home));
    expect(report.stdout).toContain("My own specialist and model.");
    expect(setupApply(home).status).toBe(0);
    const edited = join(directory, "cstack-worker.md");
    writeFileSync(edited, "My later edit.\n");
    const result = setupRun(home, "revert");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`Kept ${edited}. You changed it after setup.`);
    expect(readFileSync(edited, "utf8")).toBe("My later edit.\n");
    expect(readFileSync(builder, "utf8")).toBe(own);
    expect(lstatSync(builder).mode & 0o777).toBe(0o600);
    expect(setupRecord(home).changes).toEqual([]);
    expect(setupRun(home, "revert").stdout).toBe("Nothing to revert.\n");
  });
});

test("an installer update preserves setup files and an edited seat needs a fresh approval", () => {
  withHome((home) => {
    setupFixture(home);
    expect(setupApply(home).status).toBe(0);
    const directory = join(home, ".intent/specialists");
    const edited = join(directory, "cstack-worker.md");
    writeFileSync(edited, "Keep this edit.\n");
    const before = homeSnapshot(directory);
    const recordBefore = readFileSync(join(home, ".local/share/cstack-setup-record.json"), "utf8");
    const from = fetchedPackage(home);
    expect(install(home, join(dirname(from), "intent-deliver.sh")).status).toBe(0);
    expect(homeSnapshot(directory)).toEqual(before);
    expect(readFileSync(join(home, ".local/share/cstack-setup-record.json"), "utf8")).toBe(recordBefore);
    expect(setupRun(home, "apply", setupInput(home)).status).toBe(0);
    expect(homeSnapshot(directory)).toEqual(before);
    const approval = setupApproval(home);
    writeFileSync(edited, "Changed after the report.\n");
    const declined = setupRun(home, "apply", [...setupInput(home), "--yes", "--approval", approval]);
    expect(declined.status).toBe(2);
    expect(declined.stderr).toContain("approval digest does not match");
    expect(readFileSync(edited, "utf8")).toBe("Changed after the report.\n");
    expect(setupApply(home).status).toBe(0);
    expect(readFileSync(edited, "utf8")).toContain(join(home, ".local/share/cstack/agents/worker.md"));
    expect(setupRun(home, "revert").status).toBe(0);
    expect(readFileSync(edited, "utf8")).toBe("Changed after the report.\n");
  });
});

test.each(["missing provider", "missing model", "missing effort", "unavailable", "compound model", "wrong menu first", "duplicate menu", "no menu"])("setup refuses %s before any write", (kind) => {
  withHome((home) => {
    setupFixture(home);
    const choices = seatChoices();
    const input: Record<string, unknown> = { ...choices };
    const keys: Record<string, string> = { "missing provider": "provider", "missing model": "model", "missing effort": "reasoningEffort" };
    if (keys[kind]) input.investigator = Object.fromEntries(Object.entries(choices.investigator).filter(([key]) => key !== keys[kind]));
    if (kind === "unavailable") input.scout = { ...choices.scout, model: "not-offered" };
    if (kind === "compound model") input.scout = { ...choices.scout, model: "fixture-provider:fixture-model" };
    const reviewer = choices.reviewer;
    if (!("modelOptions" in reviewer)) throw new Error("The review fixture needs a menu.");
    if (kind === "wrong menu first") input.reviewer = { ...reviewer, modelOptions: [...reviewer.modelOptions].reverse() };
    if (kind === "duplicate menu") input.reviewer = { ...reviewer, modelOptions: [...reviewer.modelOptions, reviewer.modelOptions[0]] };
    if (kind === "no menu") input.reviewer = Object.fromEntries(Object.entries(reviewer).filter(([key]) => key !== "modelOptions"));
    writeFileSync(join(home, "choices.json"), JSON.stringify(input));
    const before = homeSnapshot(home);
    const result = setupRun(home, "apply", [...setupInput(home), "--yes"]);
    expect(result.status).toBe(2);
    expect(homeSnapshot(home)).toEqual(before);
    expect(existsSync(join(home, ".intent/specialists"))).toBe(false);
  });
});

test("setup refuses unrecorded links, restores recorded links, and offers all-visible fallback", () => {
  withHome((home) => {
    setupFixture(home);
    const directory = join(home, ".intent/specialists");
    mkdirSync(directory);
    const path = join(directory, "cstack-agent.md");
    const target = join(root, "agents/cstack-agent.md");
    symlinkSync(target, path);
    const before = homeSnapshot(home);
    const refused = setupRun(home, "report", setupInput(home));
    expect(refused.status).toBe(2);
    expect(refused.stderr).toContain("does not own this link");
    expect(homeSnapshot(home)).toEqual(before);
    const installation = installRecord(home);
    installation.entries.push({ path, kind: "link", target });
    writeFileSync(join(home, ".local/share/cstack-install-record.json"), JSON.stringify(installation));
    const personaBefore = readFileSync(target, "utf8");
    expect(setupApply(home, ["--show-all"]).status).toBe(0);
    for (const file of readdirSync(directory)) expect(readFileSync(join(directory, file), "utf8")).toContain("hidden: false");
    expect(readFileSync(target, "utf8")).toBe(personaBefore);
    expect(setupRun(home, "revert").status).toBe(0);
    expect(readlinkSync(path)).toBe(target);
    expect(readFileSync(target, "utf8")).toBe(personaBefore);
  });
});

test.each(["new record", "existing record"])("setup rolls back every file after a mid-apply filesystem failure with %s", (state) => {
  withHome((home) => {
    const previousSetup = state === "existing record";
    setupFixture(home);
    const recordPath = join(home, ".local/share/cstack-setup-record.json");
    const directory = join(home, ".intent/specialists");
    if (previousSetup) {
      expect(setupApply(home).status).toBe(0);
      expect(setupRun(home, "revert").status).toBe(0);
      writeFileSync(join(directory, "cstack-agent.md"), "My earlier builder.\n", { mode: 0o600 });
    }
    const recordBefore = existsSync(recordPath) ? readFileSync(recordPath, "utf8") : "";
    const fault = join(home, "failure.cjs");
    writeFileSync(fault, `const fs = require('node:fs');
const original = fs.renameSync;
fs.renameSync = function(from, to) {
  if (to.endsWith('/specialists/cstack-reviewer.md')) throw new Error('fixture disk failure');
  return original.apply(this, arguments);
};
require('node:module').syncBuiltinESMExports();`);
    const result = setupApply(home, [], { NODE_OPTIONS: `--require ${JSON.stringify(fault)}` });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("Apply failed. Rolled back this run.");
    expect(result.stderr).toContain("fixture disk failure");
    if (previousSetup) {
      expect(readdirSync(directory)).toEqual(["cstack-agent.md"]);
      expect(readFileSync(join(directory, "cstack-agent.md"), "utf8")).toBe("My earlier builder.\n");
      expect(lstatSync(join(directory, "cstack-agent.md")).mode & 0o777).toBe(0o600);
      expect(readFileSync(recordPath, "utf8")).toBe(recordBefore);
    } else {
      expect(existsSync(directory)).toBe(false);
      expect(existsSync(recordPath)).toBe(false);
    }
    expect(setupApply(home).status).toBe(0);
    expect(setupRun(home, "revert").status).toBe(0);
  });
});

test("setup recovers an interrupted apply through revert without deleting an unrelated leftover", () => {
  withHome((home) => {
    setupFixture(home);
    const fault = join(home, "crash.cjs");
    writeFileSync(fault, `const fs = require('node:fs');
const original = fs.renameSync;
fs.renameSync = function(from, to) {
  const result = original.apply(this, arguments);
  if (to.endsWith('/specialists/cstack-investigator.md')) process.kill(process.pid, 'SIGKILL');
  return result;
};
require('node:module').syncBuiltinESMExports();`);
    const result = setupApply(home, [], { NODE_OPTIONS: `--require ${JSON.stringify(fault)}` });
    expect(result.signal).toBe("SIGKILL");
    expect(setupRecord(home).phase).toBe("applying");
    const leftover = join(home, ".intent/specialists/personal.md");
    writeFileSync(leftover, "My unrelated file.\n");
    const recovered = setupRun(home, "revert");
    expect(recovered.status).toBe(0);
    expect(recovered.stdout).toContain("Recovered the interrupted apply.");
    expect(readFileSync(leftover, "utf8")).toBe("My unrelated file.\n");
    expect(readdirSync(join(home, ".intent/specialists"))).toEqual(["personal.md"]);
    expect(setupRun(home, "revert").stdout).toBe("Nothing to revert.\n");
  });
});

test("setup rejects a planted record path or redirected specialist directory", () => {
  withHome((home) => {
    setupFixture(home);
    expect(setupApply(home).status).toBe(0);
    const record = setupRecord(home);
    const personal = join(home, "personal.md");
    writeFileSync(personal, "Keep this file.\n");
    record.changes[0].path = personal;
    writeFileSync(join(home, ".local/share/cstack-setup-record.json"), JSON.stringify(record));
    const before = homeSnapshot(home);
    expect(setupRun(home, "revert").stderr).toContain("Invalid path in setup record");
    expect(homeSnapshot(home)).toEqual(before);
  });
  withHome((home) => {
    setupFixture(home);
    const personal = join(home, "my specialists");
    mkdirSync(personal);
    symlinkSync(personal, join(home, ".intent/specialists"));
    const before = homeSnapshot(home);
    expect(setupRun(home, "report", setupInput(home)).stderr).toContain("A parent is not a regular directory");
    expect(homeSnapshot(home)).toEqual(before);
  });
});

test("setup revert keeps a replacement directory and an edit to permission bits", () => {
  withHome((home) => {
    setupFixture(home);
    expect(setupApply(home).status).toBe(0);
    const directory = join(home, ".intent/specialists");
    const worker = join(directory, "cstack-worker.md");
    rmSync(worker);
    mkdirSync(worker);
    writeFileSync(join(worker, "personal.txt"), "Keep my replacement.\n");
    const advisor = join(directory, "cstack-advisor.md");
    chmodSync(advisor, 0o600);
    const result = setupRun(home, "revert");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`Kept ${worker}. You replaced it after setup.`);
    expect(result.stdout).toContain(`Kept ${advisor}. You changed it after setup.`);
    expect(readFileSync(join(worker, "personal.txt"), "utf8")).toBe("Keep my replacement.\n");
    expect(lstatSync(advisor).mode & 0o777).toBe(0o600);
    expect(readdirSync(directory).sort()).toEqual(["cstack-advisor.md", "cstack-worker.md"]);
  });
});

test("setup safety retains original bytes after a later edit and restores them once the path is cleared", () => {
  withHome((home) => {
    setupFixture(home);
    const builder = join(home, ".intent/specialists/cstack-agent.md");
    mkdirSync(dirname(builder));
    writeFileSync(builder, "MY OWN BUILDER\n", { mode: 0o600 });
    expect(setupApply(home).status).toBe(0);
    writeFileSync(builder, "My later seat edit.\n");
    const reverted = setupRun(home, "revert");
    expect(reverted.status).toBe(0);
    expect(readFileSync(builder, "utf8")).toBe("My later seat edit.\n");
    const recordPath = join(home, ".local/share/cstack-setup-record.json");
    expect(reverted.stdout).toContain(`Original bytes are held in ${recordPath}`);
    expect(reverted.stdout).toContain("move the edited file aside");
    expect(setupRecord(home).changes).toHaveLength(1);
    expect(Buffer.from(setupRecord(home).changes[0].before.content, "base64").toString()).toBe("MY OWN BUILDER\n");
    const before = homeSnapshot(home);
    expect(setupRun(home, "revert").status).toBe(0);
    expect(homeSnapshot(home)).toEqual(before);
    renameSync(builder, join(home, "saved-edit.md"));
    expect(setupRun(home, "revert").stdout).toContain(`Restored ${builder}.`);
    expect(readFileSync(builder, "utf8")).toBe("MY OWN BUILDER\n");
    expect(lstatSync(builder).mode & 0o777).toBe(0o600);
    expect(readFileSync(join(home, "saved-edit.md"), "utf8")).toBe("My later seat edit.\n");
    expect(setupRecord(home).changes).toEqual([]);
  });
});

test("setup safety restores a deleted personal file and reports a deleted generated file truthfully", () => {
  withHome((home) => {
    setupFixture(home);
    const directory = join(home, ".intent/specialists");
    mkdirSync(directory);
    const builder = join(directory, "cstack-agent.md");
    const worker = join(directory, "cstack-worker.md");
    writeFileSync(builder, "MY OWN BUILDER\n", { mode: 0o600 });
    expect(setupApply(home).status).toBe(0);
    rmSync(builder);
    rmSync(worker);
    const reverted = setupRun(home, "revert");
    expect(reverted.status).toBe(0);
    expect(readFileSync(builder, "utf8")).toBe("MY OWN BUILDER\n");
    expect(reverted.stdout).toContain(`Restored ${builder}.`);
    expect(reverted.stdout).toContain(`Already absent ${worker}. You deleted it after setup.`);
    expect(reverted.stdout).not.toContain(`Kept ${worker}`);
    const before = homeSnapshot(home);
    expect(setupRun(home, "revert").stdout).toBe("Nothing to revert.\n");
    expect(homeSnapshot(home)).toEqual(before);
  });
});

test("setup safety reports an already deleted generated seat without claiming to keep it", () => {
  withHome((home) => {
    setupFixture(home);
    expect(setupApply(home).status).toBe(0);
    const worker = join(home, ".intent/specialists/cstack-worker.md");
    rmSync(worker);
    const result = setupRun(home, "revert");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`Already absent ${worker}. You deleted it after setup.`);
    expect(result.stdout).not.toContain(`Kept ${worker}`);
    expect(setupRecord(home).changes).toEqual([]);
  });
});

test.each(["truncated", "outdated", "unrecognized path"])("setup safety reports an invalid record (%s) without authorizing any change", (kind) => {
  withHome((home) => {
    setupFixture(home);
    expect(setupApply(home).status).toBe(0);
    const recordPath = join(home, ".local/share/cstack-setup-record.json");
    const record = setupRecord(home);
    if (kind === "outdated") record.schemaVersion = 200;
    if (kind === "unrecognized path") record.changes[0].path = join(home, ".intent/specialists/cstack-retired.md");
    writeFileSync(recordPath, kind === "truncated" ? "{" : JSON.stringify(record));
    const before = homeSnapshot(home);
    for (const command of ["report", "apply", "revert"]) {
      const refused = setupRun(home, command, command === "revert" ? [] : setupInput(home));
      expect(refused.status).toBe(2);
      expect(refused.stderr).toContain(`Cannot use the setup record at ${recordPath}`);
      expect(refused.stderr).toContain("revert --report-only");
      expect(refused.stderr).toContain("backup");
      expect(homeSnapshot(home)).toEqual(before);
    }
    const diagnostic = setupRun(home, "revert", ["--report-only"]);
    expect(diagnostic.status).toBe(0);
    expect(JSON.parse(diagnostic.stdout).recordPath).toBe(recordPath);
    expect(JSON.parse(diagnostic.stdout).error).toContain("Cannot use the setup record");
    expect(homeSnapshot(home)).toEqual(before);
  });
});

test("setup safety recovers a dead lock, names a crashed temporary file, and preserves unrelated leftovers", () => {
  withHome((home) => {
    setupFixture(home);
    const fault = join(home, "crash-before-rename.cjs");
    writeFileSync(fault, `const fs = require('node:fs');
const original = fs.renameSync;
fs.renameSync = function(from, to) {
  if (to.endsWith('/specialists/cstack-reviewer.md')) {
    fs.writeFileSync(${JSON.stringify(join(home, "crashed-temp.txt"))}, from);
    process.kill(process.pid, 'SIGKILL');
  }
  return original.apply(this, arguments);
};
require('node:module').syncBuiltinESMExports();`);
    expect(setupApply(home, [], { NODE_OPTIONS: `--require ${JSON.stringify(fault)}` }).signal).toBe("SIGKILL");
    const temporary = readFileSync(join(home, "crashed-temp.txt"), "utf8");
    const bytes = readFileSync(temporary, "utf8");
    const lock = join(home, ".local/share/cstack-setup-record.json.lock");
    writeFileSync(lock, readFileSync(lock, "utf8") + '{"partial":');
    const unrelated = join(home, ".intent/specialists/.setup-personal.tmp");
    writeFileSync(unrelated, "MY OWN LEFTOVER\n");
    const recovered = setupRun(home, "revert");
    expect(recovered.status).toBe(0);
    expect(recovered.stdout).toContain(`Cleared stale lock ${join(home, ".local/share/cstack-setup-record.json.lock")}`);
    expect(recovered.stdout).toContain("no process has its recorded PID");
    expect(recovered.stdout).toContain(`Left temporary file ${temporary}`);
    expect(readFileSync(temporary, "utf8")).toBe(bytes);
    expect(readFileSync(unrelated, "utf8")).toBe("MY OWN LEFTOVER\n");
    expect(setupRun(home, "revert").stdout).toBe("Nothing to revert.\n");
    expect(setupApply(home).status).toBe(0);
  });
});

test("setup safety reports incomplete rollback paths and preserves recovery for the next revert", () => {
  withHome((home) => {
    setupFixture(home);
    const builder = join(home, ".intent/specialists/cstack-agent.md");
    mkdirSync(dirname(builder));
    writeFileSync(builder, "MY OWN BUILDER\n", { mode: 0o600 });
    const fault = join(home, "rollback-failure.cjs");
    writeFileSync(fault, `const fs = require('node:fs');
const rename = fs.renameSync;
let failed = false;
fs.renameSync = function(from, to) {
  if (to.endsWith('/specialists/cstack-reviewer.md')) { failed = true; throw new Error('fixture apply failure'); }
  if (failed && to === ${JSON.stringify(builder)}) throw new Error('fixture rollback failure');
  return rename.apply(this, arguments);
};
require('node:module').syncBuiltinESMExports();`);
    const failed = setupApply(home, [], { NODE_OPTIONS: `--require ${JSON.stringify(fault)}` });
    expect(failed.status).toBe(2);
    expect(failed.stderr).toContain("Apply failed. Rollback is incomplete.");
    expect(failed.stderr).toContain(builder);
    expect(failed.stderr).toContain(join(home, ".local/share/cstack-setup-record.json"));
    expect(failed.stderr).toContain("Run revert");
    expect(setupRecord(home).phase).toBe("applying");
    expect(setupRun(home, "revert").status).toBe(0);
    expect(readFileSync(builder, "utf8")).toBe("MY OWN BUILDER\n");
  });
});

test("setup safety does not recreate a retired installer link after the installer drops its entry", () => {
  withHome((home) => {
    setupFixture(home);
    const builder = join(home, ".intent/specialists/cstack-agent.md");
    mkdirSync(dirname(builder));
    const target = join(root, "agents/cstack-agent.md");
    symlinkSync(target, builder);
    const installation = installRecord(home);
    installation.entries.push({ path: builder, kind: "link", target });
    writeFileSync(join(home, ".local/share/cstack-install-record.json"), JSON.stringify(installation));
    const persona = readFileSync(target, "utf8");
    expect(setupApply(home).status).toBe(0);
    expect(install(home).status).toBe(0);
    const reverted = setupRun(home, "revert");
    expect(reverted.status).toBe(0);
    expect(reverted.stdout).toContain(`Removed ${builder}. The installer no longer owns its prior link.`);
    expect(existsSync(builder)).toBe(false);
    expect(readFileSync(target, "utf8")).toBe(persona);
    expect(setupRun(home, "report", setupInput(home)).status).toBe(0);
    expect(setupApply(home).status).toBe(0);
  });
});

test.each(["live process", "unknown owner"])("setup safety preserves a lock (%s)", (kind) => {
  withHome((home) => {
    setupFixture(home);
    const lock = join(home, ".local/share/cstack-setup-record.json.lock");
    writeFileSync(lock, kind === "live process" ? JSON.stringify({ schemaVersion: 1, name: "cstack", home, pid: process.pid, temporaries: [] }) + "\n" : "Unknown owner's file.\n");
    const before = homeSnapshot(home);
    const result = setupApply(home);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain(`Setup is locked at ${lock}`);
    expect(result.stderr).toContain(kind === "live process" ? "still running" : "keep a copy");
    expect(homeSnapshot(home)).toEqual(before);
  });
});

test("setup safety keeps each stacked original behind an unresolved later edit", () => {
  withHome((home) => {
    setupFixture(home);
    const builder = join(home, ".intent/specialists/cstack-agent.md");
    mkdirSync(dirname(builder));
    writeFileSync(builder, "MY FIRST ORIGINAL\n");
    expect(setupApply(home).status).toBe(0);
    writeFileSync(builder, "MY SECOND ORIGINAL\n");
    expect(setupApply(home).status).toBe(0);
    writeFileSync(builder, "My final edit.\n");
    expect(setupRun(home, "revert").status).toBe(0);
    const changes = setupRecord(home).changes;
    expect(changes).toHaveLength(2);
    expect(changes.map((change: { before: { content: string } }) => Buffer.from(change.before.content, "base64").toString())).toEqual(["MY FIRST ORIGINAL\n", "MY SECOND ORIGINAL\n"]);
    const before = homeSnapshot(home);
    expect(setupRun(home, "revert").status).toBe(0);
    expect(homeSnapshot(home)).toEqual(before);
    renameSync(builder, join(home, "final-edit.md"));
    expect(setupRun(home, "revert").status).toBe(0);
    expect(readFileSync(builder, "utf8")).toBe("MY SECOND ORIGINAL\n");
    expect(setupRecord(home).changes).toHaveLength(1);
    renameSync(builder, join(home, "second-original.md"));
    expect(setupRun(home, "revert").status).toBe(0);
    expect(readFileSync(builder, "utf8")).toBe("MY FIRST ORIGINAL\n");
    expect(readFileSync(join(home, "second-original.md"), "utf8")).toBe("MY SECOND ORIGINAL\n");
    expect(readFileSync(join(home, "final-edit.md"), "utf8")).toBe("My final edit.\n");
    expect(setupRecord(home).changes).toEqual([]);
  });
});

test("setup safety names a temporary file when this run cannot remove it", () => {
  withHome((home) => {
    setupFixture(home);
    const fault = join(home, "temporary-cleanup-failure.cjs");
    writeFileSync(fault, `const fs = require('node:fs');
const rename = fs.renameSync;
const unlink = fs.unlinkSync;
let leftover;
fs.renameSync = function(from, to) {
  if (to.endsWith('/specialists/cstack-reviewer.md')) {
    leftover = from;
    fs.writeFileSync(${JSON.stringify(join(home, "left-temp.txt"))}, from);
    throw new Error('fixture disk failure');
  }
  return rename.apply(this, arguments);
};
fs.unlinkSync = function(path) {
  if (path === leftover) throw new Error('fixture temp removal failure');
  return unlink.apply(this, arguments);
};
require('node:module').syncBuiltinESMExports();`);
    const result = setupApply(home, [], { NODE_OPTIONS: `--require ${JSON.stringify(fault)}` });
    const leftover = readFileSync(join(home, "left-temp.txt"), "utf8");
    expect(result.status).toBe(2);
    expect(result.stderr).toContain(`Left temporary file ${leftover}`);
    expect(result.stderr).toContain("Rolled back this run");
    expect(readFileSync(leftover, "utf8")).toContain('name: "cstack-reviewer"');
    expect(setupApply(home).status).toBe(0);
    expect(setupRun(home, "revert").status).toBe(0);
    expect(readFileSync(leftover, "utf8")).toContain('name: "cstack-reviewer"');
  });
});

test("setup safety retries an interrupted link restore without leaving its seat path empty", () => {
  withHome((home) => {
    setupFixture(home);
    const builder = join(home, ".intent/specialists/cstack-agent.md");
    mkdirSync(dirname(builder));
    const target = join(root, "agents/cstack-agent.md");
    symlinkSync(target, builder);
    const installation = installRecord(home);
    installation.entries.push({ path: builder, kind: "link", target });
    writeFileSync(join(home, ".local/share/cstack-install-record.json"), JSON.stringify(installation));
    expect(setupApply(home).status).toBe(0);
    const seat = readFileSync(builder, "utf8");
    const fault = join(home, "link-restore-crash.cjs");
    writeFileSync(fault, `const fs = require('node:fs');
const rename = fs.renameSync;
fs.renameSync = function(from, to) {
  if (to === ${JSON.stringify(builder)} && fs.lstatSync(from).isSymbolicLink()) process.kill(process.pid, 'SIGKILL');
  return rename.apply(this, arguments);
};
require('node:module').syncBuiltinESMExports();`);
    expect(setupRun(home, "revert", [], { NODE_OPTIONS: `--require ${JSON.stringify(fault)}` }).signal).toBe("SIGKILL");
    expect(readFileSync(builder, "utf8")).toBe(seat);
    expect(setupRecord(home).changes.some((change: { path: string }) => change.path === builder)).toBe(true);
    const recovered = setupRun(home, "revert");
    expect(recovered.status).toBe(0);
    expect(recovered.stdout).toContain("Cleared stale lock");
    expect(readlinkSync(builder)).toBe(target);
    expect(setupRecord(home).changes).toEqual([]);
    expect(setupRun(home, "revert").stdout).toBe("Nothing to revert.\n");
  });
});

test.each(["untouched worker", "changed builder"])("setup recovery closes an interrupted run with a later edit (%s)", (kind) => {
  withHome((home) => {
    setupFixture(home);
    const builder = join(home, ".intent/specialists/cstack-agent.md");
    const worker = join(home, ".intent/specialists/cstack-worker.md");
    mkdirSync(dirname(builder));
    writeFileSync(builder, "ORIGINAL BUILDER\n");
    writeFileSync(worker, "ORIGINAL WORKER\n");
    const fault = join(home, "stop-after-builder.cjs");
    writeFileSync(fault, `const fs = require('node:fs');
const rename = fs.renameSync;
fs.renameSync = function(from, to) {
  const result = rename.apply(this, arguments);
  if (to === ${JSON.stringify(builder)}) process.kill(process.pid, 'SIGKILL');
  return result;
};
require('node:module').syncBuiltinESMExports();`);
    expect(setupApply(home, [], { NODE_OPTIONS: `--require ${JSON.stringify(fault)}` }).signal).toBe("SIGKILL");
    const edited = kind === "untouched worker" ? worker : builder;
    writeFileSync(edited, "MY LATER EDIT\n");
    const recovered = setupRun(home, "revert");
    expect(recovered.status).toBe(0);
    expect(recovered.stdout).toContain("Recovered the interrupted apply.");
    expect(readFileSync(edited, "utf8")).toBe("MY LATER EDIT\n");
    expect(setupRun(home, "report", setupInput(home)).status).toBe(0);
    if (kind === "untouched worker") {
      expect(recovered.stdout).not.toContain(worker);
      expect(readFileSync(builder, "utf8")).toBe("ORIGINAL BUILDER\n");
      expect(existsSync(join(home, ".local/share/cstack-setup-record.json"))).toBe(false);
    } else {
      expect(setupRecord(home).phase).toBe("ready");
      expect(setupRecord(home).changes).toHaveLength(1);
      expect(Buffer.from(setupRecord(home).changes[0].before.content, "base64").toString()).toBe("ORIGINAL BUILDER\n");
      renameSync(builder, join(home, "saved-edit.md"));
      expect(setupRun(home, "revert").status).toBe(0);
      expect(readFileSync(builder, "utf8")).toBe("ORIGINAL BUILDER\n");
    }
  });
});

test.each(["live unrelated process", "other user's process", "unfinished acquisition"])("setup recovery gives a manual escape for a lock (%s) without removing it", (kind) => {
  withHome((home) => {
    setupFixture(home);
    const lock = join(home, `.local/share/cstack-setup-record.json.lock${kind === "unfinished acquisition" ? ".acquire" : ""}`);
    writeFileSync(lock, JSON.stringify({ schemaVersion: 1, name: "cstack", home, pid: process.pid, temporaries: [] }) + "\n");
    const fault = join(home, "other-user.cjs");
    writeFileSync(fault, `process.kill = function() { throw Object.assign(new Error('fixture permission denied'), {code: 'EPERM'}); };`);
    const before = homeSnapshot(home);
    const result = setupApply(home, [], kind === "other user's process" ? { NODE_OPTIONS: `--require ${JSON.stringify(fault)}` } : {});
    expect(result.status).toBe(2);
    expect(result.stderr).toContain(`Setup is locked at ${lock}`);
    expect(result.stderr).toContain("no setup run is active");
    expect(result.stderr).toContain(`mv '${lock}' '${lock}.saved-`);
    expect(result.stderr).toContain("Then run revert.");
    expect(homeSnapshot(home)).toEqual(before);
  });
});

test("setup recovery lets only one command take over the same stale lock", () => {
  withHome((home) => {
    setupFixture(home);
    expect(setupApply(home).status).toBe(0);
    const lock = join(home, ".local/share/cstack-setup-record.json.lock");
    const dead = spawnSync("node", ["-e", "process.stdout.write(String(process.pid))"], { env: { HOME: home, PATH: join(home, "bin") }, encoding: "utf8" });
    expect(dead.status).toBe(0);
    writeFileSync(lock, JSON.stringify({ schemaVersion: 1, name: "cstack", home, pid: Number(dead.stdout), temporaries: [] }) + "\n");
    const held = join(home, "second-held");
    const released = join(home, "second-release");
    const resultPath = join(home, "second-result.json");
    const wait = `function waitFor(test) { const end = Date.now() + 4000; while (!test()) { if (Date.now() > end) throw new Error('fixture barrier timed out'); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5); } }`;
    const secondFault = join(home, "second-lock.cjs");
    writeFileSync(secondFault, `const fs = require('node:fs');
${wait}
const open = fs.openSync, write = fs.writeSync;
let lockFd, paused = false;
fs.openSync = function(path, flags) { const fd = open.apply(this, arguments); if (path === ${JSON.stringify(lock)} && flags === 'wx') lockFd = fd; return fd; };
fs.writeSync = function(fd) { const result = write.apply(this, arguments); if (fd === lockFd && !paused) { paused = true; fs.writeFileSync(${JSON.stringify(held)}, 'held'); waitFor(() => fs.existsSync(${JSON.stringify(released)})); } return result; };
require('node:module').syncBuiltinESMExports();`);
    const secondRunner = join(home, "second-runner.cjs");
    writeFileSync(secondRunner, `const result = require('node:child_process').spawnSync('node', [${JSON.stringify(setupScript)}, 'revert'], { env: {...process.env, NODE_OPTIONS: ${JSON.stringify(`--require ${JSON.stringify(secondFault)}`)}}, encoding: 'utf8', timeout: 8000 });
require('node:fs').writeFileSync(${JSON.stringify(resultPath)}, JSON.stringify({status: result.status, stderr: result.stderr, stdout: result.stdout}));`);
    const firstFault = join(home, "first-lock.cjs");
    writeFileSync(firstFault, `const fs = require('node:fs');
${wait}
const unlink = fs.unlinkSync, open = fs.openSync;
let started = false;
fs.unlinkSync = function(path) {
  if (path === ${JSON.stringify(lock)} && !started) {
    started = true;
    require('node:child_process').spawn('node', [${JSON.stringify(secondRunner)}], {env: {...process.env, NODE_OPTIONS: ''}, stdio: 'ignore'});
    waitFor(() => fs.existsSync(${JSON.stringify(held)}) || fs.existsSync(${JSON.stringify(resultPath)}));
  }
  return unlink.apply(this, arguments);
};
fs.openSync = function(path, flags) { const fd = open.apply(this, arguments); if (started && path === ${JSON.stringify(lock)} && flags === 'wx') fs.writeFileSync(${JSON.stringify(released)}, 'release'); return fd; };
process.on('exit', () => { if (started) { fs.writeFileSync(${JSON.stringify(released)}, 'release'); waitFor(() => fs.existsSync(${JSON.stringify(resultPath)})); } });
require('node:module').syncBuiltinESMExports();`);
    const first = setupRun(home, "revert", [], { NODE_OPTIONS: `--require ${JSON.stringify(firstFault)}` });
    expect(first.status).toBe(0);
    const second = JSON.parse(readFileSync(resultPath, "utf8"));
    expect(second.status).toBe(2);
    expect(second.stderr).toContain(`Setup is locked at ${lock}.acquire`);
    expect(setupRecord(home).changes).toEqual([]);
  });
});

test("setup recovery does not recreate an installer link retired during an interrupted apply", () => {
  withHome((home) => {
    setupFixture(home);
    const builder = join(home, ".intent/specialists/cstack-agent.md");
    mkdirSync(dirname(builder));
    const target = join(root, "agents/cstack-agent.md");
    symlinkSync(target, builder);
    const installation = installRecord(home);
    installation.entries.push({ path: builder, kind: "link", target });
    writeFileSync(join(home, ".local/share/cstack-install-record.json"), JSON.stringify(installation));
    const fault = join(home, "stop-written-link.cjs");
    writeFileSync(fault, `const fs = require('node:fs'), rename = fs.renameSync;
fs.renameSync = function(from, to) { const result = rename.apply(this, arguments); if (to === ${JSON.stringify(builder)}) process.kill(process.pid, 'SIGKILL'); return result; };
require('node:module').syncBuiltinESMExports();`);
    expect(setupApply(home, [], { NODE_OPTIONS: `--require ${JSON.stringify(fault)}` }).signal).toBe("SIGKILL");
    expect(install(home).status).toBe(0);
    const recovered = setupRun(home, "revert");
    expect(recovered.status).toBe(0);
    expect(recovered.stdout).toContain(`Removed ${builder}. The installer no longer owns its prior link.`);
    expect(existsSync(builder)).toBe(false);
    expect(setupRun(home, "report", setupInput(home)).status).toBe(0);
  });
});

const root = resolve(import.meta.dir, "../..");
const script = join(root, "hooks/intent-deliver.sh");

test.each(["", "."])("delivery ignores an empty or relative data directory (%s) and preserves the working checkout", (value) => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const cwd = join(home, "code");
    const checkout = join(cwd, "cstack");
    copyPlugin(checkout);
    mkdirSync(join(checkout, ".git"));
    writeFileSync(join(checkout, "unpushed-work.txt"), "My unpushed work.\n");
    const before = homeSnapshot(checkout);
    const result = spawnSync("sh", [from, "--hosts", "intent"], {
      cwd, env: { HOME: home, PATH: join(home, "bin"), XDG_DATA_HOME: value }, encoding: "utf8",
    });
    expect(result.status).toBe(0);
    expect(homeSnapshot(checkout)).toEqual(before);
    expect(packageContents(join(home, ".local/share/cstack"))).toEqual(packageContents(dirname(dirname(from))));
    expect(installRecord(home).entries).toContainEqual({ path: join(home, ".intent/skills/how"), kind: "link", target: join(home, ".local/share/cstack/skills/how") });
  });
});

test.each(["directory", "file", "dangling link"])("delivery refuses a live copy with a .git %s", (kind) => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const shell = join(dirname(from), "intent-deliver.sh");
    expect(install(home, shell).status).toBe(0);
    const checkout = join(home, ".local/share/cstack");
    const git = join(checkout, ".git");
    if (kind === "directory") mkdirSync(git);
    else if (kind === "file") writeFileSync(git, "gitdir: ../worktree\n");
    else symlinkSync(join(home, "missing-git"), git);
    writeFileSync(join(checkout, "unpushed-work.txt"), "My unpushed work.\n");
    const before = homeSnapshot(home);
    const result = install(home, shell);
    expect(result.status).toBe(2);
    expect(result.stderr).toContain(".git entry");
    expect(homeSnapshot(home)).toEqual(before);
    const table = commandRun(home, ["--hosts", "intent"], from);
    expect(table.status).toBe(1);
    expect(table.stdout + table.stderr).toContain(".git entry");
    expect(homeSnapshot(home)).toEqual(before);
  });
});

test.each(["", "."])("installer entry points refuse an empty or relative HOME (%s)", (value) => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const before = homeSnapshot(home);
    for (const command of [from, join(dirname(from), "intent-deliver.sh")]) {
      const result = spawnSync("sh", [command], { cwd: home, env: { HOME: value, PATH: join(home, "bin") }, encoding: "utf8" });
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toContain("HOME must be an absolute path");
      expect(homeSnapshot(home)).toEqual(before);
    }
  });
});

test("an interrupted competing install reports the staging folder and preserves both leftovers", () => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const shell = join(dirname(from), "intent-deliver.sh");
    expect(install(home, shell).status).toBe(0);
    const data = join(home, ".local/share/cstack");
    const competitor = join(home, "competitor.cjs");
    writeFileSync(competitor, `const fs = require('node:fs');
const rename = fs.renameSync;
fs.renameSync = function(a, b) {
  const result = rename.apply(this, arguments);
  if (a === ${JSON.stringify(data)}) process.kill(process.pid, 'SIGKILL');
  return result;
};
require('node:module').syncBuiltinESMExports();`);
    const preload = join(home, "competing.cjs");
    writeFileSync(preload, `const fs = require('node:fs');
const rename = fs.renameSync;
fs.renameSync = function(a, b) {
  if (a === ${JSON.stringify(data)}) {
    const other = require('node:child_process').spawnSync('sh', [${JSON.stringify(shell)}], {
      env: { ...process.env, NODE_OPTIONS: '--require ' + ${JSON.stringify(JSON.stringify(competitor))} }, encoding: 'utf8', timeout: 10000,
    });
    if (other.signal !== 'SIGKILL') throw new Error('The competing installer did not reach its interrupted swap: ' + other.stderr);
    fs.writeFileSync(${JSON.stringify(join(home, "left-staging.txt"))}, require('node:path').dirname(b));
  }
  return rename.apply(this, arguments);
};
require('node:module').syncBuiltinESMExports();`);
    const result = spawnSync("sh", [shell], {
      env: { HOME: home, PATH: join(home, "bin"), NODE_OPTIONS: "--require " + JSON.stringify(preload) }, encoding: "utf8", timeout: 20000,
    });
    expect(result.status).toBe(2);
    const staging = readFileSync(join(home, "left-staging.txt"), "utf8");
    expect(result.stderr).toContain("Another install may be running");
    expect(result.stderr).toContain(`Left temporary folder ${staging}`);
    expect(result.stderr).toContain("run the installer again");
    const parent = dirname(data);
    const leftovers = readdirSync(parent).filter((entry) => entry.startsWith(".cstack-install-")).sort();
    expect(leftovers).toHaveLength(2);
    const snapshots = leftovers.map((entry) => homeSnapshot(join(parent, entry)));
    expect(install(home, shell).status).toBe(0);
    expect(packageContents(data)).toEqual(packageContents(dirname(dirname(from))));
    expect(readdirSync(parent).filter((entry) => entry.startsWith(".cstack-install-")).sort()).toEqual(leftovers);
    expect(leftovers.map((entry) => homeSnapshot(join(parent, entry)))).toEqual(snapshots);
    expect(installRecord(home).entries).toContainEqual({ path: join(home, ".intent/skills/how"), kind: "link", target: join(data, "skills/how") });
  });
});

test.each(["live copy", "missing copy"])("delivery preserves an unrecorded sibling backup with %s", (state) => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const shell = join(dirname(from), "intent-deliver.sh");
    if (state === "live copy") expect(install(home, shell).status).toBe(0);
    const staging = join(home, ".local/share/.cstack-install-personal-backup");
    const previous = join(staging, "previous");
    copyPlugin(previous);
    writeFileSync(join(previous, "personal-notes.txt"), "My saved notes.\n");
    const before = homeSnapshot(staging);
    const result = install(home, shell);
    expect(result.status).toBe(0);
    expect(homeSnapshot(staging)).toEqual(before);
    expect(readFileSync(join(previous, "personal-notes.txt"), "utf8")).toBe("My saved notes.\n");
    expect(readFileSync(join(home, ".local/share/cstack/skills/how/SKILL.md"), "utf8")).toBe(readFileSync(join(dirname(dirname(from)), "skills/how/SKILL.md"), "utf8"));
  });
});

test("delivery ignores a planted swap journal that names a personal folder", () => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const parent = join(home, ".local/share");
    const staging = join(parent, ".cstack-install-personal");
    mkdirSync(join(staging, "copy"), { recursive: true });
    writeFileSync(join(staging, "copy/notes.txt"), "Private notes.\n");
    const journal = join(parent, ".cstack-swap.json");
    const content = JSON.stringify({ schemaVersion: 1, name: "cstack", data: join(parent, "cstack"), staging });
    writeFileSync(journal, content);
    const before = homeSnapshot(staging);
    const result = install(home, join(dirname(from), "intent-deliver.sh"));
    expect(result.status).toBe(0);
    expect(homeSnapshot(staging)).toEqual(before);
    expect(readFileSync(journal, "utf8")).toBe(content);
    expect(readFileSync(join(staging, "copy/notes.txt"), "utf8")).toBe("Private notes.\n");
  });
});

test("a sibling backup cannot supply ownership for an unrecorded host file", () => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const shell = join(dirname(from), "intent-deliver.sh");
    expect(install(home, shell).status).toBe(0);
    const parent = join(home, ".local/share");
    rmSync(join(parent, "cstack-install-record.json"));
    const staging = join(parent, ".cstack-install-backup");
    const previous = join(staging, "previous");
    mkdirSync(join(previous, "tools"), { recursive: true });
    cpSync(join(root, "tools/metadata.json"), join(previous, "tools/metadata.json"));
    const personal = join(home, ".intent/skills/personal-notes");
    writeFileSync(personal, "Personal host contents.\n", { mode: 0o644 });
    writeFileSync(join(previous, "install-record.json"), JSON.stringify({ schemaVersion: 1, modeRule: { location: "Intent's Settings, under Agent Behavior", status: "unchanged" }, entries: [{ path: personal, kind: "file", sha256: new Bun.CryptoHasher("sha256").update("Personal host contents.\n").digest("hex"), mode: 0o644 }] }));
    const before = homeSnapshot(staging);
    expect(install(home, shell).status).toBe(0);
    expect(readFileSync(personal, "utf8")).toBe("Personal host contents.\n");
    expect(homeSnapshot(staging)).toEqual(before);
    expect(installRecord(home).entries.some((entry: { path: string }) => entry.path === personal)).toBe(false);
  });
});

test("an unreadable record leaves a dropped skill link and reports its missing target on later runs", () => {
  withHome((home) => {
    const from = fetchedPackage(home);
    expect(commandRun(home, ["--hosts", "intent"], from).status).toBe(0);
    writeFileSync(join(home, ".local/share/cstack-install-record.json"), "broken json");
    rmSync(join(dirname(dirname(from)), "skills/how"), { recursive: true });
    const link = join(home, ".intent/skills/how");
    for (let run = 0; run < 2; run++) {
      const result = commandRun(home, ["--hosts", "intent"], from);
      expect(result.status).toBe(0);
      expect(readlinkSync(link)).toBe(join(home, ".local/share/cstack/skills/how"));
      expect(existsSync(link)).toBe(false);
      const row = result.stdout.split("\n").find((line) => line.startsWith("Intent ")) ?? "";
      expect(row).toContain(`kept ${link}: its link target is gone`);
      expect(row).not.toContain("left your own how");
    }
  });
});

function withHome(run: (home: string) => void): void {
  const home = realpathSync(mkdtempSync(join(tmpdir(), "intent home ")));
  try {
    fixturePath(home);
    run(home);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

function install(home: string, from = script) {
  return spawnSync("sh", [from], { env: { PATH: join(home, "bin"), HOME: home }, encoding: "utf8" });
}

function visibleSkills(): string[] {
  return readdirSync(join(root, "skills"))
    .filter((name) => existsSync(join(root, "skills", name, "SKILL.md")))
    .filter((name) => !/^disable-model-invocation: true$/m.test(readFileSync(join(root, "skills", name, "SKILL.md"), "utf8").split("\n---\n")[0] ?? ""))
    .sort();
}

test("links every visible skill into Intent, and leaves specialist setup alone", () => {
  withHome((home) => {
    const result = install(home);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);

    const skills = join(home, ".intent/skills");
    const linked = readdirSync(skills).sort();
    expect(linked).toEqual(visibleSkills());
    expect(linked).toContain("cstack-mode");
    expect(linked).not.toContain("principle-laziness-protocol");
    expect(readlinkSync(join(skills, "cstack-mode"))).toBe(join(root, "skills/cstack-mode"));
    expect(readFileSync(join(skills, "setup/SKILL.md"), "utf8")).toBe(readFileSync(join(root, "skills/setup/SKILL.md"), "utf8"));

    const specialists = join(home, ".intent/specialists");
    expect(existsSync(specialists)).toBe(false);

    const rerun = install(home);
    expect(rerun.status).toBe(0);
    expect(rerun.stdout).toContain("Left the cstack-mode rule unchanged in Intent's Settings");
  });
});

test("a missing record preserves unrecorded retired links and the person's own entries", () => {
  withHome((home) => {
    const skills = join(home, ".intent/skills");
    mkdirSync(join(skills, "align"), { recursive: true });
    symlinkSync(join(root, "skills/retired"), join(skills, "retired"));
    symlinkSync(join(root, "skills/principle-laziness-protocol"), join(skills, "principle-laziness-protocol"));
    mkdirSync(join(home, "elsewhere/how"), { recursive: true });
    symlinkSync(join(home, "elsewhere/how"), join(skills, "how"));

    const result = install(home);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Installation record missing. No host entries were removed.");
    expect(readlinkSync(join(skills, "principle-laziness-protocol"))).toBe(join(root, "skills/principle-laziness-protocol"));
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("left your own align as it is\n");
    expect(result.stdout).toContain("left your own how as it is\n");

    const linked = readdirSync(skills);
    expect(linked).toContain("retired");
    expect(linked).toContain("principle-laziness-protocol");
    expect(readdirSync(join(skills, "align"))).toEqual([]);
    expect(readlinkSync(join(skills, "how"))).toBe(join(home, "elsewhere/how"));
    expect(readlinkSync(join(skills, "cstack-mode"))).toBe(join(root, "skills/cstack-mode"));
  });
});

test("follows a link to the script back to its checkout", () => {
  withHome((home) => {
    mkdirSync(join(home, "bin"), { recursive: true });
    symlinkSync(script, join(home, "bin/intent-install"));

    const result = install(home, join(home, "bin/intent-install"));
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(readlinkSync(join(home, ".intent/skills/cstack-mode"))).toBe(join(root, "skills/cstack-mode"));
  });
});

function copyPlugin(to: string): void {
  for (const entry of ["agents", "hooks", "skills", "tools"]) {
    cpSync(join(root, entry), join(to, entry), { recursive: true, filter: (source) => !source.includes("node_modules") });
  }
}

function npxInstall(home: string, cache: string) {
  const bin = join(cache, "node_modules/.bin");
  mkdirSync(bin, { recursive: true });
  if (!existsSync(join(bin, "cstack-intent"))) symlinkSync("../cstack/hooks/intent-deliver.sh", join(bin, "cstack-intent"));
  return install(home, join(bin, "cstack-intent"));
}

test("run by npx, it links to its own copy, which outlives npx's cache and follows each update", () => {
  withHome((home) => {
    const copy = join(realpathSync(home), ".local/share/cstack");
    const skills = join(home, ".intent/skills");
    const first = join(home, "npx/first");
    copyPlugin(join(first, "node_modules/cstack"));

    const result = npxInstall(home, first);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`copied the plugin to ${copy}`);
    expect(readlinkSync(join(skills, "cstack-mode"))).toBe(join(copy, "skills/cstack-mode"));
    expect(existsSync(join(home, ".intent/specialists"))).toBe(false);
    rmSync(first, { recursive: true });
    expect(readFileSync(join(skills, "setup/SKILL.md"), "utf8")).toBe(readFileSync(join(root, "skills/setup/SKILL.md"), "utf8"));

    const update = join(home, "npx/update");
    copyPlugin(join(update, "node_modules/cstack"));
    rmSync(join(update, "node_modules/cstack/skills/how"), { recursive: true });
    const updated = npxInstall(home, update);
    expect(updated.status).toBe(0);
    expect(updated.stdout).toContain(`removed ${join(skills, "how")}\n`);
    expect(readdirSync(skills).sort()).toEqual(visibleSkills().filter((name) => name !== "how"));
  });
});

test("run by npx, it leaves a folder of the person's own where its copy would go", () => {
  withHome((home) => {
    const mine = join(home, ".local/share/cstack");
    mkdirSync(mine, { recursive: true });
    const cache = join(home, "npx");
    copyPlugin(join(cache, "node_modules/cstack"));

    const result = npxInstall(home, cache);
    expect(result.status).toBe(2);
    expect(result.stderr).toBe(`kept ${mine}: it is not a copy of this plugin\n`);
    expect(readdirSync(mine)).toEqual([]);
    expect(existsSync(join(home, ".intent"))).toBe(false);
  });
});

test("a checkout reached through an alias, then moved, keeps working links", () => {
  withHome((home) => {
    const checkout = join(home, "plugin checkout");
    copyPlugin(checkout);
    mkdirSync(join(checkout, ".git"));
    symlinkSync(checkout, join(home, "alias"));
    expect(install(home, join(home, "alias/hooks/intent-deliver.sh")).status).toBe(0);

    const skills = join(home, ".intent/skills");
    expect(readlinkSync(join(skills, "cstack-mode"))).toBe(join(realpathSync(checkout), "skills/cstack-mode"));
    const again = install(home, join(checkout, "hooks/intent-deliver.sh"));
    expect(again.status).toBe(0);
    expect(again.stdout).toContain("Left the cstack-mode rule unchanged in Intent's Settings");

    const moved = join(home, "moved checkout");
    renameSync(checkout, moved);
    const afterMove = install(home, join(moved, "hooks/intent-deliver.sh"));
    expect(afterMove.stderr).toBe("");
    expect(afterMove.status).toBe(0);
    expect(readlinkSync(join(skills, "cstack-mode"))).toBe(join(realpathSync(moved), "skills/cstack-mode"));
    expect(existsSync(join(home, ".intent/specialists"))).toBe(false);
    expect(readdirSync(skills).sort()).toEqual(visibleSkills());
  });
});

test("the first install turns the mode on through Intent's personal rule, and an update leaves the rule alone", () => {
  withHome((home) => {
    const bin = join(home, "bin");
    mkdirSync(bin, { recursive: true });
    writeFileSync(join(bin, "intentd"), `#!/bin/sh
case "$2" in
  rules.get) printf '{"enabled":false,"content":"","updatedAt":0}' ;;
  rules.update) printf '%s\\n' "$4" >> "${join(home, "updates")}"; printf '{}' ;;
esac
case "$1" in settings) echo 'git.autoCommit = false' ;; esac
`, { mode: 0o755 });
    const run = () => spawnSync("sh", [script], { env: { PATH: bin, HOME: home }, encoding: "utf8" });

    expect(run().stdout).toContain("added the cstack-mode rule in Intent's Settings, under Agent Behavior, at the top of your personal rule text.");
    const update = JSON.parse(readFileSync(join(home, "updates"), "utf8"));
    expect(update).toEqual({
      workspaceId: "global",
      ruleType: "workspace",
      enabled: true,
      content: "Before any other step, read the `cstack-mode` skill's SKILL.md from your skills list and follow it for the rest of the session.",
    });

    expect(run().stdout).toContain("Left the cstack-mode rule unchanged in Intent's Settings");
    expect(readFileSync(join(home, "updates"), "utf8").trim().split("\n")).toHaveLength(1);
  });
});

function fixturePath(home: string): string {
  const bin = join(home, "bin");
  mkdirSync(bin, { recursive: true });
  if (!existsSync(join(bin, "node"))) {
    const located = spawnSync("which", ["node"], { encoding: "utf8" });
    if (located.status !== 0) throw new Error("The install tests need Node on PATH.");
    symlinkSync(located.stdout.trim(), join(bin, "node"));
    for (const utility of ["sh", "sed", "head", "awk", "dirname", "basename", "cp", "mkdir", "rm", "ln", "readlink", "mv", "find", "grep"]) {
      symlinkSync(spawnSync("which", [utility], { encoding: "utf8" }).stdout.trim(), join(bin, utility));
    }
    writeFileSync(join(bin, "intentd"), '#!/bin/sh\ncase "$2" in rules.get) printf \'{"content":"cstack-mode","enabled":true}\' ;; esac\n', { mode: 0o755 });
  }
  return bin;
}

function hosts(home: string, options: { claude?: boolean; codex?: "git" | "local"; fail?: string; cursorMarket?: boolean } = {}) {
  const bin = fixturePath(home);
  const state = {
    claude: options.claude ? [{ id: "cstack@cstack", version: "1.0.0", scope: "user" }] : [],
    codex: options.codex ? [{ name: "cstack", pluginId: "cstack@cstack", marketplaceName: "cstack", version: "2.0.0", marketplaceSource: { sourceType: options.codex, source: join(home, "old folder") } }] : [],
    markets: options.codex ? [{ name: "cstack", marketplaceSource: { sourceType: options.codex, source: "configured" } }] : [],
  };
  writeFileSync(join(home, "state.json"), JSON.stringify(state));
  const standIn = [
    "#!/usr/bin/env node",
    "import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';",
    "import { basename, join } from 'node:path';",
    "const home = process.env.HOME;",
    "const file = join(home, 'state.json');",
    "const state = JSON.parse(readFileSync(file, 'utf8'));",
    "const host = basename(process.argv[1]);",
    "const args = process.argv.slice(2);",
    "appendFileSync(join(home, 'commands.jsonl'), JSON.stringify([host,...args])+'\\n');",
    "if (host+' '+args.join(' ') === " + JSON.stringify(options.fail ?? "") + ") { console.error('fixture failure'); process.exit(1); }",
    "let result = {};",
    "if (host === 'cursor-agent') result = args[2] === 'list' ? " + JSON.stringify(options.cursorMarket ? [{name:"cstack",gitUrl:"https://github.com/example/toolkit.git"}] : []) + " : {};",
    "if (host === 'claude') {",
    "  if (args[1] === 'list') result = state.claude;",
    "  else if (args[1] === 'update' || args[1] === 'install') state.claude = [{id:'cstack@cstack',version:'9.0.0',scope:'user'}];",
    "} else if (host === 'codex') {",
    "  if (args[1] === 'list') result = {installed:state.codex};",
    "  else if (args[2] === 'list') result = {marketplaces:state.markets};",
    "  else if (args[2] === 'remove') state.markets = [];",
    "  else if (args[2] === 'add') state.markets = [{name:'cstack',marketplaceSource:{sourceType:'git',source:args[3]}}];",
    "  else if (args[1] === 'add') state.codex = [{name:'cstack',pluginId:'cstack@cstack',marketplaceName:'cstack',version:'9.0.0',marketplaceSource:{sourceType:'git',source:'configured'}}];",
    "}",
    "writeFileSync(file,JSON.stringify(state));",
    "if (host === 'claude' && (args[1] === 'update' || args[1] === 'install')) { try { const registry = join(home, '.claude/plugins/installed_plugins.json'); const value = JSON.parse(readFileSync(registry, 'utf8')); value.plugins['cstack@cstack'][0].version = '9.0.0'; writeFileSync(registry, JSON.stringify(value)); } catch {} }",
    "console.log(JSON.stringify(result));",
  ].join("\n");
  writeFileSync(join(bin, "host.mjs"), standIn, { mode: 0o755 });
  for (const host of ["claude", "codex", "cursor-agent"]) symlinkSync("host.mjs", join(bin, host));
  return { PATH: bin, HOME: home };
}

const entry = join(root, "hooks/intent-install.sh");

function commandRun(home: string, args: string[] = [], from = entry) {
  return spawnSync("sh", [from, ...args], { env: { PATH: join(home, "bin"), HOME: home }, encoding: "utf8", timeout: 20000 });
}

function mutations(home: string): string[][] {
  const file = join(home, "commands.jsonl");
  if (!existsSync(file)) return [];
  const calls: string[][] = readFileSync(file, "utf8").trim().split("\n").map((line) => JSON.parse(line));
  return calls.filter((args) => !args.includes("list"));
}

function fetchedPackage(home: string): string {
  const cache = join(home, "npx/cache");
  copyPlugin(join(cache, "node_modules/cstack"));
  writeFileSync(join(cache, "package-lock.json"), JSON.stringify({ packages: {
    "": { dependencies: { cstack: "github:example/toolkit" } },
    "node_modules/cstack": { resolved: "git+ssh://git@github.com/example/toolkit.git#0123456789012345678901234567890123456789" },
  } }));
  return join(cache, "node_modules/cstack/hooks/intent-install.sh");
}

test("the public command reports all hosts without running an update", () => {
  withHome((home) => {
    hosts(home, { claude: true, codex: "git" });
    const result = commandRun(home, ["--report-only"]);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Report only. No install, update, or move was run.");
    expect(result.stdout).toMatch(/Claude Code\s+yes\s+yes\s+1.0.0\s+1.0.0/);
    expect(result.stdout).toMatch(/Codex\s+yes\s+yes\s+2.0.0\s+2.0.0/);
    expect(result.stdout).toContain("Intent");
    expect(result.stdout).toContain("Cursor");
    expect(result.stdout).toContain("Would run");
    expect(mutations(home)).toEqual([]);
  });
});

test.each(["public", "internal"])("report-only blocks Intent writes through public and internal entry paths (%s)", (route) => {
  withHome((home) => {
    hosts(home);
    const from = fetchedPackage(home);
    writeFileSync(join(home, "bin/intentd"), `#!/bin/sh
case "$2" in
  rules.get) printf '{"enabled":false,"content":""}' ;;
  rules.update) printf '%s\\n' "$4" > "${join(home, "rule-update")}"; printf '{}' ;;
esac
`, { mode: 0o755 });
    const args = route === "internal" ? ["--deliver-intent-source", "github:example/toolkit"] : ["--hosts", "intent"];
    const preview = commandRun(home, ["--report-only", ...args], from);
    expect(preview.status).toBe(route === "internal" ? 2 : 0);
    if (route === "internal") expect(preview.stderr).toContain("Report-only cannot install, update, move, or deliver the plugin.");
    else expect(preview.stdout).toContain("Report only. No install, update, or move was run.");
    expect(existsSync(join(home, ".local/share/cstack"))).toBe(false);
    expect(existsSync(join(home, ".intent/skills"))).toBe(false);
    expect(existsSync(join(home, ".intent/specialists"))).toBe(false);
    expect(existsSync(join(home, "rule-update"))).toBe(false);
    const delivery = commandRun(home, args, from);
    expect(delivery.status).toBe(0);
    expect(readFileSync(join(home, ".intent/skills/cstack-mode/SKILL.md"), "utf8")).toBe(readFileSync(join(root, "skills/cstack-mode/SKILL.md"), "utf8"));
    expect(JSON.parse(readFileSync(join(home, "rule-update"), "utf8"))).toEqual({
      workspaceId: "global",
      ruleType: "workspace",
      enabled: true,
      content: "Before any other step, read the `cstack-mode` skill's SKILL.md from your skills list and follow it for the rest of the session.",
    });
  });
}, 15000);

test("without a terminal or with --yes, only installed hosts update through their configured sources", () => {
  for (const args of [[], ["--yes"]]) withHome((home) => {
    hosts(home, { claude: true, codex: "git" });
    const result = commandRun(home, args);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Claude Code\s+yes\s+yes\s+1.0.0\s+9.0.0/);
    expect(result.stdout).toMatch(/Codex\s+yes\s+yes\s+2.0.0\s+9.0.0/);
    expect(mutations(home)).toEqual([
      ["claude", "plugin", "update", "cstack@cstack", "--scope", "user"],
      ["codex", "plugin", "marketplace", "upgrade", "cstack"],
      ["codex", "plugin", "add", "cstack@cstack"],
    ]);
    expect(existsSync(join(home, ".intent"))).toBe(false);
  });
});

test("the host selection flag installs fresh copies from the npx Git source", () => {
  withHome((home) => {
    hosts(home);
    const result = commandRun(home, ["--hosts", "claude,codex"], fetchedPackage(home));
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("GitHub source github:example/toolkit from npx package-lock.json.");
    expect(mutations(home)).toEqual([
      ["claude", "plugin", "marketplace", "add", "https://github.com/example/toolkit.git"],
      ["claude", "plugin", "install", "cstack@cstack", "--scope", "user"],
      ["codex", "plugin", "marketplace", "add", "example/toolkit"],
      ["codex", "plugin", "add", "cstack@cstack"],
    ]);
    expect(result.stdout).toMatch(/Claude Code\s+yes\s+yes\s+-\s+9.0.0/);
    expect(result.stdout).toMatch(/Codex\s+yes\s+yes\s+-\s+9.0.0/);
  });
});

test("--source wins over npx metadata when Codex moves off a local folder", () => {
  withHome((home) => {
    hosts(home, { codex: "local" });
    const result = commandRun(home, ["--yes", "--source", "other/fork"], fetchedPackage(home));
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Moving Codex from its local folder to the GitHub source before updating.");
    expect(mutations(home)).toEqual([
      ["codex", "plugin", "marketplace", "remove", "cstack"],
      ["codex", "plugin", "marketplace", "add", "other/fork"],
      ["codex", "plugin", "add", "cstack@cstack"],
    ]);
    expect(result.stdout).toMatch(/Codex\s+yes\s+yes\s+2.0.0\s+9.0.0/);
  });
});

test("a failing host leaves its retry command and the other hosts still update", () => {
  withHome((home) => {
    hosts(home, { claude: true, codex: "git", fail: "claude plugin update cstack@cstack --scope user" });
    const result = commandRun(home, ["--yes"]);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("fixture failure");
    expect(result.stdout).toMatch(/Retry with .*claude'? plugin update cstack@cstack --scope user\./);
    expect(result.stdout).toMatch(/Claude Code\s+yes\s+yes\s+1.0.0\s+1.0.0/);
    expect(result.stdout).toMatch(/Codex\s+yes\s+yes\s+2.0.0\s+9.0.0/);
    expect(mutations(home)).toEqual([
      ["claude", "plugin", "update", "cstack@cstack", "--scope", "user"],
      ["codex", "plugin", "marketplace", "upgrade", "cstack"],
      ["codex", "plugin", "add", "cstack@cstack"],
    ]);
  });
});

test("without a Git source, local migration gives a command while other updates continue", () => {
  withHome((home) => {
    hosts(home, { claude: true, codex: "local" });
    const result = commandRun(home, ["--hosts", "intent,claude,codex,cursor"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("npx --yes github:OWNER/REPO --hosts intent");
    expect(result.stdout).toContain("npx --yes github:OWNER/REPO --hosts codex");
    expect(result.stdout).toContain("Open Cursor Customize, find cstack, and select Install or update.");
    expect(mutations(home)).toEqual([["claude", "plugin", "update", "cstack@cstack", "--scope", "user"]]);
    expect(result.stdout).toMatch(/Claude Code\s+yes\s+yes\s+1.0.0\s+9.0.0/);
  });
});

test("npx delivery leaves a person's own specialist intact and succeeds with that result in the table", () => {
  withHome((home) => {
    hosts(home);
    const specialists = join(home, ".intent/specialists");
    mkdirSync(specialists, { recursive: true });
    writeFileSync(join(specialists, "cstack-agent.md"), "My provider and model.\n");
    const result = commandRun(home, ["--hosts", "intent"], fetchedPackage(home));
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("left your own cstack-agent.md as it is");
    expect(result.stdout).toContain("Nothing is needed for your own files.");
    expect(result.stdout.indexOf("left your own")).toBeGreaterThan(result.stdout.indexOf("Host"));
    expect(readFileSync(join(specialists, "cstack-agent.md"), "utf8")).toBe("My provider and model.\n");
    expect(readdirSync(specialists)).toEqual(["cstack-agent.md"]);
    expect(readFileSync(join(home, ".intent/skills/cstack-mode/SKILL.md"), "utf8")).toBe(readFileSync(join(root, "skills/cstack-mode/SKILL.md"), "utf8"));
  });
});

const terminalDriver = [
  "import os, pty, select, subprocess, sys, time",
  "master, slave = pty.openpty()",
  "p = subprocess.Popen(['sh', sys.argv[1]], stdin=slave, stdout=slave, stderr=slave, close_fds=True)",
  "os.close(slave)",
  "output = b''",
  "sent = False",
  "deadline = time.monotonic() + 10",
  "try:",
  "    while time.monotonic() < deadline:",
  "        ready, _, _ = select.select([master], [], [], 0.1)",
  "        if ready:",
  "            try:",
  "                chunk = os.read(master, 65536)",
  "            except OSError:",
  "                break",
  "            if not chunk:",
  "                break",
  "            output += chunk",
  "            if not sent and b'Enter a comma-separated list or none:' in output:",
  "                os.write(master, b'\\n')",
  "                sent = True",
  "        if p.poll() is not None and not ready:",
  "            break",
  "    sys.stdout.write(output.decode())",
  "    if not sent:",
  "        sys.exit(3)",
  "    sys.exit(p.wait(timeout=2))",
  "finally:",
  "    if p.poll() is None:",
  "        p.kill()",
  "        p.wait()",
  "    os.close(master)",
].join("\n");

test("the terminal question selects installed hosts by default", () => {
  withHome((home) => {
    const env = hosts(home, { claude: true });
    const result = spawnSync("/usr/bin/python3", ["-c", terminalDriver, entry], { env, encoding: "utf8", timeout: 15000 });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Hosts to install or update [claude]");
    expect(mutations(home)).toEqual([["claude", "plugin", "update", "cstack@cstack", "--scope", "user"]]);
    expect(result.stdout).toMatch(/Claude Code\s+yes\s+yes\s+1.0.0\s+9.0.0/);
  });
});

test("Cursor refreshes its marketplace and a shared Claude import updates once", () => {
  withHome((home) => {
    hosts(home, { claude: true, cursorMarket: true });
    mkdirSync(join(home, ".claude/plugins"), { recursive: true });
    writeFileSync(join(home, ".claude/settings.json"), JSON.stringify({ enabledPlugins: { "cstack@cstack": true } }));
    writeFileSync(join(home, ".claude/plugins/installed_plugins.json"), JSON.stringify({ plugins: {
      "cstack@cstack": [{ scope: "user", version: "1.0.0", installPath: join(home, "provider-copy") }],
    } }));
    const result = commandRun(home, ["--yes"]);
    expect(result.status).toBe(0);
    expect(mutations(home)).toEqual([
      ["claude", "plugin", "update", "cstack@cstack", "--scope", "user"],
      ["cursor-agent", "plugin", "marketplace", "update", "cstack"],
    ]);
    expect(result.stdout).toContain("1.0.0 (Claude import)");
    expect(result.stdout).toContain("9.0.0 (Claude import)");
    expect(result.stdout).toContain("Native installation and version are unknown.");
    expect(result.stdout).toContain("Open Cursor Customize");
  });
});

test.each(["missing", "malformed", "null", "[]", '{"packages":[]}', '{"packages":{"":{"dependencies":{"cstack":{"url":"github:example/toolkit"}}},"node_modules/cstack":{"resolved":["github:example/toolkit"]}}}'])("unavailable npx source metadata keeps provider updates and no-source actions (%s)", (lock) => {
  withHome((home) => {
    hosts(home, { claude: true });
    const from = fetchedPackage(home);
    const file = join(home, "npx/cache/package-lock.json");
    if (lock === "missing") rmSync(file);
    else writeFileSync(file, lock === "malformed" ? "not JSON" : lock);
    const result = commandRun(home, ["--hosts", "intent,claude,codex"], from);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("No GitHub source supplied.");
    expect(result.stdout).toContain("npx --yes github:OWNER/REPO --hosts intent");
    expect(result.stdout).toContain("npx --yes github:OWNER/REPO --hosts codex");
    expect(result.stdout).toMatch(/Claude Code\s+yes\s+yes\s+1.0.0\s+9.0.0/);
    expect(mutations(home)).toEqual([["claude", "plugin", "update", "cstack@cstack", "--scope", "user"]]);
  });
});

test("help reads no host and an inspection failure still lets another provider update", () => {
  withHome((home) => {
    hosts(home, { claude: true, codex: "git", fail: "claude plugin list --json" });
    const help = commandRun(home, ["--help"]);
    expect(help.status).toBe(0);
    expect(help.stdout).toContain("Usage: cstack-intent [options]");
    expect(help.stdout).toContain("--report-only");
    expect(existsSync(join(home, "commands.jsonl"))).toBe(false);
    const run = commandRun(home, ["--yes"]);
    expect(run.status).toBe(1);
    expect(run.stdout).toContain("Could not inspect.");
    expect(run.stdout).toMatch(/Codex\s+yes\s+yes\s+2.0.0\s+9.0.0/);
    expect(mutations(home)).toEqual([
      ["codex", "plugin", "marketplace", "upgrade", "cstack"],
      ["codex", "plugin", "add", "cstack@cstack"],
    ]);
  });
});

test("one local Codex copy without a source does not hold back its Git copy", () => {
  withHome((home) => {
    hosts(home, { codex: "local" });
    const path = join(home, "state.json");
    const state = JSON.parse(readFileSync(path, "utf8"));
    state.codex.push({ name: "cstack", pluginId: "cstack@remote", marketplaceName: "remote", version: "3.0.0", marketplaceSource: { sourceType: "git", source: "https://github.com/example/toolkit.git" } });
    writeFileSync(path, JSON.stringify(state));
    const result = commandRun(home, ["--yes"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("move cstack@cstack from its local folder to GitHub");
    expect(result.stdout).toContain("2.0.0, 3.0.0");
    expect(mutations(home)).toEqual([
      ["codex", "plugin", "marketplace", "upgrade", "remote"],
      ["codex", "plugin", "add", "cstack@remote"],
    ]);
  });
});

test.each(["inspection", "update"])("a termination-resistant host times out, cleans up its child, and continues (%s)", (phase) => {
  withHome((home) => {
    hosts(home, { codex: "git" });
    rmSync(join(home, "bin/claude"));
    writeFileSync(join(home, "bin/claude"), [
      "#!/usr/bin/env node",
      "const fs = require('node:fs'); const { spawn } = require('node:child_process');",
      "if (" + JSON.stringify(phase) + " === 'update' && process.argv[3] === 'list') { console.log('[{\"id\":\"cstack@cstack\",\"scope\":\"user\",\"version\":\"1.0.0\"}]'); process.exit(0); }",
      "fs.writeFileSync(process.env.HOME+'/hung-pid', String(process.pid));",
      "const child = spawn(process.execPath, ['-e', \"process.on('SIGTERM', () => {}); setInterval(() => {}, 1000);\"], {stdio:'inherit'});",
      "fs.writeFileSync(process.env.HOME+'/descendant-pid', String(child.pid));",
      "process.on('SIGTERM', () => {});",
      "console.log('waiting for the fixture service');",
      "setInterval(() => {}, 1000);",
    ].join("\n"), { mode: 0o755 });
    try {
      const result = spawnSync("sh", [entry, "--hosts", "claude,codex", "--timeout-ms", "500"], {
        env: { PATH: join(home, "bin"), HOME: home }, encoding: "utf8", timeout: 4000, killSignal: "SIGKILL",
      });
      expect(result.status).toBe(1);
      expect(result.stdout).toContain("timed out");
      expect(result.stdout).toContain("waiting for the fixture service");
      expect(result.stdout).toContain(phase === "inspection" ? "plugin list --json" : "plugin update cstack@cstack --scope user");
      expect(result.stdout).toMatch(phase === "inspection" ? /Retry with .*claude'? plugin list --json\./ : /Retry with .*claude'? plugin update cstack@cstack --scope user\./);
      expect(result.stdout).toMatch(/Codex\s+yes\s+yes\s+2.0.0\s+9.0.0/);
      expect(mutations(home)).toEqual([
        ["codex", "plugin", "marketplace", "upgrade", "cstack"],
        ["codex", "plugin", "add", "cstack@cstack"],
      ]);
      for (const file of ["hung-pid", "descendant-pid"]) {
        const pid = Number(readFileSync(join(home, file), "utf8"));
        let stopped = false;
        try {
          process.kill(pid, 0);
          const stat = `/proc/${pid}/stat`;
          stopped = existsSync(stat) && /^.*\) Z /.test(readFileSync(stat, "utf8"));
        } catch { stopped = true; }
        expect(stopped).toBe(true);
      }
    } finally {
      for (const file of ["hung-pid", "descendant-pid"]) {
        const pidFile = join(home, file);
        if (existsSync(pidFile)) { try { process.kill(Number(readFileSync(pidFile, "utf8")), "SIGKILL"); } catch {} }
      }
    }
  });
});

test("a failing host retains its stdout and stderr in the final table", () => {
  withHome((home) => {
    hosts(home, { codex: "git" });
    rmSync(join(home, "bin/claude"));
    writeFileSync(join(home, "bin/claude"), `#!/bin/sh
if [ "$2" = list ]; then
  printf '[{"id":"cstack@cstack","scope":"user","version":"1.0.0"}]'
else
  echo 'Failure detail on stdout'
  echo 'Failure detail on stderr' >&2
  exit 7
fi
`, { mode: 0o755 });
    const result = commandRun(home, ["--yes"]);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("Failure detail on stdout");
    expect(result.stdout).toContain("Failure detail on stderr");
    expect(result.stdout.indexOf("Failure detail")).toBeGreaterThan(result.stdout.indexOf("Host"));
    expect(result.stdout).toMatch(/Codex\s+yes\s+yes\s+2.0.0\s+9.0.0/);
  });
});

function intentFetch(home: string, lock: "valid" | "missing" | "unchanged") {
  const from = fetchedPackage(home);
  const packageRoot = resolve(from, "../..");
  const metadata = JSON.parse(readFileSync(join(packageRoot, "tools/metadata.json"), "utf8"));
  writeFileSync(join(packageRoot, "tools/metadata.json"), JSON.stringify({ ...metadata, version: "1.5.0" }, null, 2));
  if (lock === "missing") rmSync(join(home, "npx/cache/package-lock.json"));
  if (lock === "unchanged") {
    writeFileSync(join(packageRoot, "hooks/intent-deliver.sh"), "#!/bin/sh\nleft='left your own cstack-agent.md as it is'\nprintf '%s\\n' \"$left\"\n");
  }
  writeFileSync(join(home, "bin/npx"), `#!/bin/sh
printf '%s\\n' "$*" >> "$HOME/fetch-calls"
shift 3
exec sh '${from}' "$@"
`, { mode: 0o755 });
}

test("an explicit Intent source preserves personal files and rule actions in the outer table", () => {
  withHome((home) => {
    hosts(home);
    intentFetch(home, "valid");
    const specialists = join(home, ".intent/specialists");
    mkdirSync(specialists, { recursive: true });
    writeFileSync(join(specialists, "cstack-agent.md"), "My specialist.\n");
    writeFileSync(join(home, "bin/intentd"), `#!/bin/sh\nprintf '{"enabled":false,"content":"a disabled personal rule"}'\n`, { mode: 0o755 });
    const result = commandRun(home, ["--hosts", "intent", "--source", "other/fork"]);
    expect(result.status).toBe(0);
    const intent = result.stdout.split("\n").find((line) => /^Intent\s/.test(line));
    expect(intent).toContain("Updated.");
    expect(intent).toContain("left your own cstack-agent.md as it is");
    expect(intent).toContain("Nothing is needed for your own files.");
    expect(intent).toContain("To keep the mode on, paste this into Intent's Settings");
    expect(intent).toContain("Before any other step");
    expect(readFileSync(join(specialists, "cstack-agent.md"), "utf8")).toBe("My specialist.\n");
    expect(readFileSync(join(home, "fetch-calls"), "utf8").trim().split("\n")).toHaveLength(1);
  });
});

test("an explicit Intent source delivers without another package lockfile", () => {
  withHome((home) => {
    hosts(home);
    intentFetch(home, "missing");
    const result = commandRun(home, ["--hosts", "intent", "--source", "other/fork"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Intent\s+yes\s+yes\s+-\s+1.5.0\s+Updated/);
    expect(readFileSync(join(home, ".intent/skills/cstack-mode/SKILL.md"), "utf8")).toBe(readFileSync(join(root, "skills/cstack-mode/SKILL.md"), "utf8"));
    expect(readFileSync(join(home, "fetch-calls"), "utf8").trim().split("\n")).toHaveLength(1);
  });
});

test("Intent reports unchanged delivery and its preserved files without claiming an update", () => {
  withHome((home) => {
    hosts(home);
    intentFetch(home, "unchanged");
    const result = commandRun(home, ["--hosts", "intent", "--source", "other/fork"]);
    expect(result.status).toBe(0);
    const intent = result.stdout.split("\n").find((line) => /^Intent\s/.test(line));
    expect(intent).toContain("No files changed.");
    expect(intent).not.toContain("Updated.");
    expect(intent).toContain("left your own cstack-agent.md as it is");
    expect(intent).not.toContain("Start a new Intent agent");
  });
});

test.each(["success", "first project fails"])("Claude project copies keep their directories and a shared user copy updates once (%s)", (scenario) => {
  const failFirst = scenario === "first project fails";
  withHome((home) => {
    hosts(home, { cursorMarket: true });
    const projectA = join(home, "project A");
    const projectB = join(home, "project B");
    mkdirSync(projectA);
    mkdirSync(projectB);
    writeFileSync(join(home, "copies.json"), JSON.stringify([
      { id: "cstack@cstack", scope: "project", projectPath: projectA, version: "1.0.0" },
      { id: "cstack@cstack", scope: "project", projectPath: projectB, version: "2.0.0" },
      { id: "cstack@cstack", scope: "user", version: "3.0.0" },
    ]));
    mkdirSync(join(home, ".claude/plugins"), { recursive: true });
    writeFileSync(join(home, ".claude/settings.json"), JSON.stringify({ enabledPlugins: { "cstack@cstack": true } }));
    writeFileSync(join(home, ".claude/plugins/installed_plugins.json"), JSON.stringify({ plugins: {
      "cstack@cstack": [{ scope: "user", version: "3.0.0", installPath: join(home, "provider-copy") }],
    } }));
    rmSync(join(home, "bin/claude"));
    writeFileSync(join(home, "bin/claude"), [
      "#!/usr/bin/env node",
      "const fs = require('node:fs'); const path = require('node:path');",
      "const home = process.env.HOME; const args = process.argv.slice(2);",
      "const file = path.join(home, 'copies.json'); const copies = JSON.parse(fs.readFileSync(file));",
      "if (args[1] === 'list') console.log(JSON.stringify(copies));",
      "else {",
      "  fs.appendFileSync(path.join(home, 'project-calls'), JSON.stringify({args,cwd:process.cwd()})+'\\n');",
      "  const scope = args[args.indexOf('--scope')+1];",
      "  if (" + JSON.stringify(failFirst) + " && scope === 'project' && process.cwd() === " + JSON.stringify(realpathSync(projectA)) + ") { console.log('first project failed'); process.exit(7); }",
      "  for (const copy of copies) if (copy.scope === scope && (scope === 'user' || fs.realpathSync(copy.projectPath) === process.cwd())) copy.version = '9.0.0';",
      "  fs.writeFileSync(file, JSON.stringify(copies));",
      "  if (scope === 'user') { const registry = path.join(home, '.claude/plugins/installed_plugins.json'); const state = JSON.parse(fs.readFileSync(registry)); state.plugins['cstack@cstack'][0].version = '9.0.0'; fs.writeFileSync(registry, JSON.stringify(state)); }",
      "  console.log('updated');",
      "}",
    ].join("\n"), { mode: 0o755 });
    const result = commandRun(home, ["--hosts", "claude,cursor"]);
    expect(result.status).toBe(failFirst ? 1 : 0);
    expect(JSON.parse(readFileSync(join(home, "copies.json"), "utf8"))).toEqual([
      { id: "cstack@cstack", scope: "project", projectPath: projectA, version: failFirst ? "1.0.0" : "9.0.0" },
      { id: "cstack@cstack", scope: "project", projectPath: projectB, version: "9.0.0" },
      { id: "cstack@cstack", scope: "user", version: "9.0.0" },
    ]);
    const calls = readFileSync(join(home, "project-calls"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
    expect(calls).toEqual([
      { args: ["plugin", "update", "cstack@cstack", "--scope", "project"], cwd: realpathSync(projectA) },
      { args: ["plugin", "update", "cstack@cstack", "--scope", "project"], cwd: realpathSync(projectB) },
      { args: ["plugin", "update", "cstack@cstack", "--scope", "user"], cwd: process.cwd() },
    ]);
    expect(result.stdout).toMatch(failFirst ? /Claude Code\s+yes\s+yes\s+1.0.0, 2.0.0, 3.0.0\s+1.0.0, 9.0.0, 9.0.0/ : /Claude Code\s+yes\s+yes\s+1.0.0, 2.0.0, 3.0.0\s+9.0.0, 9.0.0, 9.0.0/);
    if (failFirst) expect(result.stdout).toContain("first project failed");
    expect(result.stdout).toMatch(/Cursor\s+yes\s+yes\s+3.0.0 \(Claude import\)\s+9.0.0 \(Claude import\)/);
  });
});


function sharedImport(home: string) {
  mkdirSync(join(home, ".claude/plugins"), { recursive: true });
  writeFileSync(join(home, ".claude/settings.json"), JSON.stringify({ enabledPlugins: { "cstack@cstack": true } }));
  writeFileSync(join(home, ".claude/plugins/installed_plugins.json"), JSON.stringify({ plugins: {
    "cstack@cstack": [{ scope: "user", version: "1.0.0", installPath: join(home, "provider-copy") }],
  } }));
}

test("a second run reports every unchanged installed host as already current without session steps", () => {
  withHome((home) => {
    hosts(home, { claude: true, codex: "git", cursorMarket: true });
    intentFetch(home, "valid");
    sharedImport(home);
    const specialists = join(home, ".intent/specialists");
    mkdirSync(specialists, { recursive: true });
    writeFileSync(join(specialists, "cstack-agent.md"), "My specialist.\n");
    const args = ["--hosts", "intent,claude,codex,cursor", "--source", "other/fork"];
    const first = commandRun(home, args);
    expect(first.status).toBe(0);
    expect(first.stdout).toMatch(/Intent\s+yes\s+yes\s+-\s+1.5.0\s+Updated/);
    const second = commandRun(home, args);
    expect(second.status).toBe(0);
    for (const [host, version] of [["Intent", "1.5.0"], ["Claude Code", "9.0.0"], ["Codex", "9.0.0"], ["Cursor", "9.0.0 (Claude import)"]]) {
      const row = second.stdout.split("\n").find((line) => line.startsWith(host + " "));
      expect(row).toContain(`Already current at ${version}.`);
      expect(row).not.toMatch(/Updated\.|[Rr]estart|[Ss]tart a new|New sessions|Run setup/);
      if (host === "Cursor") expect(row).toContain("Open Cursor Customize, find cstack, and select Install or update. Native installation and version are unknown.");
      else expect(row).not.toContain("Open Cursor");
    }
    expect(second.stdout).toContain("left your own cstack-agent.md as it is");
    expect(second.stdout).toContain("Nothing is needed for your own files.");
    expect(readFileSync(join(specialists, "cstack-agent.md"), "utf8")).toBe("My specialist.\n");
  });
}, 15000);

test("a Codex source change is updated even when its version stays the same", () => {
  withHome((home) => {
    hosts(home, { codex: "local" });
    const file = join(home, "state.json");
    const state = JSON.parse(readFileSync(file, "utf8"));
    state.codex[0].version = "9.0.0";
    writeFileSync(file, JSON.stringify(state));
    const result = commandRun(home, ["--hosts", "codex", "--source", "other/fork"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Codex\s+yes\s+yes\s+9.0.0\s+9.0.0\s+Updated\./);
    expect(JSON.parse(readFileSync(file, "utf8")).codex[0].marketplaceSource).toEqual({ sourceType: "git", source: "configured" });
    expect(result.stdout).toContain("New sessions use version 9.0.0.");
  });
});

test.each([
  ["claude", "plugin update cstack@cstack --scope user"],
  ["codex", "plugin marketplace upgrade cstack"],
])("a failed installed %s update offers its native retry without a source placeholder", (host, command) => {
  withHome((home) => {
    hosts(home, { claude: true, codex: "git", fail: `${host} ${command}` });
    const result = commandRun(home, ["--yes"]);
    expect(result.status).toBe(1);
    const row = result.stdout.split("\n").find((line) => line.startsWith(host === "claude" ? "Claude Code " : "Codex "));
    expect(row).toContain("fixture failure");
    expect(row).toMatch(new RegExp(`Retry with .*${host}'? ${command}\\.`));
    expect(row).not.toContain("OWNER/REPO");
    expect(row).not.toContain("Retry with npx");
  });
});

test("report-only announces a Codex local-folder move without doing it", () => {
  withHome((home) => {
    hosts(home, { codex: "local" });
    const file = join(home, "state.json");
    const before = readFileSync(file, "utf8");
    const result = commandRun(home, ["--hosts", "codex", "--source", "other/fork", "--report-only"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Would move Codex from its local folder to the GitHub source before updating.");
    expect(result.stdout).toMatch(/Codex\s+yes\s+yes\s+2.0.0\s+2.0.0/);
    expect(mutations(home)).toEqual([]);
    expect(readFileSync(file, "utf8")).toBe(before);
  });
});

test("updated hosts explain which sessions use the new version", () => {
  withHome((home) => {
    hosts(home, { claude: true, codex: "git", cursorMarket: true });
    intentFetch(home, "valid");
    sharedImport(home);
    const result = commandRun(home, ["--hosts", "intent,claude,codex,cursor", "--source", "other/fork"]);
    expect(result.status).toBe(0);
    for (const [host, version] of [["Intent", "1.5.0"], ["Claude Code", "9.0.0"], ["Codex", "9.0.0"], ["Cursor", "9.0.0 (Claude import)"]]) {
      const row = result.stdout.split("\n").find((line) => line.startsWith(host + " "));
      expect(row).toContain(`Updated. New sessions use version ${version}. Sessions already open keep the old version until you start them again.`);
      expect(row).not.toMatch(/[Rr]estart|Start a new/);
    }
  });
});

test("Intent detects changed package files at the same version and an identical repeat is current", () => {
  withHome((home) => {
    hosts(home);
    intentFetch(home, "valid");
    const args = ["--hosts", "intent", "--source", "other/fork"];
    expect(commandRun(home, args).status).toBe(0);
    const changed = "# A changed skill from the fetched branch\n";
    writeFileSync(join(home, "npx/cache/node_modules/cstack/skills/how/SKILL.md"), changed);
    const update = commandRun(home, args);
    expect(update.status).toBe(0);
    expect(readFileSync(join(home, ".intent/skills/how/SKILL.md"), "utf8")).toBe(changed);
    expect(update.stdout).toMatch(/Intent\s+yes\s+yes\s+1.5.0\s+1.5.0\s+Updated\./);
    const repeat = commandRun(home, args);
    expect(repeat.status).toBe(0);
    expect(repeat.stdout).toMatch(/Intent\s+yes\s+yes\s+1.5.0\s+1.5.0\s+Already current at 1.5.0\./);
    expect(repeat.stdout).not.toContain("New sessions");
  });
}, 15000);

test.each([
  ["retained", "plugin marketplace add other/fork"],
  ["dropped", "plugin marketplace add other/fork"],
  ["retained", "plugin add cstack@cstack"],
  ["dropped", "plugin add cstack@cstack"],
])("a failed Codex move gives the remaining recovery steps (plugin %s, fails %s)", (removal, failingCommand) => {
  const dropsPlugin = removal === "dropped";
  withHome((home) => {
    hosts(home, { codex: "local" });
    const host = join(home, "bin/host.mjs");
    const standIn = readFileSync(host, "utf8").replace(
      "else if (args[2] === 'remove') state.markets = [];",
      `else if (args[2] === 'remove') { state.markets = []; ${dropsPlugin ? "state.codex = [];" : ""} }`,
    ).replace(
      "let result = {};",
      "if (host === 'codex' && args.join(' ') === " + JSON.stringify(failingCommand) + " && !state.failedOnce) { state.failedOnce = true; writeFileSync(file,JSON.stringify(state)); console.error('fixture move failed'); process.exit(7); }\nlet result = {};",
    );
    writeFileSync(host, standIn);
    const result = commandRun(home, ["--hosts", "codex", "--source", "other/fork"]);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("fixture move failed");
    const row = result.stdout.split("\n").find((line) => line.startsWith("Codex "));
    const binary = `'${join(home, "bin/codex")}'`;
    const recovery = failingCommand.startsWith("plugin marketplace")
      ? `${binary} plugin marketplace add other/fork && ${binary} plugin add cstack@cstack`
      : `${binary} plugin add cstack@cstack`;
    expect(row).toContain(`Retry with ${recovery}.`);
    const state = JSON.parse(readFileSync(join(home, "state.json"), "utf8"));
    expect(state.codex.length).toBe(dropsPlugin ? 0 : 1);
    expect(state.markets.length).toBe(failingCommand.startsWith("plugin marketplace") ? 0 : 1);
    const retry = row?.split("Retry with ").at(-1)?.replace(/\.\s*$/, "");
    if (!retry) throw new Error("The failed move did not give a retry command.");
    const restored = spawnSync("sh", ["-c", retry], { env: { PATH: join(home, "bin"), HOME: home }, encoding: "utf8" });
    expect(restored.status).toBe(0);
    const after = JSON.parse(readFileSync(join(home, "state.json"), "utf8"));
    expect(after.codex).toEqual([{ name: "cstack", pluginId: "cstack@cstack", marketplaceName: "cstack", version: "9.0.0", marketplaceSource: { sourceType: "git", source: "configured" } }]);
    expect(after.markets).toEqual([{ name: "cstack", marketplaceSource: { sourceType: "git", source: "other/fork" } }]);
  });
});

function installRecord(home: string) {
  return JSON.parse(readFileSync(join(home, ".local/share/cstack-install-record.json"), "utf8"));
}

test("delivery records host links and keeps copied files outside the ownership record", () => {
  withHome((home) => {
    const from = fetchedPackage(home);
    expect(commandRun(home, ["--hosts", "intent"], from).status).toBe(0);
    const record = installRecord(home);
    const data = join(home, ".local/share/cstack");
    expect(record.schemaVersion).toBe(1);
    expect(record.entries).toContainEqual({ path: join(home, ".intent/skills/how"), kind: "link", target: join(data, "skills/how") });
    expect(record.entries.every((entry: { path: string }) => !entry.path.startsWith(data + "/"))).toBe(true);
    expect(lstatSync(join(data, "hooks/intent-deliver.sh")).mode & 0o777).toBe(0o755);
    expect(record.modeRule).toEqual({ location: "Intent's Settings, under Agent Behavior", status: "existing" });
    expect(record.entries.some((entry: { path: string }) => entry.path.includes("node_modules") || entry.path.endsWith("install-record.json"))).toBe(false);
  });
});

test("a valid record never claims an unrecorded link even when it points at the plugin", () => {
  withHome((home) => {
    expect(install(home).status).toBe(0);
    const record = installRecord(home);
    const path = join(home, ".intent/skills/how");
    record.entries = record.entries.filter((entry: { path: string }) => entry.path !== path);
    writeFileSync(join(home, ".local/share/cstack-install-record.json"), JSON.stringify(record));
    const result = install(home);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("left your own how as it is");
    expect(readlinkSync(path)).toBe(join(root, "skills/how"));
    expect(installRecord(home).entries.some((entry: { path: string }) => entry.path === path)).toBe(false);
  });
});

test("the first recorded run adopts exact legacy skill links and keeps unrelated and broken links", () => {
  withHome((home) => {
    const skills = join(home, ".intent/skills");
    mkdirSync(skills, { recursive: true });
    symlinkSync(join(root, "skills/cstack-mode"), join(skills, "cstack-mode"));
    symlinkSync(join(root, "skills/align"), join(skills, "align"));
    const own = join(home, "my how");
    mkdirSync(own);
    symlinkSync(own, join(skills, "how"));
    symlinkSync(join(home, "missing"), join(skills, "why"));
    const first = install(home);
    expect(first.status).toBe(0);
    expect(installRecord(home).entries).toContainEqual({ path: join(skills, "align"), kind: "link", target: join(root, "skills/align") });
    expect(first.stdout).toContain("left your own how as it is");
    expect(first.stdout).toContain(`kept ${join(skills, "why")}: its link target is gone`);
    expect(readlinkSync(join(skills, "how"))).toBe(own);
    expect(readlinkSync(join(skills, "why"))).toBe(join(home, "missing"));
    expect(install(home).status).toBe(0);
    expect(readlinkSync(join(skills, "why"))).toBe(join(home, "missing"));
  });
});

test("updates replace the whole copy and remove recorded retired host links while preserving personal host files", () => {
  withHome((home) => {
    const cache = join(home, "npx/first");
    const plugin = join(cache, "node_modules/cstack");
    copyPlugin(plugin);
    expect(npxInstall(home, cache).status).toBe(0);
    const data = join(home, ".local/share/cstack");
    const own = join(home, ".intent/skills/personal.txt");
    writeFileSync(own, "My notes.\n");
    writeFileSync(join(data, "skills/how/SKILL.md"), "My edited skill.\n");
    rmSync(join(plugin, "skills/how"), { recursive: true });
    rmSync(join(plugin, "skills/why"), { recursive: true });
    const hidden = join(plugin, "skills/align/SKILL.md");
    writeFileSync(hidden, readFileSync(hidden, "utf8").replace("---\n", "---\ndisable-model-invocation: true\n"));
    const result = npxInstall(home, cache);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`removed ${join(home, ".intent/skills/how")}`);
    expect(result.stdout).toContain(`removed ${join(home, ".intent/skills/why")}`);
    expect(result.stdout).toContain(`removed ${join(home, ".intent/skills/align")}`);
    expect(existsSync(join(home, ".intent/skills/how"))).toBe(false);
    expect(existsSync(join(data, "skills/why/SKILL.md"))).toBe(false);
    expect(existsSync(join(data, "skills/how/SKILL.md"))).toBe(false);
    expect(readFileSync(own, "utf8")).toBe("My notes.\n");
    expect(result.stdout).not.toContain("left your own SKILL.md as it is");
    expect(installRecord(home).entries.some((entry: { path: string }) => entry.path === join(data, "skills/how/SKILL.md"))).toBe(false);
  });
});

test("a changed recorded link and a personal file replacing a recorded link survive every update", () => {
  withHome((home) => {
    expect(install(home).status).toBe(0);
    const skills = join(home, ".intent/skills");
    rmSync(join(skills, "how"));
    symlinkSync(join(home, "my missing how"), join(skills, "how"));
    rmSync(join(skills, "why"));
    writeFileSync(join(skills, "why"), "My own file.\n");
    for (let index = 0; index < 2; index++) {
      const result = install(home);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain(`kept ${join(skills, "how")}: its link target is gone`);
      expect(result.stdout).toContain("left your own why as it is");
      expect(readlinkSync(join(skills, "how"))).toBe(join(home, "my missing how"));
      expect(readFileSync(join(skills, "why"), "utf8")).toBe("My own file.\n");
    }
  });
});

test.each(["missing", "unreadable", "unreadable permissions", "outside path"])("a %s record removes no unproven host entries from an earlier install", (state) => {
  withHome((home) => {
    const cache = join(home, "npx/first");
    const plugin = join(cache, "node_modules/cstack");
    copyPlugin(plugin);
    expect(npxInstall(home, cache).status).toBe(0);
    const path = join(home, ".local/share/cstack-install-record.json");
    const protectedFile = join(home, "keep.txt");
    writeFileSync(protectedFile, "Keep me.\n");
    if (state === "missing") rmSync(path);
    else if (state === "unreadable") writeFileSync(path, "broken json");
    else if (state === "unreadable permissions") chmodSync(path, 0o000);
    else {
      const record = installRecord(home);
      record.entries.push({ path: protectedFile, kind: "file", sha256: new Bun.CryptoHasher("sha256").update("Keep me.\n").digest("hex"), mode: 0o644 });
      writeFileSync(path, JSON.stringify(record));
    }
    rmSync(join(plugin, "skills/how"), { recursive: true });
    const result = npxInstall(home, cache);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`Installation record ${state === "missing" ? "missing" : "unreadable"}. No host entries were removed.`);
    expect(readlinkSync(join(home, ".intent/skills/how"))).toBe(join(home, ".local/share/cstack/skills/how"));
    expect(existsSync(join(home, ".local/share/cstack/skills/how/SKILL.md"))).toBe(false);
    expect(readFileSync(protectedFile, "utf8")).toBe("Keep me.\n");
    expect(result.stdout).not.toContain("removed ");
  });
});

test("delivery replaces a directory link inside the copy without writing through its personal target", () => {
  withHome((home) => {
    const cache = join(home, "npx/first");
    copyPlugin(join(cache, "node_modules/cstack"));
    expect(npxInstall(home, cache).status).toBe(0);
    const data = join(home, ".local/share/cstack");
    const own = join(home, "own how");
    mkdirSync(own);
    writeFileSync(join(own, "SKILL.md"), "My skill.\n");
    rmSync(join(data, "skills/how"), { recursive: true });
    symlinkSync(own, join(data, "skills/how"));
    const result = npxInstall(home, cache);
    expect(result.status).toBe(0);
    expect(readFileSync(join(own, "SKILL.md"), "utf8")).toBe("My skill.\n");
    expect(lstatSync(join(data, "skills/how")).isDirectory()).toBe(true);
    expect(readFileSync(join(data, "skills/how/SKILL.md"), "utf8")).toBe(readFileSync(join(root, "skills/how/SKILL.md"), "utf8"));
  });
});

test.each(["shell", "node"])("direct %s delivery honors report-only without creating files or writing a rule", (route) => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const binary = route === "shell" ? "sh" : join(home, "bin/node");
    const target = join(dirname(from), route === "shell" ? "intent-deliver.sh" : "intent-deliver.mjs");
    const result = spawnSync(binary, [target, "--report-only"], { env: { HOME: home, PATH: join(home, "bin") }, encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Report only. No install, update, move, delivery, or rule write was run.");
    expect(result.stdout).toContain("Installation record");
    expect(existsSync(join(home, ".intent"))).toBe(false);
    expect(existsSync(join(home, ".local"))).toBe(false);
    expect(install(home, join(dirname(from), "intent-deliver.sh")).status).toBe(0);
    expect(readlinkSync(join(home, ".intent/skills/how"))).toBe(join(home, ".local/share/cstack/skills/how"));
  });
});

test("the final table identifies the first rule's position and updates leave personal rule edits alone", () => {
  withHome((home) => {
    const from = fetchedPackage(home);
    writeFileSync(join(home, "bin/intentd"), `#!/bin/sh
case "$2" in
rules.get) printf '{"enabled":true,"content":"My other rule."}' ;;
rules.update) printf '%s\\n' "$4" > "${join(home, "rule-update")}"; printf '{}' ;;
esac
`, { mode: 0o755 });
    const result = commandRun(home, ["--hosts", "intent"], from);
    expect(result.status).toBe(0);
    const row = result.stdout.split("\n").find((line) => /^Intent\s/.test(line));
    expect(row).toContain("added the cstack-mode rule in Intent's Settings, under Agent Behavior, at the top of your personal rule text");
    expect(JSON.parse(readFileSync(join(home, "rule-update"), "utf8")).content).toEndWith("\n\nMy other rule.");
    expect(installRecord(home).modeRule.status).toBe("added");
    writeFileSync(join(home, "rule-update"), "My replacement rule.");
    const again = commandRun(home, ["--hosts", "intent"], from);
    expect(again.status).toBe(0);
    expect(again.stdout).toContain("Already current");
    expect(again.stdout).toContain("Left the cstack-mode rule unchanged in Intent's Settings, under Agent Behavior");
    expect(readFileSync(join(home, "rule-update"), "utf8")).toBe("My replacement rule.");
  });
});

test("the record follows XDG_DATA_HOME and leaves no default data folder", () => {
  withHome((home) => {
    const data = join(home, "custom data");
    const result = spawnSync("sh", [script], { env: { HOME: home, PATH: join(home, "bin"), XDG_DATA_HOME: data }, encoding: "utf8" });
    expect(result.status).toBe(0);
    const record = JSON.parse(readFileSync(join(data, "cstack-install-record.json"), "utf8"));
    expect(record.entries).toContainEqual({ path: join(home, ".intent/skills/how"), kind: "link", target: join(root, "skills/how") });
    expect(existsSync(join(home, ".local/share/cstack"))).toBe(false);
    expect(readlinkSync(join(home, ".intent/skills/how"))).toBe(join(root, "skills/how"));
  });
});

test("a copied file can become a link and return to a file when the whole copy is replaced", () => {
  withHome((home) => {
    const cache = join(home, "npx/first");
    const plugin = join(cache, "node_modules/cstack");
    copyPlugin(plugin);
    const sourceFile = join(plugin, "hooks/example.txt");
    writeFileSync(sourceFile, "Original.\n");
    expect(npxInstall(home, cache).status).toBe(0);
    const installed = join(home, ".local/share/cstack/hooks/example.txt");
    expect(readFileSync(installed, "utf8")).toBe("Original.\n");
    rmSync(sourceFile);
    symlinkSync("install.mjs", sourceFile);
    expect(npxInstall(home, cache).status).toBe(0);
    expect(readlinkSync(installed)).toBe("install.mjs");
    rmSync(sourceFile);
    writeFileSync(sourceFile, "Replacement.\n");
    expect(npxInstall(home, cache).status).toBe(0);
    expect(readFileSync(installed, "utf8")).toBe("Replacement.\n");
  });
});

test("a legacy link to a prior checkout is recorded before its target can be replaced", () => {
  withHome((home) => {
    const old = join(home, "old checkout");
    const next = join(home, "next checkout");
    copyPlugin(old);
    copyPlugin(next);
    mkdirSync(join(next, ".git"));
    const skills = join(home, ".intent/skills");
    mkdirSync(skills, { recursive: true });
    symlinkSync(join(old, "skills/cstack-mode"), join(skills, "cstack-mode"));
    symlinkSync(join(old, "skills/how"), join(skills, "how"));
    const from = join(next, "hooks/intent-deliver.sh");
    const first = install(home, from);
    expect(first.status).toBe(0);
    expect(first.stdout).toContain("Recorded the earlier how link. Run the installer again to update its target.");
    expect(first.stdout).not.toContain("left your own how");
    expect(readlinkSync(join(skills, "how"))).toBe(join(old, "skills/how"));
    expect(installRecord(home).entries).toContainEqual({ path: join(skills, "how"), kind: "link", target: join(old, "skills/how") });
    expect(install(home, from).status).toBe(0);
    expect(readlinkSync(join(skills, "how"))).toBe(join(next, "skills/how"));
  });
});

test("copy updates preserve hard-linked personal backups and the previous record", () => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const plugin = dirname(dirname(from));
    const sourceFile = join(plugin, "hooks/example.txt");
    writeFileSync(sourceFile, "Original.\n", { mode: 0o644 });
    expect(commandRun(home, ["--hosts", "intent"], from).status).toBe(0);
    const data = join(home, ".local/share/cstack");
    const installed = join(data, "hooks/example.txt");
    const backup = join(home, "personal-backup.txt");
    const recordBackup = join(home, "record-backup.json");
    const recordPath = join(dirname(data), "cstack-install-record.json");
    const recordBefore = readFileSync(recordPath, "utf8");
    linkSync(installed, backup);
    linkSync(recordPath, recordBackup);
    writeFileSync(sourceFile, "Replacement.\n");
    chmodSync(sourceFile, 0o600);
    expect(commandRun(home, ["--hosts", "intent"], from).status).toBe(0);
    expect(readFileSync(installed, "utf8")).toBe("Replacement.\n");
    expect(lstatSync(installed).mode & 0o777).toBe(0o600);
    expect(readFileSync(backup, "utf8")).toBe("Original.\n");
    expect(lstatSync(backup).mode & 0o777).toBe(0o644);
    expect(readFileSync(recordBackup, "utf8")).toBe(recordBefore);
    expect(installRecord(home).schemaVersion).toBe(1);
  });
});

function packageContents(base: string): string[] {
  const result: string[] = [];
  const visit = (path: string) => {
    const full = join(base, path);
    const stat = lstatSync(full);
    if (stat.isDirectory()) {
      for (const child of readdirSync(full).sort()) if (child !== "node_modules") visit(join(path, child));
    } else if (stat.isSymbolicLink()) result.push(JSON.stringify([path, "link", readlinkSync(full)]));
    else result.push(JSON.stringify([path, "file", stat.mode & 0o777, readFileSync(full).toString("base64")]));
  };
  for (const path of ["agents", "hooks", "skills", "tools/metadata.json", "LICENSE"]) if (existsSync(join(base, path))) visit(path);
  return result;
}

function homeSnapshot(base: string): string[] {
  const rows: string[] = [];
  const visit = (path: string) => {
    const full = join(base, path);
    const stat = lstatSync(full);
    if (stat.isSymbolicLink()) rows.push(JSON.stringify([path, "link", readlinkSync(full)]));
    else if (stat.isDirectory()) {
      rows.push(JSON.stringify([path, "directory"]));
      for (const child of readdirSync(full).sort()) visit(join(path, child));
    } else rows.push(JSON.stringify([path, "file", stat.mode & 0o777, readFileSync(full).toString("base64")]));
  };
  for (const child of readdirSync(base).sort()) visit(child);
  return rows;
}

test.each(["empty object", "wrong name", "directory", "linked metadata", "valid record without metadata", "malformed", "null", "linked tools"])("copy identity refusal preserves unrelated folders with %s", (kind) => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const data = join(home, ".local/share/cstack");
    mkdirSync(join(data, "tools"), { recursive: true });
    writeFileSync(join(data, "personal.txt"), "My personal file.\n");
    const metadata = join(data, "tools/metadata.json");
    if (kind === "empty object") writeFileSync(metadata, "{}");
    else if (kind === "wrong name") writeFileSync(metadata, '{"name":"other-plugin"}');
    else if (kind === "directory") mkdirSync(metadata);
    else if (kind === "linked metadata") symlinkSync(join(root, "tools/metadata.json"), metadata);
    else if (kind === "malformed") writeFileSync(metadata, "broken json");
    else if (kind === "null") writeFileSync(metadata, "null");
    else if (kind === "linked tools") {
      rmSync(join(data, "tools"), { recursive: true });
      symlinkSync(join(root, "tools"), join(data, "tools"));
    } else {
      const owned = join(home, ".intent/skills/how");
      mkdirSync(dirname(owned), { recursive: true });
      symlinkSync(join(data, "skills/how"), owned);
      writeFileSync(join(data, "install-record.json"), JSON.stringify({ schemaVersion: 1, entries: [{ path: owned, kind: "link", target: join(data, "skills/how") }], modeRule: { location: "Intent's Settings, under Agent Behavior", status: "unchanged" } }));
    }
    const before = homeSnapshot(home);
    const result = install(home, join(dirname(from), "intent-deliver.sh"));
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("it is not a copy of this plugin");
    expect(readFileSync(join(data, "personal.txt"), "utf8")).toBe("My personal file.\n");
    expect(homeSnapshot(home)).toEqual(before);
  });
});

test.each(["home", "ancestor", "linked parent", "intent skills", "intent specialists", "codex folder", "codex skills", "claude cache", "record target"])("copy path refusal preserves protected folders at %s", (kind) => {
  withHome((outer) => {
    const from = fetchedPackage(outer);
    let home = join(outer, "home");
    let data = join(outer, "data/cstack");
    let xdg = dirname(data);
    if (kind === "home" || kind === "linked parent") {
      home = join(outer, "cstack");
      data = home;
      xdg = outer;
    } else if (kind === "ancestor") {
      data = join(outer, "cstack");
      home = join(data, "nested/home");
      xdg = outer;
    }
    mkdirSync(home, { recursive: true });
    copyPlugin(data);
    if (kind === "linked parent") {
      xdg = join(outer, "data alias");
      symlinkSync(outer, xdg);
    }
    const host = join(home, ".intent/skills");
    mkdirSync(host, { recursive: true });
    writeFileSync(join(home, "personal.txt"), "My home data.\n");
    writeFileSync(join(host, "personal"), "My host entry.\n");
    if (kind === "intent skills" || kind === "intent specialists") {
      const redirected = kind === "intent skills" ? host : join(home, ".intent/specialists");
      rmSync(redirected, { recursive: true, force: true });
      mkdirSync(join(data, "host"));
      writeFileSync(join(data, "host/personal"), "My redirected host entry.\n");
      symlinkSync(join(data, "host"), redirected);
    } else if (["codex folder", "codex skills", "claude cache"].includes(kind)) {
      mkdirSync(join(data, "host"));
      writeFileSync(join(data, "host/personal"), "My redirected host entry.\n");
      const hostPath = join(home, kind === "codex folder" ? ".codex" : kind === "codex skills" ? ".codex/skills" : ".claude/plugins/cache");
      mkdirSync(dirname(hostPath), { recursive: true });
      symlinkSync(join(data, "host"), hostPath);
    } else if (kind === "record target") {
      writeFileSync(join(data, "personal-record.json"), "My personal record.\n");
      symlinkSync(join(data, "personal-record.json"), join(dirname(data), "cstack-install-record.json"));
    }
    const before = homeSnapshot(outer);
    const result = spawnSync("sh", [join(dirname(from), "intent-deliver.sh")], { env: { HOME: home, PATH: join(outer, "bin"), XDG_DATA_HOME: xdg }, encoding: "utf8" });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("protected");
    expect(homeSnapshot(outer)).toEqual(before);
  });
});

test.each(["after staging creation", "before old rename", "after old rename", "after new rename", "before old cleanup", "after old cleanup"])("an interrupted swap installs afresh and preserves every leftover %s", (phase) => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const shell = join(dirname(from), "intent-deliver.sh");
    const plugin = dirname(dirname(from));
    const retired = join(plugin, "skills/retired-review");
    mkdirSync(retired);
    writeFileSync(join(retired, "SKILL.md"), "---\nname: retired-review\n---\nRetired skill.\n");
    expect(install(home, shell).status).toBe(0);
    const data = join(home, ".local/share/cstack");
    const parent = dirname(data);
    const recordPath = join(parent, "cstack-install-record.json");
    const recordBefore = readFileSync(recordPath, "utf8");
    const link = join(home, ".intent/skills/retired-review");
    expect(readlinkSync(link)).toBe(join(data, "skills/retired-review"));
    const personal = join(parent, ".cstack-install-personal-backup");
    copyPlugin(join(personal, "previous"));
    writeFileSync(join(personal, "previous/notes.txt"), "Keep my backup.\n");
    rmSync(retired, { recursive: true });
    const nextSkill = "---\nname: how\n---\nReplacement release.\n";
    writeFileSync(join(plugin, "skills/how/SKILL.md"), nextSkill);
    const preload = join(home, "crash.cjs");
    writeFileSync(preload, `const fs = require('node:fs');
const path = require('node:path');
const phase = ${JSON.stringify(phase)};
const data = ${JSON.stringify(data)};
const temporary = fs.mkdtempSync;
fs.mkdtempSync = function(a) {
  const result = temporary.apply(this, arguments);
  if (phase === 'after staging creation' && path.basename(a).startsWith('.cstack-install-')) process.kill(process.pid, 'SIGKILL');
  return result;
};
const rename = fs.renameSync;
fs.renameSync = function(a, b) {
  if (phase === 'before old rename' && a === data && path.basename(b) === 'previous') process.kill(process.pid, 'SIGKILL');
  const result = rename.apply(this, arguments);
  if (phase === 'after old rename' && a === data && path.basename(b) === 'previous' || phase === 'after new rename' && b === data && path.basename(a) === 'copy') process.kill(process.pid, 'SIGKILL');
  return result;
};
const remove = fs.rmSync;
fs.rmSync = function(a) {
  if (phase === 'before old cleanup' && path.basename(a).startsWith('.cstack-install-')) process.kill(process.pid, 'SIGKILL');
  const result = remove.apply(this, arguments);
  if (phase === 'after old cleanup' && path.basename(a).startsWith('.cstack-install-')) process.kill(process.pid, 'SIGKILL');
  return result;
};
require('node:module').syncBuiltinESMExports();`);
    const crash = spawnSync("sh", [shell], { env: { HOME: home, PATH: join(home, "bin"), NODE_OPTIONS: "--require " + JSON.stringify(preload) }, encoding: "utf8" });
    expect(crash.signal).toBe("SIGKILL");
    expect(readFileSync(recordPath, "utf8")).toBe(recordBefore);
    const leftovers = readdirSync(parent).filter((entry) => entry.startsWith(".cstack-install-")).sort();
    const snapshots = leftovers.map((entry) => homeSnapshot(join(parent, entry)));
    for (let run = 0; run < 2; run++) {
      const retry = install(home, shell);
      expect(retry.status).toBe(0);
      expect(readFileSync(join(data, "skills/how/SKILL.md"), "utf8")).toBe(nextSkill);
      expect(packageContents(data)).toEqual(packageContents(plugin));
      expect(readdirSync(join(home, ".intent/skills"))).not.toContain("retired-review");
      const record = JSON.parse(readFileSync(recordPath, "utf8"));
      expect(record.entries).toContainEqual({ path: join(home, ".intent/skills/how"), kind: "link", target: join(data, "skills/how") });
      expect(readdirSync(parent).filter((entry) => entry.startsWith(".cstack-install-")).sort()).toEqual(leftovers);
      expect(leftovers.map((entry) => homeSnapshot(join(parent, entry)))).toEqual(snapshots);
      expect(readFileSync(join(personal, "previous/notes.txt"), "utf8")).toBe("Keep my backup.\n");
    }
  });
});

function beforeRecordInstall(home: string) {
  const from = fetchedPackage(home);
  const plugin = dirname(dirname(from));
  cpSync(join(root, "tests/fixtures/intent-deliver-before-record.sh"), join(plugin, "hooks/intent-deliver.sh"));
  writeFileSync(join(plugin, "skills/how/SKILL.md"), "---\nname: how\n---\nOlder release.\n");
  expect(install(home, join(plugin, "hooks/intent-deliver.sh")).status).toBe(0);
  return from;
}

test.each(["missing", "unreadable", "empty"])("a pre-record package upgrade with a %s record replaces the whole copy and protects host files", (state) => {
  withHome((home) => {
    const from = beforeRecordInstall(home);
    const plugin = dirname(dirname(from));
    const data = join(home, ".local/share/cstack");
    const own = join(home, ".intent/skills/why");
    rmSync(own);
    writeFileSync(own, "My own host skill.\n");
    if (state === "unreadable") writeFileSync(join(data, "install-record.json"), "broken json");
    if (state === "empty") writeFileSync(join(data, "install-record.json"), JSON.stringify({ schemaVersion: 1, entries: [], modeRule: { location: "Intent's Settings, under Agent Behavior", status: "unchanged" } }));
    writeFileSync(join(data, "hooks/retired.txt"), "Earlier release.\n");
    copyPlugin(plugin);
    const nextSkill = "---\nname: how\n---\nNew release.\n";
    writeFileSync(join(plugin, "skills/how/SKILL.md"), nextSkill);
    const result = commandRun(home, ["--hosts", "intent"], from);
    expect(result.status).toBe(0);
    expect(readFileSync(join(data, "skills/how/SKILL.md"), "utf8")).toBe(nextSkill);
    expect(packageContents(data)).toEqual(packageContents(plugin));
    expect(readFileSync(join(data, "hooks/intent-deliver.sh"), "utf8")).toBe(readFileSync(join(root, "hooks/intent-deliver.sh"), "utf8"));
    expect(existsSync(join(data, "hooks/retired.txt"))).toBe(false);
    expect(readFileSync(own, "utf8")).toBe("My own host skill.\n");
    expect(installRecord(home).entries).toContainEqual({ path: join(home, ".intent/skills/how"), kind: "link", target: join(data, "skills/how") });
    expect(installRecord(home).entries.every((entry: { path: string }) => !entry.path.startsWith(data + "/"))).toBe(true);
    expect(result.stdout).not.toContain("left your own SKILL.md");
    expect(commandRun(home, ["--hosts", "intent"], from).status).toBe(0);
    writeFileSync(join(plugin, "skills/how/SKILL.md"), "---\nname: how\n---\nLater release.\n");
    expect(commandRun(home, ["--hosts", "intent"], from).status).toBe(0);
    expect(readFileSync(join(data, "skills/how/SKILL.md"), "utf8")).toBe("---\nname: how\n---\nLater release.\n");
    expect(readFileSync(own, "utf8")).toBe("My own host skill.\n");
  });
});

test("delivery refuses a data-folder link without touching its personal target", () => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const personal = join(home, "personal folder");
    copyPlugin(personal);
    writeFileSync(join(personal, "notes.txt"), "My notes.\n");
    const data = join(home, ".local/share/cstack");
    mkdirSync(dirname(data), { recursive: true });
    symlinkSync(personal, data);
    const result = commandRun(home, ["--hosts", "intent"], from);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("the plugin data folder is a link");
    expect(readlinkSync(data)).toBe(personal);
    expect(readFileSync(join(personal, "notes.txt"), "utf8")).toBe("My notes.\n");
    expect(existsSync(join(personal, "install-record.json"))).toBe(false);
    expect(existsSync(join(home, ".intent/skills"))).toBe(false);
  });
});

test("the final table summarizes many preserved host entries with a count and one example", () => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const skills = join(home, ".intent/skills");
    mkdirSync(skills, { recursive: true });
    for (const skill of ["how", "why", "align"]) writeFileSync(join(skills, skill), "My host skill.\n");
    const result = commandRun(home, ["--hosts", "intent"], from);
    expect(result.status).toBe(0);
    const row = result.stdout.split("\n").find((line) => line.startsWith("Intent ")) ?? "";
    expect(row).toContain("3 personal entries untouched. For example, left your own align as it is");
    expect(row).not.toContain("left your own how");
    expect(row).not.toContain("left your own why");
    for (const skill of ["how", "why", "align"]) expect(readFileSync(join(skills, skill), "utf8")).toBe("My host skill.\n");
  });
});


test.each(["parent link", "dot dot", "home"])("safe custom data location still installs through %s", (kind) => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const target = join(home, "custom");
    mkdirSync(target);
    writeFileSync(join(target, "sibling.txt"), "Keep sibling.\n");
    let xdg = target;
    if (kind === "parent link") {
      xdg = join(home, "alias");
      symlinkSync(target, xdg);
    }
    if (kind === "dot dot") xdg = join(home, "unused") + "/../custom";
    if (kind === "home") xdg = home;
    const result = spawnSync("sh", [join(dirname(from), "intent-deliver.sh")], { env: { HOME: home, PATH: join(home, "bin"), XDG_DATA_HOME: xdg }, encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(readFileSync(join(target, "sibling.txt"), "utf8")).toBe("Keep sibling.\n");
    const parent = kind === "home" ? home : target;
    expect(readFileSync(join(parent, "cstack/tools/metadata.json"), "utf8")).toBe(readFileSync(join(root, "tools/metadata.json"), "utf8"));
    const record = JSON.parse(readFileSync(join(parent, "cstack-install-record.json"), "utf8"));
    expect(record.entries).toContainEqual({ path: join(home, ".intent/skills/how"), kind: "link", target: join(parent, "cstack/skills/how") });
  });
});

test("an internal copy record cannot supply ownership for an unrecorded host file", () => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const shell = join(dirname(from), "intent-deliver.sh");
    expect(install(home, shell).status).toBe(0);
    const data = join(home, ".local/share/cstack");
    const record = installRecord(home);
    const personal = join(home, ".intent/skills/personal-notes");
    writeFileSync(personal, "My host notes.\n", { mode: 0o644 });
    record.entries.push({ path: personal, kind: "file", sha256: new Bun.CryptoHasher("sha256").update("My host notes.\n").digest("hex"), mode: 0o644 });
    writeFileSync(join(data, "install-record.json"), JSON.stringify(record));
    rmSync(join(dirname(data), "cstack-install-record.json"));
    const result = install(home, shell);
    expect(result.status).toBe(0);
    expect(readFileSync(personal, "utf8")).toBe("My host notes.\n");
    expect(installRecord(home).entries.some((entry: { path: string }) => entry.path === personal)).toBe(false);
    expect(existsSync(join(data, "install-record.json"))).toBe(false);
  });
});
