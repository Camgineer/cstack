import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");

type Git = (...args: string[]) => ReturnType<typeof spawnSync>;

function inRepositoryCopy(run: (directory: string, git: Git) => void): void {
  const directory = mkdtempSync(join(tmpdir(), "plugin version "));
  try {
    for (const entry of ["tools", "skills", ".claude-plugin", ".codex-plugin", ".cursor-plugin", ".agents"]) {
      cpSync(join(root, entry), join(directory, entry), { recursive: true, filter: (source) => basename(source) !== "node_modules" });
    }
    const metadata = join(directory, "tools/metadata.json");
    writeFileSync(metadata, readFileSync(metadata, "utf8").replace(/"version": "[^"]*"/, '"version": "1.4.2"'));
    expect(spawnSync(process.execPath, [join(directory, "tools/sync-hosts.ts")]).status).toBe(0);
    const git: Git = (...args) => spawnSync("git", ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", ...args], { cwd: directory, encoding: "utf8" });
    expect(git("init", "--quiet", "--initial-branch=main").status).toBe(0);
    expect(git("add", ".").status).toBe(0);
    expect(git("commit", "--quiet", "--message", "base").status).toBe(0);
    run(directory, git);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function merge(git: Git, subject: string): void {
  expect(git("commit", "--quiet", "--allow-empty", "--message", subject).status).toBe(0);
}

function version(directory: string, ...args: string[]) {
  return spawnSync(process.execPath, [join(directory, "tools/version.ts"), ...args], { cwd: directory, encoding: "utf8", timeout: 20_000 });
}

function shipped(directory: string): string {
  return JSON.parse(readFileSync(join(directory, ".claude-plugin/plugin.json"), "utf8")).version;
}

test("release bumps once per change merged since the last tag, by each PR title, and skips release commits", () => {
  inRepositoryCopy((directory, git) => {
    expect(git("tag", "v1.4.2").status).toBe(0);
    merge(git, "feat(swarm): add lanes (#12)");
    merge(git, "chore(release): v1.5.0");
    merge(git, "fix(swarm): drop a lane (#13)");
    merge(git, "Update the readme");

    const released = version(directory, "release");
    expect(released.status).toBe(0);
    expect(released.stdout).toContain("Version set to 1.5.2 for 3 change(s) since v1.4.2.");
    expect(released.stderr).toContain('"Update the readme" has no Conventional Commits type, so it counts as a patch.');
    expect(shipped(directory)).toBe("1.5.2");
    expect(spawnSync(process.execPath, [join(directory, "tools/sync-hosts.ts"), "--check"]).status).toBe(0);
  });
});

test("release takes the tag's version as its base, even when a PR edited the version itself", () => {
  inRepositoryCopy((directory, git) => {
    expect(git("tag", "v1.4.2").status).toBe(0);
    const metadata = join(directory, "tools/metadata.json");
    writeFileSync(metadata, readFileSync(metadata, "utf8").replace(/"version": "[^"]*"/, '"version": "9.9.9"'));
    expect(git("commit", "--quiet", "--all", "--message", "feat(cstack-mode)!: rename the mode (#14)").status).toBe(0);

    expect(version(directory, "release").status).toBe(0);
    expect(shipped(directory)).toBe("2.0.0");
  });
});

test("release changes nothing when no change landed since the tag, or when no tag exists yet", () => {
  inRepositoryCopy((directory, git) => {
    const untagged = version(directory, "release");
    expect(untagged.status).toBe(0);
    expect(untagged.stdout).toContain("No release tag yet");

    expect(git("tag", "v1.4.2").status).toBe(0);
    merge(git, "chore(release): v1.4.2");
    const quiet = version(directory, "release");
    expect(quiet.status).toBe(0);
    expect(quiet.stdout).toContain("Nothing merged since v1.4.2.");
    expect(git("status", "--porcelain").stdout).toBe("");
  });
});

test("check accepts a Conventional Commits title over an unchanged version, and rejects other titles and version edits", () => {
  inRepositoryCopy((directory, git) => {
    expect(version(directory, "check", "--base", "HEAD", "--title", "revert: undo the lanes").stdout).toContain("releases a patch version");
    expect(version(directory, "check", "--base", "HEAD", "--title", "feat(swarm)!: drop lanes").stdout).toContain("releases a major version");
    for (const title of ["Update the readme", "constructor: inherit a type"]) {
      const result = version(directory, "check", "--base", "HEAD", "--title", title);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`PR title "${title}" must be "type(scope): subject"`);
    }

    const metadata = join(directory, "tools/metadata.json");
    writeFileSync(metadata, readFileSync(metadata, "utf8").replace(/"version": "[^"]*"/, '"version": "1.5.0"'));
    const bumped = version(directory, "check", "--base", "HEAD", "--title", "feat(swarm): add lanes");
    expect(bumped.status).toBe(1);
    expect(bumped.stderr).toContain("The PR changes the version from 1.4.2 to 1.5.0.");
    expect(git("status", "--porcelain").stdout).toBe(" M tools/metadata.json\n");
  });
});
