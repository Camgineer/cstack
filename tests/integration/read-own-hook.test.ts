import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repo = resolve(import.meta.dir, "../..");
const hooks: { hooks: Record<string, { matcher?: string; hooks: { command: string }[] }[]> } = JSON.parse(readFileSync(join(repo, "hooks/hooks.json"), "utf8"));

// Installs the hook into a scratch plugin root so symlinks and siblings can sit beside it.
function withPlugin(run: (root: string, outside: string) => void): void {
  const scratch = mkdtempSync(join(tmpdir(), "read own "));
  try {
    const root = join(scratch, "plugin");
    mkdirSync(join(root, "hooks"), { recursive: true });
    mkdirSync(join(root, "skills/mode/references"), { recursive: true });
    copyFileSync(join(repo, "hooks/read-own.sh"), join(root, "hooks/read-own.sh"));
    writeFileSync(join(root, "skills/mode/references/runtime.md"), "contract\n");
    const outside = join(scratch, "plugin-evil");
    mkdirSync(outside);
    writeFileSync(join(outside, "secret"), "secret\n");
    symlinkSync(join(outside, "secret"), join(root, "skills/mode/link"));
    symlinkSync(outside, join(root, "skills/escape"));
    run(root, outside);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

function decision(root: string, file: string): string {
  const entry = hooks.hooks.PreToolUse?.find((hook) => hook.matcher === "Read");
  if (entry === undefined) throw new Error("hooks.json registers no PreToolUse hook for Read");
  const result = spawnSync("sh", ["-c", entry.hooks[0]!.command], {
    input: JSON.stringify({ tool_name: "Read", tool_input: { file_path: file } }),
    env: { PATH: process.env.PATH, CLAUDE_PLUGIN_ROOT: root },
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
  expect(result.stderr).toBe("");
  return result.stdout === "" ? "ask" : JSON.parse(result.stdout).hookSpecificOutput.permissionDecision;
}

describe("plugin self-read hook", () => {
  test("allows reading the plugin's own files", () => {
    withPlugin((root) => {
      expect(decision(root, join(root, "skills/mode/references/runtime.md"))).toBe("allow");
      expect(decision(root, join(root, "skills/mode/references/../references/runtime.md"))).toBe("allow");
    });
  });

  test("leaves every read outside the plugin root to the host's permissions", () => {
    withPlugin((root, outside) => {
      for (const file of [
        join(outside, "secret"),
        join(root, "skills/mode/../../../plugin-evil/secret"),
        join(root, "skills/mode/link"),
        join(root, "skills/escape/secret"),
        "skills/mode/references/runtime.md",
      ]) {
        expect(decision(root, file)).toBe("ask");
      }
    });
  });
});
