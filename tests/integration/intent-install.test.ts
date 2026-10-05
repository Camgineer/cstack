import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, realpathSync, renameSync, rmSync, symlinkSync } from "node:fs";
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

test("refuses to run through a link from outside the plugin checkout", () => {
  withHome((home) => {
    mkdirSync(join(home, "bin"));
    symlinkSync(script, join(home, "bin/intent-install"));

    const result = install(home, join(home, "bin/intent-install"));
    expect(result.status).toBe(2);
    expect(result.stderr).toBe("Run intent-install from inside the plugin checkout, not through a link to it.\n");
    expect(existsSync(join(home, ".intent"))).toBe(false);
  });
});

test("a checkout reached through an alias, then moved, keeps working links", () => {
  withHome((home) => {
    const checkout = join(home, "plugin checkout");
    for (const entry of ["agents", "hooks", "skills", "tools"]) {
      cpSync(join(root, entry), join(checkout, entry), { recursive: true, filter: (source) => !source.includes("node_modules") });
    }
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
