#!/usr/bin/env bun
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chmod, cp, mkdir, mkdtemp, readdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { parseArgs } from "node:util";

const source = join(import.meta.dir, "../..");
const pluginName: string = JSON.parse(readFileSync(join(source, "tools/metadata.json"), "utf8")).name;
const mode = `${pluginName}-mode`;
const variable = mode.toUpperCase().replaceAll("-", "_");
const timeoutMs = 300_000;

// Records what each hook event received, beside the plugin's own hook, so a run shows which hooks fired.
const observer = `#!/bin/sh
f="$2/$1-$(date +%s)-$$"
cat > "$f.json"
printf '%s=%s\\nCURSOR_PLUGIN_ROOT=%s\\nXDG_STATE_HOME=%s\\n' "$3" "$(printenv "$3")" "\${CURSOR_PLUGIN_ROOT-}" "\${XDG_STATE_HOME-}" > "$f.env"
case $1 in beforeSubmitPrompt) printf '{"continue":true}\\n' ;; *) printf '{}\\n' ;; esac
`;

// A skill list names the mode skill in every chat, so ask about the hook's sentence that the mode is on.
const onOrOff = `If your context says that ${mode} is on for this project, reply with only the word ON. Otherwise reply with only the word OFF. Use no tools.`;

type Check = { name: string; passed: boolean; evidence: string };

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      cursor: { type: "string", default: "cursor-agent" },
      model: { type: "string" },
      "allow-account-runs": { type: "boolean", default: false },
      "keep-home": { type: "boolean", default: false },
    },
  });
  if (!values["allow-account-runs"]) {
    throw new Error("Each check runs Cursor on the signed-in account, which needs the user's authorization and --allow-account-runs");
  }
  const cursor = values.cursor;
  const model = values.model;
  assert(model, "Pass --model with a model the account allows; `cursor-agent --list-models` lists them");

  const scratch = await mkdtemp(join(tmpdir(), "cursor-mode-"));
  // A home of its own hides the person's installed copy of the plugin and their shell startup files,
  // which would otherwise load beside the candidate and set the variable in every hook.
  const home = join(scratch, "home");
  const baseEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) if (value !== undefined && key !== variable) baseEnv[key] = value;
  if (!values["keep-home"]) Object.assign(baseEnv, { HOME: home, ZDOTDIR: home });
  baseEnv.XDG_STATE_HOME = join(scratch, "state");
  await mkdir(home);

  const status = Bun.spawnSync([cursor, "status"], { env: baseEnv, stdout: "pipe", stderr: "pipe" });
  const signedIn = `${status.stdout}${status.stderr}`;
  if (!/logged in/i.test(signedIn) || /not logged in/i.test(signedIn)) {
    await rm(scratch, { recursive: true, force: true });
    throw new Error(`Cursor is not signed in${values["keep-home"] ? "" : " with a separate home; pass --keep-home to use the real one"}: ${signedIn.trim()}`);
  }
  const version = Bun.spawnSync([cursor, "--version"], { env: baseEnv, stdout: "pipe" }).stdout.toString().trim();

  const plugin = join(scratch, pluginName);
  const project = join(scratch, "project");
  const state = baseEnv.XDG_STATE_HOME;
  const log = join(scratch, "hook-log");
  const checks: Check[] = [];
  try {
    await Promise.all([mkdir(project), mkdir(state), mkdir(log)]);
    await cp(source, plugin, { recursive: true, filter: (path) => ![".git", "node_modules"].includes(basename(path)) });
    await writeFile(join(scratch, "observe.sh"), observer);
    await chmod(join(scratch, "observe.sh"), 0o755);
    const hookFile = join(plugin, "hooks/cursor.json");
    const hooks: { hooks: Record<string, { command: string }[]> } = JSON.parse(await readFile(hookFile, "utf8"));
    for (const [event, entries] of Object.entries(hooks.hooks)) {
      entries.push({ command: `sh '${join(scratch, "observe.sh")}' ${event} '${log}' ${variable}` });
    }
    await writeFile(hookFile, JSON.stringify(hooks, null, 2));
    Bun.spawnSync(["git", "init", "-q", project]);
    await writeFile(join(project, "README.md"), "# Probe project\n");
    // Recording a typed on or off runs the candidate's mode script, the only command these chats may run.
    const modeScripts = [...new Set([plugin, await realpath(plugin)])].map((root) => `Shell(sh:*${root}/hooks/mode.sh*)`);
    await mkdir(join(project, ".cursor"));
    await writeFile(join(project, ".cursor/cli.json"), JSON.stringify({ permissions: { allow: modeScripts, deny: [] } }));

    async function run(prompt: string, env: Record<string, string>, readOnly: boolean) {
      const before = new Set(await readdir(log));
      const child = Bun.spawn(
        [cursor, "-p", ...(readOnly ? ["--mode", "ask"] : []), "--trust", "--plugin-dir", plugin, "--model", model!, "--output-format", "json", prompt],
        { cwd: project, env: { ...baseEnv, ...env }, stdin: "ignore", stdout: "pipe", stderr: "pipe" },
      );
      const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
      try {
        const [code, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]);
        assert.equal(code, 0, `Cursor exited with code ${code}: ${stderr || stdout}`);
        const result: unknown = JSON.parse(stdout.trim().split("\n").at(-1) ?? "");
        assert(typeof result === "object" && result !== null && "result" in result && typeof result.result === "string", `No final result in: ${stdout}`);
        const fired = (await readdir(log)).filter((name) => !before.has(name) && name.endsWith(".env")).sort();
        const hookEnv = await Promise.all(fired.map(async (name) => `${name.split("-")[0]}: ${(await readFile(join(log, name), "utf8")).trim().replaceAll("\n", ", ")}`));
        return { reply: result.result.trim(), hooks: hookEnv };
      } finally {
        clearTimeout(timer);
      }
    }

    async function flag() {
      const files = await readdir(join(state, pluginName, mode)).catch(() => []);
      return files.length === 0 ? "none" : (await readFile(join(state, pluginName, mode, files[0]!), "utf8")).split("\n")[0]!;
    }

    async function check(name: string, prompt: string, env: Record<string, string>, expect: (reply: string) => boolean | Promise<boolean>, readOnly = true) {
      try {
        const { reply, hooks: fired } = await run(prompt, env, readOnly);
        checks.push({ name, passed: await expect(reply), evidence: `reply ${JSON.stringify(reply.slice(0, 300))}; hooks [${fired.join("; ")}]; flag ${await flag()}` });
      } catch (error) {
        checks.push({ name, passed: false, evidence: error instanceof Error ? error.message : String(error) });
      }
    }

    const isOn = (reply: string) => /^\W*ON\W*$/.test(reply);
    const isOff = (reply: string) => /^\W*OFF\W*$/.test(reply);
    await check("skills: the mode and setup skills load, principles stay hidden",
      `List the names of every skill you can use whose name starts with ${mode}, setup, or principle-, comma-separated, and nothing else. Use no tools.`,
      {}, (reply) => reply.includes(mode) && reply.includes("setup") && !reply.includes("principle-"));
    await check("plugin files: the agent reads a principle file from the plugin",
      `Read ${join(plugin, "skills/principle-prove-it-works/SKILL.md")} and reply with only the value of its name field.`,
      {}, (reply) => reply.includes("principle-prove-it-works"));
    await check(`${variable}=on turns the mode on in a new chat`, onOrOff, { [variable]: "on" }, isOn);
    await check("no variable and no recorded choice leave the mode off", onOrOff, {}, isOff);
    await check(`typed /${mode} records on for the project`, `/${mode}`, {}, async () => (await flag()) === "on", false);
    await check("the recorded choice turns the mode on in the next chat", onOrOff, {}, isOn);
    await check(`typed /${mode} off records off for the project`, `/${mode} off`, {}, async () => (await flag()) === "off", false);
    await check(`a project turned off stays off under ${variable}=on`, onOrOff, { [variable]: "on" }, isOff);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
  process.stdout.write(`${JSON.stringify({ cursor: version, model, checks }, null, 2)}\n`);
  if (checks.some((check) => !check.passed)) process.exitCode = 1;
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
