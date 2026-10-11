import { expect, test } from "bun:test";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assertFollowsInstructions, fileChangeKit, withFileChangeHome } from "../support/file-change-kit.ts";
import type { Cut, Instruction } from "../support/file-change-kit.ts";

const program = `const fs = require('node:fs'), path = require('node:path');
const home = process.env.HOME, original = path.join(home, 'original'), renamed = path.join(home, 'renamed');
if (process.argv[1] === 'observe') { process.stdout.write(JSON.stringify([fs.existsSync(original) ? fs.readFileSync(original, 'utf8') : null, fs.existsSync(renamed) ? fs.readFileSync(renamed, 'utf8') : null])); }
else { fs.writeFileSync(original, 'NEW'); fs.renameSync(original, renamed); fs.unlinkSync(renamed); process.stdout.write('complete'); }`;
const cases = [
  { operation: "write", edge: "before", contents: ["OLD", null] },
  { operation: "write", edge: "after", contents: ["NEW", null] },
  { operation: "rename", edge: "before", contents: ["NEW", null] },
  { operation: "rename", edge: "after", contents: [null, "NEW"] },
  { operation: "delete", edge: "before", contents: [null, "NEW"] },
  { operation: "delete", edge: "after", contents: [null, null] },
] satisfies { operation: Cut["operation"]; edge: Cut["edge"]; contents: (string | null)[] }[];

function kitFor(home: string, script = program) {
  return fileChangeKit(home, { command: ["node", "-e", script], env: { PATH: process.env.PATH ?? "" } });
}

for (const scenario of cases) for (const kind of ["kill", "pause"] satisfies Cut["action"]["kind"][]) {
  test(`kit ${kind}s ${scenario.edge} ${scenario.operation} and observes a real command`, () => withFileChangeHome(async home => {
    writeFileSync(join(home, "original"), "OLD");
    const kit = kitFor(home);
    const cut: Cut = { name: "change", operation: scenario.operation, edge: scenario.edge, target: { path: join(home, scenario.operation === "write" ? "original" : "renamed") }, action: { kind } };
    if (kind === "kill") {
      const killed = kit.runSync([], [cut]);
      expect(killed.signal).toBe("SIGKILL");
      expect(killed.cuts.map(event => event.name)).toEqual(["change"]);
      expect(JSON.parse(kit.runSync(["observe"]).stdout)).toEqual(scenario.contents);
    } else {
      const running = kit.start([], [cut]);
      try {
        expect((await running.at("change")).name).toBe("change");
        expect(JSON.parse(kit.runSync(["observe"]).stdout)).toEqual(scenario.contents);
        running.release("change");
        expect((await running.finish()).stdout).toBe("complete");
        expect(JSON.parse(kit.runSync(["observe"]).stdout)).toEqual([null, null]);
      } finally { await running.stop(); }
    }
  }));
}

test("kit fails when a command does not reach its named cut", () => withFileChangeHome(home => {
  expect(() => kitFor(home, "process.stdout.write('did nothing')").runSync([], [{ name: "required-write", operation: "write", edge: "after", target: { path: join(home, "original") }, action: { kind: "kill" } }])).toThrow("did not reach cut required-write");
}));

test("kit refuses an unregistered real home", () => {
  expect(() => fileChangeKit(process.env.HOME ?? "/", { command: ["node", "-e", "process.exit(99)"] })).toThrow("withFileChangeHome");
});

test("kit will not write through a linked release file", () => withFileChangeHome(async home => {
  const protectedFile = join(home, "protected");
  writeFileSync(protectedFile, "PERSONAL");
  writeFileSync(join(home, "original"), "OLD");
  const running = kitFor(home).start([], [{ name: "write", operation: "write", edge: "before", target: { path: join(home, "original") }, action: { kind: "pause" } }]);
  try {
    await running.at("write");
    const control = readdirSync(home).find(name => name.startsWith(".file-change-"));
    if (!control) throw new Error("Missing control directory.");
    symlinkSync(protectedFile, join(home, control, "release-0"));
    expect(() => running.release("write")).toThrow("EEXIST");
    expect(readFileSync(protectedFile, "utf8")).toBe("PERSONAL");
  } finally { await running.stop(); }
  expect(readFileSync(protectedFile, "utf8")).toBe("PERSONAL");
}));

test("kit refuses a control directory swapped during a pause", () => withFileChangeHome(async home => {
  writeFileSync(join(home, "original"), "OLD");
  const running = kitFor(home).start([], [{ name: "write", operation: "write", edge: "before", target: { path: join(home, "original") }, action: { kind: "pause" } }]);
  await running.at("write");
  const name = readdirSync(home).find(name => name.startsWith(".file-change-"));
  if (!name) throw new Error("Missing control directory.");
  const control = join(home, name), saved = join(home, "saved-controls"), personal = join(home, "personal");
  mkdirSync(personal);
  writeFileSync(join(personal, "original"), "PERSONAL");
  renameSync(control, saved);
  symlinkSync(personal, control);
  expect(() => running.release("write")).toThrow("directory changed");
  rmSync(control);
  renameSync(saved, control);
  await running.stop();
  expect(readFileSync(join(personal, "original"), "utf8")).toBe("PERSONAL");
  expect(readFileSync(join(home, "original"), "utf8")).toBe("OLD");
}));

test("kit refuses a swapped home and leaves the replacement intact", () => withFileChangeHome(home => {
  const kit = kitFor(home);
  const saved = `${home}-saved`;
  renameSync(home, saved);
  mkdirSync(home);
  writeFileSync(join(home, "personal"), "PERSONAL");
  try {
    expect(() => kit.runSync([])).toThrow("directory changed");
    expect(readFileSync(join(home, "personal"), "utf8")).toBe("PERSONAL");
    expect(existsSync(join(home, "original"))).toBe(false);
  } finally { rmSync(home, { recursive: true }); renameSync(saved, home); }
}));

test("follow assertion recovers originals and catches loss, loops, and dead ends", () => withFileChangeHome(async home => {
  const file = join(home, "original");
  writeFileSync(file, "OLD", { mode: 0o600 });
  const kit = kitFor(home, `const fs = require('node:fs'), file = process.env.HOME + '/original', command = process.argv[1];
if (command === 'restore') { fs.writeFileSync(file, 'OLD'); process.stdout.write('restored'); }
else if (command === 'loss') { fs.writeFileSync(file, 'LOST'); process.stdout.write('complete'); }
else if (command === 'loop') { process.stderr.write('retry'); process.exitCode = 2; }
else if (command === 'dead') { process.stderr.write('unknown advice'); process.exitCode = 2; }
else { fs.writeFileSync(file, 'CHANGED'); process.stderr.write('Run restore'); process.exitCode = 2; }`);
  const before = kit.snapshot([file]);
  const follow = (command: string) => assertFollowsInstructions({
    initial: { args: [command], result: kit.runSync([command]) }, run: kit.runSync,
    instructions: (result, args): Instruction[] => result.stderr === "Run restore" ? [{ kind: "run", args: ["restore"] }] : result.stderr === "retry" ? [{ kind: "run", args }] : [],
    snapshot: () => kit.snapshot([file]), expected: () => before,
    wait: async () => { throw new Error("No active run."); }, move: kit.move,
  });
  expect((await follow("change")).map(step => step.result.status)).toEqual([2, 0]);
  expect(readFileSync(file, "utf8")).toBe("OLD");
  await expect(follow("loss")).rejects.toThrow("changed the required recovered files");
  await expect(follow("loop")).rejects.toThrow("instructions looped");
  await expect(follow("dead")).rejects.toThrow("dead end");
}));

test("follow assertion runs commands and moves in printed order", () => withFileChangeHome(async home => {
  const original = join(home, "original"), saved = join(home, "saved");
  writeFileSync(original, "OLD");
  const kit = kitFor(home, `const fs = require('node:fs'), file = process.env.HOME + '/original', command = process.argv[1];
if (command === 'write') { fs.writeFileSync(file, 'WRITTEN'); process.stdout.write('written'); }
else if (command === 'restore') { fs.writeFileSync(file, 'OLD'); process.stdout.write('restored'); }
else { process.stderr.write('Write, preserve, then restore.'); process.exitCode = 2; }`);
  const before = kit.snapshot([original]);
  const transcript = await assertFollowsInstructions({
    initial: { args: ["initial"], result: kit.runSync(["initial"]) }, run: kit.runSync,
    instructions: result => result.stderr === "Write, preserve, then restore." ? [{ kind: "run", args: ["write"] }, { kind: "move", from: original, to: saved }, { kind: "run", args: ["restore"] }] : [],
    snapshot: () => kit.snapshot([original]), expected: () => before,
    wait: async () => { throw new Error("No active run."); }, move: kit.move,
  });
  expect(transcript.map(step => step.args)).toEqual([["initial"], ["write"], ["restore"]]);
  expect(readFileSync(original, "utf8")).toBe("OLD");
  expect(readFileSync(saved, "utf8")).toBe("WRITTEN");
}));

test("kit times out and joins a direct child that never finishes", () => withFileChangeHome(async home => {
  const kit = fileChangeKit(home, { command: ["node", "-e", "setInterval(() => {}, 1000)"], env: { PATH: process.env.PATH ?? "" }, timeout: 500 });
  const running = kit.start([], []);
  await expect(running.finish()).rejects.toThrow("command timed out");
  await expect(running.stop()).rejects.toThrow("command timed out");
  expect(running.running).toBe(false);
  expect(readdirSync(home)).toEqual([]);
}));

test.each([
  { status: 0, observeExit: false },
  { status: 0, observeExit: true },
  { status: 2, observeExit: false },
])("kit finish rejects an unreached required cut (%j)", scenario => withFileChangeHome(async home => {
  const kit = kitFor(home, `process.exitCode = ${scenario.status}`);
  const running = kit.start([], [{ name: "required-write", operation: "write", edge: "after", target: { path: join(home, "original") }, action: { kind: "kill" } }]);
  try {
    if (scenario.observeExit) expect((await running.atOrExit("required-write")).kind).toBe("exit");
    await expect(running.finish()).rejects.toThrow("did not reach cut required-write");
  } finally { await running.stop(); }
}));

test("kit finish requires later cuts after a released pause", () => withFileChangeHome(async home => {
  const file = join(home, "original");
  const kit = kitFor(home, "const fs = require('node:fs'); fs.writeFileSync(process.env.HOME + '/original', 'NEW'); process.stdout.write('complete');");
  const running = kit.start([], [
    { name: "written", operation: "write", edge: "after", target: { path: file }, action: { kind: "pause" } },
    { name: "required-delete", operation: "delete", edge: "after", target: { path: file }, action: { kind: "kill" } },
  ]);
  try {
    await running.at("written");
    expect(readFileSync(file, "utf8")).toBe("NEW");
    running.release("written");
    await expect(running.finish()).rejects.toThrow("did not reach cut required-delete");
  } finally { await running.stop(); }
}));
