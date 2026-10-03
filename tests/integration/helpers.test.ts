import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const scripts = resolve(import.meta.dir, "../../skills/cstack-mode/scripts");

function inTemporaryDirectory(run: (directory: string) => void): void {
  const directory = mkdtempSync(join(tmpdir(), "plugin helper "));
  try {
    run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test.each(["orch/orch.ts", "watch-pr/watch-pr"])(
  "%s reports missing dependencies without running an installer or adding files",
  (entry) => {
    inTemporaryDirectory((directory) => {
      const copy = join(directory, "owned scripts");
      cpSync(scripts, copy, { recursive: true, filter: (source) => basename(source) !== "node_modules" });
      const before = readdirSync(copy, { recursive: true }).sort();
      const bins = join(directory, "bin");
      const attempted = join(directory, "installer was called");
      mkdirSync(bins);
      for (const installer of ["bun", "npm", "pnpm", "yarn"]) {
        const path = join(bins, installer);
        writeFileSync(path, '#!/bin/sh\nprintf attempted > "$FAKE_INSTALL_ATTEMPT"\nexit 91\n');
        chmodSync(path, 0o755);
      }
      const result = spawnSync(process.execPath, [join(copy, entry), "--help"], {
        cwd: directory,
        env: { ...process.env, PATH: `${bins}:${process.env.PATH ?? ""}`, FAKE_INSTALL_ATTEMPT: attempted },
        encoding: "utf8",
        timeout: 10_000,
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Dependencies are not installed");
      expect(result.stderr).toContain("never install dependencies");
      expect(existsSync(attempted)).toBe(false);
      expect(readdirSync(copy, { recursive: true }).sort()).toEqual(before);
      expect(existsSync(join(copy, "node_modules"))).toBe(false);
    });
  },
);

test("worktree audit preserves a path with spaces and checks merges against the remote default branch", () => {
  inTemporaryDirectory((directory) => {
    const repository = join(directory, "billing repository");
    const worktree = join(directory, "invoice export worktree");
    mkdirSync(repository);
    const env = {
      ...process.env,
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_NOSYSTEM: "1",
      GIT_TERMINAL_PROMPT: "0",
    };
    function git(...args: string[]): void {
      const result = spawnSync("git", ["-c", "core.hooksPath=/dev/null", "-C", repository, ...args], { env, encoding: "utf8", timeout: 10_000 });
      if (result.status !== 0) throw new Error(`fixture git ${args[0]} failed\n${result.stderr}`);
    }
    git("init", "-b", "trunk");
    git("-c", "user.name=Fixture", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", "commit", "--allow-empty", "-m", "fixture");
    git("update-ref", "refs/remotes/origin/trunk", "HEAD");
    git("symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/trunk");
    git("worktree", "add", "-b", "invoice-export", worktree);
    const bins = join(directory, "bin");
    mkdirSync(bins);
    const gh = join(bins, "gh");
    writeFileSync(gh, "#!/bin/sh\nprintf '[]'\n");
    chmodSync(gh, 0o755);
    const result = spawnSync("bash", [join(scripts, "worktree-audit.sh"), repository], {
      env: { ...env, PATH: `${bins}:${process.env.PATH ?? ""}` },
      encoding: "utf8",
      timeout: 10_000,
    });
    expect(result.status).toBe(0);
    const rows = result.stdout.trim().split("\n").map((line) => line.split("\t"));
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual([
      expect.any(String), expect.any(String), "YES", "clean", "no-remote", "-", "review-history", worktree,
    ]);
    expect(existsSync(worktree)).toBe(true);
  });
});

test("decision log keeps one header, one line per row, and guards formula cells", () => {
  inTemporaryDirectory((directory) => {
    const log = join(directory, "logs", "decisions.tsv");
    const append = (...cells: string[]) => {
      const result = spawnSync("bash", [resolve(import.meta.dir, "../../skills/show-me-your-work/scripts/log.sh"), log, ...cells], {
        encoding: "utf8",
        timeout: 10_000,
      });
      expect(result.stderr).toBe("");
      expect(result.status).toBe(0);
    };
    append("build", "=HYPERLINK(\"x\")", "tab\there", "line\nbreak", "ok");
    append("verify", "plain", "why", "evidence", "-1");

    const lines = readFileSync(log, "utf8").split("\n");
    expect(lines.pop()).toBe("");
    expect(lines[0]).toBe("ts\tphase\tdecision\twhy\tevidence\tresult");
    expect(lines).toHaveLength(3);
    const rows = lines.slice(1).map((line) => line.split("\t"));
    expect(rows.map((row) => row.length)).toEqual([6, 6]);
    expect(rows[0]?.slice(1)).toEqual(["build", "'=HYPERLINK(\"x\")", "tab here", "line break", "ok"]);
    expect(rows[1]?.slice(1)).toEqual(["verify", "plain", "why", "evidence", "'-1"]);
  });
});
