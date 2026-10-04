import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const pluginName: string = JSON.parse(readFileSync(join(root, "tools/metadata.json"), "utf8")).name;
const mode = `${pluginName}-mode`;
const variable = mode.toUpperCase().replaceAll("-", "_");
const hooks: { hooks: Record<string, { hooks: { command: string }[] }[]> } = JSON.parse(readFileSync(join(root, "hooks/hooks.json"), "utf8"));
const cursorHooks: { hooks: Record<string, { command: string }[]> } = JSON.parse(readFileSync(join(root, "hooks/cursor.json"), "utf8"));

function withProject(run: (project: string, state: string) => void): void {
  const scratch = mkdtempSync(join(tmpdir(), "mode hooks "));
  try {
    const project = join(scratch, "consumer project");
    spawnSync("mkdir", ["-p", join(project, "src")]);
    spawnSync("git", ["init", "-q", project]);
    run(project, join(scratch, "state"));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

function run(command: string, payload: Record<string, unknown>, env: Record<string, string>): string {
  const result = spawnSync("sh", ["-c", command], { input: JSON.stringify(payload), env: { PATH: process.env.PATH, ...env }, encoding: "utf8" });
  expect(result.status).toBe(0);
  expect(result.stderr).toBe("");
  return result.stdout;
}

function fireHooksJson(event: string, payload: Record<string, unknown>, state: string, env: Record<string, string> = {}): string {
  const command = hooks.hooks[event]?.[0]?.hooks[0]?.command;
  if (command === undefined) throw new Error(`hooks.json registers no ${event} hook`);
  return run(command, { hook_event_name: event, ...payload }, { HOME: state, XDG_STATE_HOME: state, CLAUDE_PLUGIN_ROOT: root, ...env });
}

// Cursor's sessionStart input has no cwd. It sets CLAUDE_PROJECT_DIR as a compatibility alias for the project dir.
function fireCursorStart(project: string, state: string, env: Record<string, string> = {}): string {
  const command = cursorHooks.hooks.sessionStart?.[0]?.command;
  if (command === undefined) throw new Error("cursor.json registers no sessionStart hook");
  const output = run(command, { hook_event_name: "sessionStart", session_id: "s", workspace_roots: [project] }, { HOME: state, XDG_STATE_HOME: state, CURSOR_PLUGIN_ROOT: root, CLAUDE_PROJECT_DIR: project, ...env });
  return output === "" ? "" : JSON.parse(output).additional_context;
}

function context(output: string): string {
  return output === "" ? "" : JSON.parse(output).hookSpecificOutput.additionalContext;
}

function cli(args: string[], cwd: string, state: string): string {
  const result = spawnSync("sh", [join(root, "hooks/mode.sh"), ...args], { cwd, env: { PATH: process.env.PATH, HOME: state, XDG_STATE_HOME: state }, encoding: "utf8" });
  expect(result.status).toBe(0);
  return result.stdout;
}

describe("persistent mode hooks", () => {
  test("a typed command keeps the mode on across new sessions and compaction until the user turns it off", () => {
    withProject((project, state) => {
      expect(context(fireHooksJson("SessionStart", { cwd: project, source: "startup" }, state))).toBe("");

      const on = context(fireHooksJson("UserPromptSubmit", { cwd: project, prompt: `/${pluginName}:${mode} fix the "export" bug\nthen ship it` }, state));
      expect(on).toContain("now on");

      for (const source of ["startup", "resume", "clear", "compact"]) {
        const restored = context(fireHooksJson("SessionStart", { cwd: join(project, "src"), source }, state));
        expect(restored).toContain(`Invoke the ${pluginName}:${mode} skill now`);
        expect(restored).toContain(join(root, "skills", mode, "SKILL.md"));
      }

      expect(context(fireHooksJson("UserPromptSubmit", { cwd: project, prompt: `$${pluginName}:${mode} off` }, state))).toContain("now off");
      expect(context(fireHooksJson("SessionStart", { cwd: project, source: "compact" }, state))).toBe("");
    });
  });

  test("prompts that only mention the mode leave it alone", () => {
    withProject((project, state) => {
      for (const prompt of [`please use ${mode}`, `/${pluginName}:${mode}s`, `see /${pluginName}:${mode}`]) {
        expect(fireHooksJson("UserPromptSubmit", { cwd: project, prompt }, state)).toBe("");
      }
      expect(context(fireHooksJson("SessionStart", { cwd: project, source: "startup" }, state))).toBe("");
    });
  });

  test("the agent can turn the mode off from a subdirectory when the user asks in plain words", () => {
    withProject((project, state) => {
      fireHooksJson("UserPromptSubmit", { cwd: project, prompt: `/${mode}` }, state);
      expect(cli(["status"], join(project, "src"), state)).toContain("is on");
      cli(["off"], join(project, "src"), state);
      expect(context(fireHooksJson("SessionStart", { cwd: project, source: "resume" }, state))).toBe("");
    });
  });

  test(`${variable}=on turns the mode on at session start in every host, with no typed command`, () => {
    withProject((project, state) => {
      const on = { [variable]: "on" };
      const claude = context(fireHooksJson("SessionStart", { cwd: project, source: "startup" }, state, on));
      expect(claude).toContain(`Invoke the ${pluginName}:${mode} skill now`);
      expect(claude).toContain(`unset ${variable}`);
      expect(fireCursorStart(project, state, on)).toBe(claude);

      for (const value of ["", "off", "1", "ON"]) {
        expect(fireHooksJson("SessionStart", { cwd: project, source: "startup" }, state, { [variable]: value })).toBe("");
        expect(fireCursorStart(project, state, { [variable]: value })).toBe("");
      }
    });
  });

  test("Cursor restores a mode the user turned on for the project", () => {
    withProject((project, state) => {
      expect(fireCursorStart(project, state)).toBe("");
      cli(["on"], join(project, "src"), state);
      expect(fireCursorStart(project, state)).toContain(`run: sh '${join(root, "hooks/mode.sh")}' off`);
    });
  });

  test(`turning the mode off while ${variable}=on says the variable brings it back`, () => {
    withProject((project, state) => {
      const off = context(fireHooksJson("UserPromptSubmit", { cwd: project, prompt: `/${mode} off` }, state, { [variable]: "on" }));
      expect(off).toContain("now off");
      expect(off).toContain(`${variable}=on in the environment turns it back on in new sessions`);
    });
  });
});
