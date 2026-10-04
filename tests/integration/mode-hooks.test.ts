import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const pluginName: string = JSON.parse(readFileSync(join(root, "tools/metadata.json"), "utf8")).name;
const mode = `${pluginName}-mode`;
const hooks: { hooks: Record<string, { hooks: { command: string }[] }[]> } = JSON.parse(readFileSync(join(root, "hooks/hooks.json"), "utf8"));

// macOS ships a POSIX sed without GNU extensions such as `\|` in basic regexes. Where GNU sed is installed,
// run the hooks against its --posix mode so a GNU-only pattern fails here instead of on a user's Mac.
const posixBin = mkdtempSync(join(tmpdir(), "posix sed "));
const gnuSed = spawnSync("sh", ["-c", "command -v sed"], { encoding: "utf8" }).stdout.trim();
if (spawnSync(gnuSed, ["--posix", "-n", "p"], { input: "" }).status === 0) {
  writeFileSync(join(posixBin, "sed"), `#!/bin/sh\nexec '${gnuSed}' --posix "$@"\n`);
  chmodSync(join(posixBin, "sed"), 0o755);
}
const PATH = `${posixBin}:${process.env.PATH}`;
afterAll(() => rmSync(posixBin, { recursive: true, force: true }));

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

// Runs the command hooks.json registers for an event, the way a host does.
function fire(event: string, payload: Record<string, unknown>, state: string): string {
  const command = hooks.hooks[event]?.[0]?.hooks[0]?.command;
  if (command === undefined) throw new Error(`hooks.json registers no ${event} hook`);
  const result = spawnSync("sh", ["-c", command], {
    input: JSON.stringify(payload),
    env: { PATH, HOME: state, XDG_STATE_HOME: state, CLAUDE_PLUGIN_ROOT: root },
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
  expect(result.stderr).toBe("");
  return result.stdout;
}

function context(output: string): string {
  return output === "" ? "" : JSON.parse(output).hookSpecificOutput.additionalContext;
}

function cli(args: string[], cwd: string, state: string): string {
  const result = spawnSync("sh", [join(root, "hooks/mode.sh"), ...args], { cwd, env: { PATH, HOME: state, XDG_STATE_HOME: state }, encoding: "utf8" });
  expect(result.status).toBe(0);
  return result.stdout;
}

describe("persistent mode hooks", () => {
  test("a typed command keeps the mode on across new sessions and compaction until the user turns it off", () => {
    withProject((project, state) => {
      expect(context(fire("SessionStart", { cwd: project, source: "startup" }, state))).toBe("");

      const on = context(fire("UserPromptSubmit", { cwd: project, prompt: `/${pluginName}:${mode} fix the "export" bug\nthen ship it` }, state));
      expect(on).toContain("now on");

      for (const source of ["startup", "resume", "clear", "compact"]) {
        const restored = context(fire("SessionStart", { cwd: join(project, "src"), source }, state));
        expect(restored).toContain(`Invoke the ${pluginName}:${mode} skill now`);
        expect(restored).toContain(join(root, "skills", mode, "SKILL.md"));
      }

      expect(context(fire("UserPromptSubmit", { cwd: project, prompt: `$${pluginName}:${mode} off` }, state))).toContain("now off");
      expect(context(fire("SessionStart", { cwd: project, source: "compact" }, state))).toBe("");
    });
  });

  test("prompts that only mention the mode leave it alone", () => {
    withProject((project, state) => {
      for (const prompt of [`please use ${mode}`, `/${pluginName}:${mode}s`, `see /${pluginName}:${mode}`]) {
        expect(fire("UserPromptSubmit", { cwd: project, prompt }, state)).toBe("");
      }
      expect(context(fire("SessionStart", { cwd: project, source: "startup" }, state))).toBe("");
    });
  });

  test("the agent can turn the mode off from a subdirectory when the user asks in plain words", () => {
    withProject((project, state) => {
      fire("UserPromptSubmit", { cwd: project, prompt: `/${mode}` }, state);
      expect(cli(["status"], join(project, "src"), state)).toContain("is on");
      cli(["off"], join(project, "src"), state);
      expect(context(fire("SessionStart", { cwd: project, source: "resume" }, state))).toBe("");
    });
  });
});
