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
    expect(git("init", "--quiet", "--initial-branch=main").status).toBe(0);
    expect(git("add", ".").status).toBe(0);
    expect(git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "--quiet", "--message", "base").status).toBe(0);
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
    for (const title of ["Update the readme", "constructor: inherit a type"]) {
      const result = version(directory, "bump", title);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`PR title "${title}" must be "type(scope): subject"`);
    }
    expect(shipped(directory)).toBe("1.4.2");
    expect(version(directory, "bump", "revert: undo the lanes (#12)").status).toBe(0);
    expect(shipped(directory)).toBe("1.4.3");
  });
});

test("merge takes the base's version files, keeps both sides' other changes, and bumps over the base", () => {
  inRepositoryCopy((directory) => {
    const git = (...args: string[]) => spawnSync("git", ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", ...args], { cwd: directory, encoding: "utf8" });
    const metadata = join(directory, "tools/metadata.json");
    expect(git("add", "-A").status).toBe(0);
    expect(git("commit", "--quiet", "--message", "synced").status).toBe(0);

    expect(git("checkout", "--quiet", "-b", "lanes").status).toBe(0);
    writeFileSync(join(directory, "skills/lanes.md"), "lanes\n");
    writeFileSync(metadata, readFileSync(metadata, "utf8").replace(/"license": "[^"]*"/, '"license": "Apache-2.0"'));
    expect(version(directory, "bump", "feat(swarm): add lanes").status).toBe(0);
    expect(git("add", "-A").status).toBe(0);
    expect(git("commit", "--quiet", "--message", "lanes").status).toBe(0);

    expect(git("checkout", "--quiet", "main").status).toBe(0);
    writeFileSync(metadata, readFileSync(metadata, "utf8").replace(/"description": "[^"]*"/, '"description": "A changed description."'));
    expect(version(directory, "bump", "fix: change the description").status).toBe(0);
    expect(git("add", "-A").status).toBe(0);
    expect(git("commit", "--quiet", "--message", "description").status).toBe(0);

    expect(git("checkout", "--quiet", "lanes").status).toBe(0);
    writeFileSync(join(directory, "notes.txt"), "draft\n");
    const dirty = version(directory, "merge", "feat(swarm): add lanes");
    expect(dirty.status).toBe(1);
    expect(dirty.stderr).toContain("Commit or stash your changes");
    rmSync(join(directory, "notes.txt"));
    const merged = version(directory, "merge", "feat(swarm): add lanes");
    expect(merged.stderr).toBe("");
    expect(merged.status).toBe(0);
    expect(shipped(directory)).toBe("1.5.0");
    expect(readFileSync(metadata, "utf8")).toContain('"description": "A changed description."');
    expect(readFileSync(metadata, "utf8")).toContain('"license": "Apache-2.0"');
    expect(readFileSync(join(directory, "skills/lanes.md"), "utf8")).toBe("lanes\n");
    expect(git("status", "--porcelain").stdout).toBe("");
    expect(git("rev-list", "--parents", "-n", "1", "HEAD").stdout.trim().split(" ")).toHaveLength(3);
    expect(spawnSync(process.execPath, [join(directory, "tools/sync-hosts.ts"), "--check"]).status).toBe(0);
  });
});

test("merge resolves the version files and stops on any other conflict", () => {
  inRepositoryCopy((directory) => {
    const git = (...args: string[]) => spawnSync("git", ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", ...args], { cwd: directory, encoding: "utf8" });
    const shared = join(directory, "skills/shared.md");
    writeFileSync(shared, "base\n");
    expect(git("add", "-A").status).toBe(0);
    expect(git("commit", "--quiet", "--message", "shared").status).toBe(0);

    expect(git("checkout", "--quiet", "-b", "lanes").status).toBe(0);
    writeFileSync(shared, "lanes\n");
    expect(version(directory, "bump", "feat(swarm): add lanes").status).toBe(0);
    expect(git("add", "-A").status).toBe(0);
    expect(git("commit", "--quiet", "--message", "lanes").status).toBe(0);

    expect(git("checkout", "--quiet", "main").status).toBe(0);
    writeFileSync(shared, "main\n");
    expect(version(directory, "bump", "fix: edit shared").status).toBe(0);
    expect(git("add", "-A").status).toBe(0);
    expect(git("commit", "--quiet", "--message", "main").status).toBe(0);

    expect(git("checkout", "--quiet", "lanes").status).toBe(0);
    const merged = version(directory, "merge", "feat(swarm): add lanes");
    expect(merged.status).toBe(1);
    expect(merged.stderr).toContain("skills/shared.md");
    expect(git("diff", "--name-only", "--diff-filter=U").stdout.trim()).toBe("skills/shared.md");
  });
});
