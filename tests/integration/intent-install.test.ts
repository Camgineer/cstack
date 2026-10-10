import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const script = join(root, "hooks/intent-install.sh");

function withHome(run: (home: string) => void): void {
  const home = mkdtempSync(join(tmpdir(), "intent home "));
  try {
    run(home);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

function install(home: string, from = script) {
  return spawnSync("sh", [from], { env: { PATH: process.env.PATH, HOME: home }, encoding: "utf8" });
}

function visibleSkills(): string[] {
  return readdirSync(join(root, "skills"))
    .filter((name) => existsSync(join(root, "skills", name, "SKILL.md")))
    .filter((name) => !/^disable-model-invocation: true$/m.test(readFileSync(join(root, "skills", name, "SKILL.md"), "utf8").split("\n---\n")[0] ?? ""))
    .sort();
}

test("links every visible skill and both personas into Intent, and no principle", () => {
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
    expect(readdirSync(specialists).sort()).toEqual(["comment-sicko.md", "cstack-agent.md"]);
    expect(readlinkSync(join(specialists, "cstack-agent.md"))).toBe(join(root, "agents/cstack-agent.md"));

    const rerun = install(home);
    expect(rerun.status).toBe(0);
    expect(rerun.stdout).toBe("");
  });
});

test("an update drops links to removed or hidden skills and keeps the person's own entries", () => {
  withHome((home) => {
    const skills = join(home, ".intent/skills");
    mkdirSync(join(skills, "align"), { recursive: true });
    symlinkSync(join(root, "skills/retired"), join(skills, "retired"));
    symlinkSync(join(root, "skills/principle-laziness-protocol"), join(skills, "principle-laziness-protocol"));
    mkdirSync(join(home, "elsewhere/how"), { recursive: true });
    symlinkSync(join(home, "elsewhere/how"), join(skills, "how"));

    const result = install(home);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain(`removed ${join(skills, "retired")}\n`);
    expect(result.stdout).toContain(`removed ${join(skills, "principle-laziness-protocol")}\n`);
    expect(result.stderr).toBe(
      `kept ${join(skills, "align")}: it is not a link into this plugin\n` +
        `kept ${join(skills, "how")}: it is not a link into this plugin\n`,
    );

    const linked = readdirSync(skills);
    expect(linked).not.toContain("retired");
    expect(linked).not.toContain("principle-laziness-protocol");
    expect(readdirSync(join(skills, "align"))).toEqual([]);
    expect(readlinkSync(join(skills, "how"))).toBe(join(home, "elsewhere/how"));
    expect(readlinkSync(join(skills, "cstack-mode"))).toBe(join(root, "skills/cstack-mode"));
  });
});

test("follows a link to the script back to its checkout", () => {
  withHome((home) => {
    mkdirSync(join(home, "bin"));
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
  symlinkSync("../cstack/hooks/intent-install.sh", join(bin, "cstack-intent"));
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
    expect(result.stdout.split("\n")[0]).toBe(`copied the plugin to ${copy}`);
    expect(readlinkSync(join(skills, "cstack-mode"))).toBe(join(copy, "skills/cstack-mode"));
    expect(readlinkSync(join(home, ".intent/specialists/cstack-agent.md"))).toBe(join(copy, "agents/cstack-agent.md"));
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
    expect(install(home, join(home, "alias/hooks/intent-install.sh")).status).toBe(0);

    const skills = join(home, ".intent/skills");
    expect(readlinkSync(join(skills, "cstack-mode"))).toBe(join(realpathSync(checkout), "skills/cstack-mode"));
    const again = install(home, join(checkout, "hooks/intent-install.sh"));
    expect(again.status).toBe(0);
    expect(again.stdout).toBe("");

    const moved = join(home, "moved checkout");
    renameSync(checkout, moved);
    const afterMove = install(home, join(moved, "hooks/intent-install.sh"));
    expect(afterMove.stderr).toBe("");
    expect(afterMove.status).toBe(0);
    expect(readlinkSync(join(skills, "cstack-mode"))).toBe(join(realpathSync(moved), "skills/cstack-mode"));
    expect(readlinkSync(join(home, ".intent/specialists/cstack-agent.md"))).toBe(join(realpathSync(moved), "agents/cstack-agent.md"));
    expect(readdirSync(skills).sort()).toEqual(visibleSkills());
  });
});

test("the first install turns the mode on through Intent's personal rule, and an update leaves the rule alone", () => {
  withHome((home) => {
    const bin = join(home, "bin");
    mkdirSync(bin);
    writeFileSync(join(bin, "intentd"), `#!/bin/sh
case "$2" in
  rules.get) printf '{"enabled":false,"content":"","updatedAt":0}' ;;
  rules.update) printf '%s\\n' "$4" >> "${join(home, "updates")}"; printf '{}' ;;
esac
case "$1" in settings) echo 'git.autoCommit = false' ;; esac
`, { mode: 0o755 });
    const run = () => spawnSync("sh", [script], { env: { PATH: `${bin}:${process.env.PATH}`, HOME: home }, encoding: "utf8" });

    expect(run().stdout).toContain("added the cstack-mode rule to Intent's Settings, under Agent Behavior\n");
    const update = JSON.parse(readFileSync(join(home, "updates"), "utf8"));
    expect(update).toEqual({
      workspaceId: "global",
      ruleType: "workspace",
      enabled: true,
      content: "Before any other step, read the `cstack-mode` skill's SKILL.md from your skills list and follow it for the rest of the session.",
    });

    expect(run().stdout).toBe("");
    expect(readFileSync(join(home, "updates"), "utf8").trim().split("\n")).toHaveLength(1);
  });
});
