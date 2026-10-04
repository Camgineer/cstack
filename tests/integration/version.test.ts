import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");

function inRepositoryCopy(run: (directory: string) => void): void {
  const directory = mkdtempSync(join(tmpdir(), "plugin version "));
  try {
    for (const entry of ["tools", "skills", ".claude-plugin", ".codex-plugin", ".cursor-plugin", ".agents"]) {
      cpSync(join(root, entry), join(directory, entry), { recursive: true, filter: (source) => basename(source) !== "node_modules" });
    }
    const metadata = join(directory, "tools/metadata.json");
    writeFileSync(metadata, readFileSync(metadata, "utf8").replace(/"version": "[^"]*"/, '"version": "1.4.2"'));
    const git = (...args: string[]) => spawnSync("git", args, { cwd: directory, encoding: "utf8" });
    git("init", "--quiet", "--initial-branch=main");
    git("add", ".");
    git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "--quiet", "--message", "base");
    expect(spawnSync(process.execPath, [join(directory, "tools/sync-hosts.ts")]).status).toBe(0);
    run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function version(directory: string, command: string, title: string) {
  return spawnSync(process.execPath, [join(directory, "tools/version.ts"), command, "--base", "main", "--title", title], {
    encoding: "utf8",
    timeout: 20_000,
  });
}

function shipped(directory: string): string {
  return JSON.parse(readFileSync(join(directory, ".claude-plugin/plugin.json"), "utf8")).version;
}

test("an unbumped change fails the check, and bump sets the level its PR title names", () => {
  inRepositoryCopy((directory) => {
    const unbumped = version(directory, "check", "feat(swarm): add lanes");
    expect(unbumped.status).toBe(1);
    expect(unbumped.stderr).toContain("Version is 1.4.2, but a minor change over main needs 1.5.0.");

    expect(version(directory, "bump", "feat(swarm): add lanes").status).toBe(0);
    expect(shipped(directory)).toBe("1.5.0");
    expect(version(directory, "bump", "feat(swarm): add lanes").status).toBe(0);
    expect(shipped(directory)).toBe("1.5.0");
    expect(version(directory, "check", "feat(swarm): add lanes").status).toBe(0);

    const retitled = version(directory, "check", "fix(swarm): drop lanes");
    expect(retitled.status).toBe(1);
    expect(retitled.stderr).toContain("Version is 1.5.0, but a patch change over main needs 1.4.3.");

    expect(version(directory, "bump", "docs: fix a typo").status).toBe(0);
    expect(shipped(directory)).toBe("1.4.3");
    expect(version(directory, "bump", "feat(cstack-mode)!: rename the mode").status).toBe(0);
    expect(shipped(directory)).toBe("2.0.0");
    expect(spawnSync(process.execPath, [join(directory, "tools/sync-hosts.ts"), "--check"]).status).toBe(0);
  });
});

test("a PR title outside the Conventional Commits types is rejected", () => {
  inRepositoryCopy((directory) => {
    const result = version(directory, "bump", "Update the readme");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('PR title "Update the readme" must be "type(scope): subject"');
    expect(shipped(directory)).toBe("1.4.2");
  });
});
