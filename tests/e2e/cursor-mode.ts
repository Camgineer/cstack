#!/usr/bin/env bun
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chmod, cp, mkdir, mkdtemp, readdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, join } from "node:path";
import { parseArgs } from "node:util";

const source = join(import.meta.dir, "../..");
const pluginName: string = JSON.parse(readFileSync(join(source, "tools/metadata.json"), "utf8")).name;
const mode = `${pluginName}-mode`;
const variable = mode.toUpperCase().replaceAll("-", "_");

const observer = `#!/bin/sh
f="$2/$1-$(date +%s)-$$"
cat > "$f.json"
printf '%s=%s\\nCURSOR_PLUGIN_ROOT=%s\\nXDG_STATE_HOME=%s\\n' "$3" "$(printenv "$3")" "\${CURSOR_PLUGIN_ROOT-}" "\${XDG_STATE_HOME-}" > "$f.env"
case $1 in beforeSubmitPrompt) printf '{"continue":true}\\n' ;; *) printf '{}\\n' ;; esac
`;

const askWhetherHookSaidOn = `If your context says that ${mode} is on for this project, reply with the word ON and then the path of the mode script that context names, and nothing else. Otherwise reply with only the word OFF. Use no tools.`;

type Check = { name: string; passed: boolean; evidence: string };
type Chat = { reply: string; modeScriptSays: string };

// Cursor's CLI also loads the plugins Claude Code installed, unless the project's .claude/settings.json turns one off.
async function turnOffInstalledCopies(project: string) {
  const installed: unknown = await readFile(join(homedir(), ".claude/plugins/installed_plugins.json"), "utf8").then(JSON.parse).catch(() => null);
  const plugins: Record<string, unknown> = typeof installed === "object" && installed !== null && "plugins" in installed && typeof installed.plugins === "object" && installed.plugins !== null ? { ...installed.plugins } : {};
  const copies = Object.entries(plugins).filter(([id]) => id.split("@")[0] === pluginName);
  await mkdir(join(project, ".claude"));
  await writeFile(join(project, ".claude/settings.json"), JSON.stringify({ enabledPlugins: Object.fromEntries(copies.map(([id]) => [id, false])) }));
  return copies.map(([id]) => id);
}

async function copiesTheHarnessCannotTurnOff() {
  const root = join(homedir(), ".cursor/plugins");
  const found = await Promise.all(["local/*", "cache/*/*/*"].map((copy) =>
    Array.fromAsync(new Bun.Glob(`${copy}/skills/${mode}/SKILL.md`).scan({ cwd: root, followSymlinks: true })).catch(() => [])));
  return found.flat().map((path) => join(root, path, "../../.."));
}

async function main() {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      cursor: { type: "string", default: "cursor-agent" },
      model: { type: "string" },
      "timeout-seconds": { type: "string", default: "300" },
      "allow-account-runs": { type: "boolean", default: false },
    },
  });
  if (!values["allow-account-runs"]) {
    throw new Error("Each check runs Cursor on the signed-in account, which needs the user's authorization and --allow-account-runs");
  }
  const cursor = values.cursor;
  const model = values.model;
  assert(model, "Pass --model with a model the account allows; `cursor-agent --list-models` lists them");
  const timeoutMs = Number(values["timeout-seconds"]) * 1000;
  assert(timeoutMs > 0, "Pass --timeout-seconds with the number of seconds to wait for each chat");

  const scratch = await mkdtemp(join(tmpdir(), "cursor-mode-"));
  // On macOS the person's ~/.zshenv set the variable in Cursor's hooks, so an empty ZDOTDIR keeps zsh from reading it.
  const zdotdir = join(scratch, "zdotdir");
  const baseEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) if (value !== undefined && key !== variable) baseEnv[key] = value;
  Object.assign(baseEnv, { ZDOTDIR: zdotdir, XDG_STATE_HOME: join(scratch, "state") });
  await mkdir(zdotdir);

  const status = Bun.spawnSync([cursor, "status"], { env: baseEnv, stdout: "pipe", stderr: "pipe" });
  const signedIn = `${status.stdout}${status.stderr}`;
  if (!/logged in/i.test(signedIn) || /not logged in/i.test(signedIn)) {
    await rm(scratch, { recursive: true, force: true });
    throw new Error(`Cursor is not signed in: ${signedIn.trim()}`);
  }
  const version = Bun.spawnSync([cursor, "--version"], { env: baseEnv, stdout: "pipe" }).stdout.toString().trim();

  const plugin = join(scratch, pluginName);
  const project = join(scratch, "project");
  const state = baseEnv.XDG_STATE_HOME;
  const log = join(scratch, "hook-log");
  const transcripts = await mkdtemp(join(tmpdir(), "cursor-mode-transcripts-"));
  const checks: Check[] = [];
  let installedCopies: { turnedOff: string[]; stillLoaded: string[] } = { turnedOff: [], stillLoaded: [] };
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
    installedCopies = { turnedOff: await turnOffInstalledCopies(project), stillLoaded: await copiesTheHarnessCannotTurnOff() };
    const candidateRoots = [...new Set([plugin, await realpath(plugin)])];
    const candidateScripts = candidateRoots.map((root) => `${root}/hooks/mode.sh`);
    const copyPath = new RegExp(`[^"'\\s\\\\]*/(?:skills/${mode}|hooks/mode\\.sh)`, "g");
    const typedCommandAllowList = candidateScripts.map((script) => `Shell(sh:*${script}*)`);
    await mkdir(join(project, ".cursor"));
    await writeFile(join(project, ".cursor/cli.json"), JSON.stringify({ permissions: { allow: typedCommandAllowList, deny: [] } }));

    async function run(prompt: string, env: Record<string, string>, readOnly: boolean) {
      const before = new Set(await readdir(log));
      const child = Bun.spawn(
        [cursor, "-p", ...(readOnly ? ["--mode", "ask"] : []), "--trust", "--plugin-dir", plugin, "--model", model!, "--output-format", "stream-json", prompt],
        { cwd: project, env: { ...baseEnv, ...env }, stdin: "ignore", stdout: "pipe", stderr: "pipe" },
      );
      const output = Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]);
      let timer: Timer | undefined;
      const timedOut = new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          child.kill("SIGKILL");
          resolve(null);
        }, timeoutMs);
      });
      const transcript = join(transcripts, `${String(checks.length + 1).padStart(2, "0")}.jsonl`);
      try {
        const finished = await Promise.race([output, timedOut]);
        // A process the CLI started can hold the pipes open after the kill, so wait only briefly for what it wrote.
        const [code, stdout, stderr] = finished ?? (await Promise.race([output, Bun.sleep(5000).then(() => [null, "", ""] as const)]));
        await writeFile(transcript, `${stdout}${stderr}`);
        assert(finished, `Cursor gave no result within ${timeoutMs / 1000}s; ${transcript} holds what it wrote`);
        assert.equal(code, 0, `Cursor exited with code ${code}: ${stderr || stdout}`);
        const events: Record<string, unknown>[] = stdout.trim().split("\n").map((line) => JSON.parse(line));
        const result = events.findLast((event) => event.type === "result")?.result;
        assert(typeof result === "string", `No final result in: ${stdout}`);
        const calls = events.filter((event) => event.type === "tool_call" && event.subtype === "started").map((event) => JSON.stringify(event.tool_call));
        const otherCopies = [...new Set(calls.flatMap((call) => call.match(copyPath) ?? []))].filter((path) => /^[/~]/.test(path) && !candidateRoots.some((root) => path.startsWith(`${root}/`)));
        const fired = (await readdir(log)).filter((name) => !before.has(name) && name.endsWith(".env")).sort();
        const hookEnv = await Promise.all(fired.map(async (name) => `${name.split("-")[0]}: ${(await readFile(join(log, name), "utf8")).trim().replaceAll("\n", ", ")}`));
        return { reply: result.trim(), hooks: hookEnv, tools: calls.map((call) => call.slice(0, 400)), otherCopies };
      } finally {
        clearTimeout(timer);
      }
    }

    async function flag() {
      const files = await readdir(join(state, pluginName, mode)).catch(() => []);
      return files.length === 0 ? "none" : (await readFile(join(state, pluginName, mode, files[0]!), "utf8")).split("\n")[0]!;
    }

    function modeScript(command: "on" | "off" | "status", env: Record<string, string>) {
      const script = Bun.spawnSync(["sh", candidateScripts[0]!, command], { cwd: project, env: { ...baseEnv, ...env }, stdout: "pipe", stderr: "pipe" });
      return script.exitCode === 0 ? script.stdout.toString().trim() : `failed with code ${script.exitCode}: ${script.stderr.toString().trim()}`;
    }

    function record(choice: "on" | "off") {
      const said = modeScript(choice, {});
      assert(said.startsWith(`${mode} is ${choice} for `), `The harness could not record ${choice} before this chat: the candidate's mode script ${said}`);
    }

    async function check(name: string, prompt: string, env: Record<string, string>, expect: (chat: Chat) => boolean | Promise<boolean>, { readOnly = true, before = () => {} } = {}) {
      try {
        before();
        const { reply, hooks: fired, tools, otherCopies } = await run(prompt, env, readOnly);
        const modeScriptSays = modeScript("status", env);
        // Only the candidate's hooks file names the observer, so a chat where it never ran shows nothing about the candidate.
        const candidateLoaded = fired.some((hook) => hook.startsWith("sessionStart:"));
        const passed = candidateLoaded && otherCopies.length === 0 && installedCopies.stillLoaded.length === 0 && (await expect({ reply, modeScriptSays }));
        checks.push({ name, passed, evidence: `reply ${JSON.stringify(reply.slice(0, 300))}; tools [${tools.join("; ")}]; other copies named in tool calls [${otherCopies.join("; ")}]; hooks [${fired.join("; ")}]${candidateLoaded ? "" : " (the candidate's session hook did not fire, so the check fails)"}; flag ${await flag()}; mode script status ${JSON.stringify(modeScriptSays)}` });
      } catch (error) {
        checks.push({ name, passed: false, evidence: error instanceof Error ? error.message : String(error) });
      }
    }

    const principle = join(plugin, "skills/principle-prove-it-works/SKILL.md");
    // The file's own heading repeats its folder name, so a token marks a reply that came from reading the candidate's copy.
    const heading = `Probe ${crypto.randomUUID().slice(0, 8)}`;
    await writeFile(principle, (await readFile(principle, "utf8")).replace(/^# .+$/m, `# ${heading}`));
    const isOn = ({ reply }: Chat) => /^\W*ON\b/.test(reply) && candidateRoots.some((root) => reply.includes(`${root}/`));
    const isOff = ({ reply, modeScriptSays }: Chat) => /^\W*OFF\W*$/.test(reply) && modeScriptSays.startsWith(`${mode} is off for `);
    await check("skills: the mode and setup skills load, principles stay hidden",
      `List the names of every skill you can use whose name starts with ${mode}, setup, or principle-, comma-separated, and nothing else. Use no tools.`,
      {}, ({ reply }) => reply.includes(mode) && reply.includes("setup") && !reply.includes("principle-"));
    await check("plugin files: the agent reads a principle file from the plugin",
      `Read ${principle} and reply with only the text of its first heading.`,
      {}, ({ reply }) => reply.includes(heading));
    await check(`${variable}=on turns the mode on in a new chat`, askWhetherHookSaidOn, { [variable]: "on" }, isOn);
    await check("no variable and no recorded choice leave the mode off", askWhetherHookSaidOn, {}, isOff);
    await check(`typed /${mode} records on for the project`, `/${mode}`, {}, async () => (await flag()) === "on", { readOnly: false });
    await check("a recorded on turns the mode on in the next chat", askWhetherHookSaidOn, {}, isOn, { before: () => record("on") });
    await check(`typed /${mode} off records off for the project`, `/${mode} off`, {}, async () => (await flag()) === "off", { readOnly: false });
    await check(`a project turned off stays off under ${variable}=on`, askWhetherHookSaidOn, { [variable]: "on" }, isOff, { before: () => record("off") });
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
  process.stdout.write(`${JSON.stringify({ cursor: version, model, installedCopies, transcripts, checks }, null, 2)}\n`);
  if (checks.some((check) => !check.passed)) process.exitCode = 1;
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
  process.exit();
}
