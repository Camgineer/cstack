import { spawn, spawnSync } from "node:child_process";
import { lstatSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { isDeepStrictEqual } from "node:util";

type Identity = { dev: number; ino: number };
const homes = new Map<string, { identity: Identity; children: Set<ReturnType<typeof spawn>> }>();

function sameDirectory(path: string, identity: Identity) {
  const entry = lstatSync(path);
  if (!entry.isDirectory() || entry.dev !== identity.dev || entry.ino !== identity.ino) throw new Error(`File-change directory changed at ${path}.`);
}

export function withFileChangeHome(run: (home: string) => void | Promise<void>): void | Promise<void> {
  const home = realpathSync(mkdtempSync(join(tmpdir(), "file-change home ")));
  const identity = lstatSync(home);
  const children = new Set<ReturnType<typeof spawn>>();
  homes.set(home, { identity, children });
  const clean = () => {
    homes.delete(home);
    for (const child of children) child.kill("SIGKILL");
    sameDirectory(home, identity);
    rmSync(home, { recursive: true });
    if (children.size) throw new Error("A file-change command was left running.");
  };
  try {
    const result = run(home);
    if (result instanceof Promise) return result.finally(clean);
  } catch (error) {
    clean();
    throw error;
  }
  clean();
}

export type Cut = {
  name: string;
  operation: "open" | "write" | "rename" | "delete";
  edge: "before" | "after";
  target: { path: string } | { parent: string } | { sourceOf: string };
  occurrence?: number;
  flags?: string;
  sourceKind?: "file" | "link";
  exists?: string;
  after?: string;
  action: { kind: "kill" } | { kind: "pause" } | { kind: "throw"; message: string };
};

export type CutEvent = Pick<Cut, "name" | "operation" | "edge"> & { path: string; from?: string };
export type CommandResult = { status: number | null; signal: string | null; stdout: string; stderr: string; cuts: CutEvent[] };
export type FileSnapshot = ReturnType<typeof snapshotFiles>;
export type Instruction = { kind: "run"; args: string[] } | { kind: "wait" } | { kind: "move"; from: string; to: string };

function requireCuts(faults: Cut[], result: CommandResult) {
  for (const fault of faults) if (!result.cuts.some(cut => cut.name === fault.name)) throw new Error(`Command did not reach cut ${fault.name}.\n${result.stderr}`);
  return result;
}

function eventOf(bytes: string): CutEvent {
  const value: unknown = JSON.parse(bytes);
  if (!value || typeof value !== "object" || !("name" in value) || typeof value.name !== "string" || !("path" in value) || typeof value.path !== "string" || !("edge" in value) || (value.edge !== "before" && value.edge !== "after") || !("operation" in value)) throw new Error("Invalid file-change cut event.");
  if (value.operation !== "open" && value.operation !== "write" && value.operation !== "rename" && value.operation !== "delete") throw new Error("Invalid file-change operation.");
  const from = "from" in value ? value.from : undefined;
  if (from !== undefined && typeof from !== "string") throw new Error("Invalid file-change rename source.");
  return { name: value.name, path: value.path, edge: value.edge, operation: value.operation, ...(from === undefined ? {} : { from }) };
}

function snapshotFiles(paths: string[]) {
  const rows: string[] = [];
  const visit = (path: string) => {
    let entry;
    try { entry = lstatSync(path); } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
      rows.push(JSON.stringify([path, "absent"]));
      return;
    }
    if (entry.isSymbolicLink()) rows.push(JSON.stringify([path, "link", readlinkSync(path)]));
    else if (entry.isDirectory()) {
      rows.push(JSON.stringify([path, "directory", entry.mode & 0o777]));
      for (const child of readdirSync(path).sort()) visit(join(path, child));
    } else if (entry.isFile()) rows.push(JSON.stringify([path, "file", entry.mode & 0o777, readFileSync(path).toString("base64")]));
    else throw new Error(`Cannot snapshot special file ${path}.`);
  };
  for (const path of paths) visit(path);
  return rows;
}

export function fileChangeKit(home: string, options: { command: [string, ...string[]]; env?: Record<string, string>; timeout?: number; processProbe?: "denied" }) {
  const owner = homes.get(home);
  if (!owner) throw new Error("The kit needs a home created by withFileChangeHome.");
  const timeout = options.timeout ?? 10000;
  if (!Number.isFinite(timeout) || timeout <= 0) throw new Error("File-change timeout must be positive.");
  const [executable, ...prefix] = options.command;
  const env = { ...options.env, HOME: home };
  const checkHome = () => sameDirectory(home, owner.identity);
  const insideHome = (path: string) => {
    const tail = relative(home, path);
    if (!isAbsolute(path) || !tail || tail === ".." || tail.startsWith(`..${sep}`) || isAbsolute(tail)) throw new Error(`File-change path is outside its home: ${path}.`);
    return path;
  };
  const safeParents = (path: string) => {
    checkHome();
    insideHome(path);
    let parent = dirname(path);
    while (parent !== home) {
      const entry = lstatSync(parent);
      if (!entry.isDirectory()) throw new Error(`File-change parent is not a directory: ${parent}.`);
      parent = dirname(parent);
    }
  };
  const prepare = (faults: Cut[]) => {
    checkHome();
    const names = new Set<string>();
    for (const fault of faults) {
      if (names.has(fault.name) || !fault.name) throw new Error("Cut names must be unique and nonempty.");
      if (fault.occurrence !== undefined && (!Number.isInteger(fault.occurrence) || fault.occurrence < 1)) throw new Error("Cut occurrence must be a positive integer.");
      if (fault.after && !names.has(fault.after)) throw new Error("A dependent cut must name an earlier cut.");
      if ("sourceOf" in fault.target && !names.has(fault.target.sourceOf)) throw new Error("A source selector must name an earlier cut.");
      if ("path" in fault.target) insideHome(fault.target.path);
      if ("parent" in fault.target) insideHome(fault.target.parent);
      if (fault.exists) insideHome(fault.exists);
      names.add(fault.name);
    }
    const control = mkdtempSync(join(home, ".file-change-"));
    const identity = lstatSync(control);
    const check = () => { checkHome(); sameDirectory(control, identity); };
    const events = () => {
      check();
      return readdirSync(control).filter(file => /^hit-\d+\.json$/.test(file)).sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0])).map(file => {
        const path = join(control, file);
        if (!lstatSync(path).isFile()) throw new Error("File-change cut event is not a regular file.");
        return eventOf(readFileSync(path, "utf8"));
      });
    };
    const release = (name: string) => {
      check();
      const index = faults.findIndex(fault => fault.name === name && fault.action.kind === "pause");
      if (index < 0 || !events().some(event => event.name === name)) throw new Error(`Cut ${name} is not paused.`);
      writeFileSync(join(control, `release-${index}`), "release", { flag: "wx", mode: 0o600 });
    };
    let cleaned = false;
    const clean = () => { if (!cleaned) { check(); rmSync(control, { recursive: true }); cleaned = true; } };
    return {
      events, release, clean,
      env: { ...env, NODE_OPTIONS: `--require ${JSON.stringify(resolve(import.meta.dir, "file-change-preload.cjs"))}`, FILE_CHANGE_FAULTS: JSON.stringify({ home, homeIdentity: { dev: owner.identity.dev, ino: owner.identity.ino }, control, controlIdentity: { dev: identity.dev, ino: identity.ino }, timeout, faults, processProbe: options.processProbe }) },
    };
  };
  const runSync = (args: string[], faults: Cut[] = []): CommandResult => {
    if (faults.some(fault => fault.action.kind === "pause")) throw new Error("Use start for a paused command.");
    checkHome();
    const controls = faults.length || options.processProbe ? prepare(faults) : undefined;
    try {
      const result = spawnSync(executable, [...prefix, ...args], { cwd: home, env: controls?.env ?? env, encoding: "utf8", timeout, killSignal: "SIGKILL" });
      if (result.error) throw result.error;
      const cuts = controls?.events() ?? [];
      return requireCuts(faults, { status: result.status, signal: result.signal, stdout: result.stdout, stderr: result.stderr, cuts });
    } finally { controls?.clean(); }
  };
  const start = (args: string[], faults: Cut[]) => {
    const controls = prepare(faults);
    const child = spawn(executable, [...prefix, ...args], { cwd: home, env: controls.env, stdio: ["ignore", "pipe", "pipe"] });
    owner.children.add(child);
    let stdout = "", stderr = "";
    child.stdout.on("data", data => { stdout += data; });
    child.stderr.on("data", data => { stderr += data; });
    let running = true;
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGKILL"); }, timeout);
    const result = new Promise<CommandResult>((done, fail) => {
      child.once("error", fail);
      child.once("close", (status, signal) => {
        running = false;
        clearTimeout(timer);
        owner.children.delete(child);
        try {
          if (timedOut) throw new Error(`File-change command timed out.\n${stderr}`);
          done({ status, signal, stdout, stderr, cuts: controls.events() });
        } catch (error) { fail(error); }
      });
    });
    result.catch(() => {});
    const refusedCuts = new Set<string>();
    const observeCut = async (name: string): Promise<{ kind: "cut"; event: CutEvent } | { kind: "exit"; result: CommandResult }> => {
      if (!faults.some(fault => fault.name === name)) throw new Error(`Unknown cut ${name}.`);
      const until = Date.now() + timeout;
      while (true) {
        const event = controls.events().find(event => event.name === name);
        if (event) return { kind: "cut", event };
        if (!running) return { kind: "exit", result: await result };
        if (Date.now() > until) throw new Error(`Command did not reach cut ${name}.`);
        await new Promise(done => setTimeout(done, 10));
      }
    };
    return {
      get running() { return running; },
      async atOrExit(name: string) {
        const observed = await observeCut(name);
        if (observed.kind === "exit" && observed.result.status !== null && observed.result.status !== 0 && !observed.result.signal) refusedCuts.add(name);
        return observed;
      },
      async at(name: string) {
        const observed = await observeCut(name);
        if (observed.kind === "cut") return observed.event;
        throw new Error(`Command did not reach cut ${name}.\n${observed.result.stderr}`);
      },
      release: controls.release,
      async finish() {
        try { return requireCuts(faults.filter(fault => !refusedCuts.has(fault.name)), await result); } finally { controls.clean(); }
      },
      async stop() {
        if (running) child.kill("SIGKILL");
        try { await result; } finally { controls.clean(); }
      },
    };
  };
  return {
    runSync, start,
    snapshot(paths: string[]) {
      for (const path of paths) {
        insideHome(path);
        let parent = dirname(path);
        while (parent !== home) {
          try { if (!lstatSync(parent).isDirectory()) throw new Error(`Cannot snapshot through ${parent}.`); } catch (error) {
            if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
          }
          parent = dirname(parent);
        }
      }
      checkHome();
      return snapshotFiles(paths);
    },
    move(from: string, to: string) {
      safeParents(from);
      safeParents(to);
      try { lstatSync(to); throw new Error(`Move destination already exists: ${to}.`); } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
      }
      renameSync(from, to);
    },
  };
}

export async function assertFollowsInstructions(options: {
  initial: { args: string[]; result: CommandResult };
  run: (args: string[]) => CommandResult;
  instructions: (result: CommandResult, args: string[]) => Instruction[];
  snapshot: () => FileSnapshot;
  expected: () => FileSnapshot;
  wait: () => Promise<void>;
  move: (from: string, to: string) => void;
  active?: () => boolean;
  maxSteps?: number;
}) {
  const queue: Instruction[] = [{ kind: "run", args: options.initial.args }];
  const seen = new Set<string>();
  const transcript: { args: string[]; result: CommandResult }[] = [];
  for (let step = 0; queue.length; step++) {
    if (step >= (options.maxSteps ?? 12)) throw new Error("Printed instructions looped beyond the step limit.");
    const instruction = queue.shift();
    if (!instruction) throw new Error("Missing recovery instruction.");
    if (instruction.kind === "wait") { await options.wait(); continue; }
    if (instruction.kind === "move") { options.move(instruction.from, instruction.to); continue; }
    const args = instruction.args;
    if (options.active?.() && args[0] !== options.initial.args[0]) throw new Error("Printed recovery changes command while another run is active.");
    const result = transcript.length === 0 ? options.initial.result : options.run(args);
    transcript.push({ args, result });
    if (result.signal || result.status === null) throw new Error(`Recovery command did not finish: ${result.stderr}`);
    const instructions = options.instructions(result, args);
    if (result.status !== 0 && !instructions.length) throw new Error(`Printed instructions reached a dead end: ${result.stderr}`);
    const signature = JSON.stringify([args, result.status, result.stdout, result.stderr.replace(/\.saved-[a-f0-9-]{36}/g, ".saved-id"), options.snapshot()]);
    if (instructions.length && seen.has(signature)) throw new Error(`Printed instructions looped: ${result.stderr}`);
    seen.add(signature);
    queue.unshift(...instructions);
  }
  if (!isDeepStrictEqual(options.snapshot(), options.expected())) throw new Error("Following printed instructions changed the required recovered files.");
  return transcript;
}
