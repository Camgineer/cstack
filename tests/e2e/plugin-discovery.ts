#!/usr/bin/env bun
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, isAbsolute, join, relative, sep } from "node:path";
import { parseArgs } from "node:util";

const pluginId = "cstack@cstack";
const timeoutMs = 30_000;

function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function dataset(result: unknown) {
  assert(isObject(result) && "data" in result && isArray(result.data), "Expected RPC datasets");
  assert.equal(result.data.length, 1, "Expected one project dataset");
  const data = result.data[0];
  assert(isObject(data) && "errors" in data && isArray(data.errors), "Expected dataset errors");
  assert.deepEqual(data.errors, [], "Codex reported discovery errors");
  return data;
}

function parseSkill(value: unknown) {
  assert(isObject(value), "Expected a skill object");
  assert("name" in value && typeof value.name === "string", "Expected a skill name");
  assert("path" in value && typeof value.path === "string", "Expected a skill path");
  assert("enabled" in value && typeof value.enabled === "boolean", "Expected skill enablement");
  const id = "pluginId" in value ? value.pluginId : null;
  assert(id === null || typeof id === "string", "Expected a plugin identity");
  return { name: value.name, path: value.path, enabled: value.enabled, pluginId: id };
}

function pluginSkills(result: unknown) {
  const data = dataset(result);
  assert("skills" in data && isArray(data.skills), "Expected discovered skills");
  return data.skills.map(parseSkill).filter((skill) => skill.pluginId === pluginId);
}

type PendingRequest = {
  id: number;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

class AppServer {
  private readonly process;
  private pending: PendingRequest | undefined;
  private failure: Error | undefined;
  private nextId = 1;

  constructor(options: { codex: string; cwd: string; env: Record<string, string> }) {
    this.process = Bun.spawn([options.codex, "app-server"], {
      cwd: options.cwd,
      env: options.env,
      stdin: "pipe",
      stdout: "pipe",
      stderr: "ignore",
    });
    void this.read().catch((error: unknown) => {
      this.fail(error instanceof Error ? error : new Error(String(error)));
    });
    void this.process.exited.then((code) => this.fail(new Error(`App server exited with code ${code}`)));
  }

  private fail(error: Error) {
    this.failure = error;
    if (this.pending) {
      clearTimeout(this.pending.timer);
      this.pending.reject(error);
      this.pending = undefined;
    }
  }

  private async read() {
    const decoder = new TextDecoder();
    let buffered = "";
    for await (const chunk of this.process.stdout) {
      buffered += decoder.decode(chunk, { stream: true });
      assert(buffered.length <= 1_000_000, "App server output exceeded the message limit");
      let newline;
      while ((newline = buffered.indexOf("\n")) >= 0) {
        const line = buffered.slice(0, newline).trim();
        buffered = buffered.slice(newline + 1);
        if (!line) continue;
        const message: unknown = JSON.parse(line);
        assert(isObject(message), "Expected an RPC message object");
        if (!("id" in message) || message.id !== this.pending?.id) continue;
        if (!("result" in message) && !("error" in message)) continue;
        const pending = this.pending;
        if (!pending) continue;
        clearTimeout(pending.timer);
        this.pending = undefined;
        if ("error" in message) pending.reject(new Error(JSON.stringify(message.error)));
        else if ("result" in message) pending.resolve(message.result);
      }
    }
    this.fail(new Error("App server closed its output"));
  }

  private async send(message: object) {
    this.process.stdin.write(`${JSON.stringify(message)}\n`);
    await this.process.stdin.flush();
  }

  notify(method: string) {
    return this.send({ method });
  }

  request(method: string, params: object): Promise<unknown> {
    if (this.failure) return Promise.reject(this.failure);
    assert(!this.pending, "Run app-server requests sequentially");
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.fail(new Error(`${method} timed out`)), timeoutMs);
      this.pending = { id, resolve, reject, timer };
      void this.send({ id, method, params }).catch((error: unknown) => {
        this.fail(error instanceof Error ? error : new Error(String(error)));
      });
    });
  }

  async close() {
    this.fail(new Error("App server stopped"));
    this.process.kill("SIGTERM");
    const timer = setTimeout(() => this.process.kill("SIGKILL"), 5_000);
    try {
      await this.process.exited;
    } finally {
      clearTimeout(timer);
    }
  }
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      codex: { type: "string", default: "codex" },
      "allow-isolated-install": { type: "boolean", default: false },
    },
  });
  if (!values["allow-isolated-install"]) {
    throw new Error("Isolated plugin installation requires explicit user authorization and --allow-isolated-install");
  }
  const codex = values.codex;
  assert(codex, "Expected a Codex executable");
  const source = join(import.meta.dir, "../..");
  const expected: string[] = [];
  for await (const path of new Bun.Glob("*/SKILL.md").scan({ cwd: join(source, "skills") })) {
    expected.push(`cstack:${path.split(/[\\/]/)[0]}`);
  }
  expected.sort();
  assert.equal(expected.length, 49, "Expected the approved 49-skill catalog");

  const scratch = await mkdtemp(join(tmpdir(), "cstack-discovery-"));
  const home = join(scratch, "codex-home");
  const project = join(scratch, "project");
  const packageRoot = join(scratch, "cstack");
  let server: AppServer | undefined;
  let report;
  try {
    await Promise.all([mkdir(home), mkdir(project), mkdir(join(scratch, "home"))]);
    await cp(source, packageRoot, {
      recursive: true,
      filter: (path) => ![".git", "node_modules", "__pycache__", ".codex"].includes(basename(path)),
    });
    const env: Record<string, string> = {
      HOME: join(scratch, "home"),
      CODEX_HOME: home,
      TMPDIR: scratch,
    };
    for (const key of ["PATH", "LANG", "SYSTEMROOT"]) {
      const value = process.env[key];
      if (value !== undefined) env[key] = value;
    }
    async function cli(...args: string[]) {
      const child = Bun.spawn([codex, ...args], { cwd: project, env, stdout: "pipe", stderr: "pipe" });
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, timeoutMs);
      try {
        const [code, stdout, stderr] = await Promise.all([
          child.exited,
          new Response(child.stdout).text(),
          new Response(child.stderr).text(),
        ]);
        assert(!timedOut, `Codex ${args.join(" ")} timed out`);
        assert.equal(code, 0, stderr || stdout || `Codex exited with code ${code}`);
        return stdout;
      } finally {
        clearTimeout(timer);
        if (child.exitCode === null) {
          child.kill("SIGKILL");
          await child.exited;
        }
      }
    }

    await cli("plugin", "marketplace", "add", packageRoot, "--json");
    await cli("plugin", "add", pluginId, "--json");
    const prompt = await cli("debug", "prompt-input", "List applicable writing guidance without doing work.");
    const implicitCandidates = expected.filter((name) => prompt.includes(name));
    assert.deepEqual(implicitCandidates, ["cstack:setup-pstack", "cstack:simple-as-prose", "cstack:writing-for-agents"]);
    const runtime = (await cli("--version")).trim();
    const running = new AppServer({ codex, cwd: project, env });
    server = running;
    await running.request("initialize", {
      clientInfo: { name: "cstack-discovery", version: "1" },
      capabilities: { experimentalApi: true },
    });
    await running.notify("initialized");
    const list = () => running.request("skills/list", { cwds: [project], forceReload: true });
    function assertEnabled(skills: ReturnType<typeof pluginSkills>) {
      assert.deepEqual(skills.map((skill) => skill.name).sort(), expected);
      assert(skills.every((skill) => skill.enabled), "Expected every CStack skill to be enabled");
    }
    const skills = pluginSkills(await list());
    assertEnabled(skills);
    for (const skill of skills) {
      const path = relative(home, await realpath(skill.path));
      assert(path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path), "Skill path escaped the isolated Codex home");
    }
    const hooks = dataset(await running.request("hooks/list", { cwds: [project] }));
    assert("hooks" in hooks && isArray(hooks.hooks), "Expected discovered hooks");
    assert.equal(hooks.hooks.filter((hook) => isObject(hook) && "pluginId" in hook && hook.pluginId === pluginId).length, 0);
    const writeEnabled = (enabled: boolean) => running.request("config/value/write", {
      keyPath: `plugins."${pluginId}".enabled`,
      value: enabled,
      mergeStrategy: "upsert",
    });
    await writeEnabled(false);
    assert(pluginSkills(await list()).every((skill) => !skill.enabled), "Disabled plugin still exposed enabled skills");
    await writeEnabled(true);
    assertEnabled(pluginSkills(await list()));
    await cli("plugin", "remove", pluginId);
    assert.deepEqual(pluginSkills(await list()), [], "Removed plugin still exposed skills");
    await cli("plugin", "add", pluginId, "--json");
    assertEnabled(pluginSkills(await list()));
    report = {
      discovered_skills: skills.length,
      discovered_hooks: 0,
      implicit_candidates: implicitCandidates,
      disable_reenable_uninstall_reinstall: "passed",
      runtime,
    };
  } finally {
    try {
      await server?.close();
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  }
  process.stdout.write(`${JSON.stringify({ ...report, isolated_home_deleted: true, production_install: false }, null, 2)}\n`);
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
