import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

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

test.each(["supplied", "default"])("worktree audit uses the %s scratch folder and preserves paths and merge checks", (folder) => {
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
    writeFileSync(join(repository, ".gitignore"), "tmp/\n");
    git("add", ".gitignore");
    git("-c", "user.name=Fixture", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", "commit", "--allow-empty", "-m", "fixture");
    git("update-ref", "refs/remotes/origin/trunk", "HEAD");
    git("symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/trunk");
    git("worktree", "add", "-b", "invoice-export", worktree);
    const bins = join(directory, "bin");
    mkdirSync(bins);
    const gh = join(bins, "gh");
    const scratch = join(repository, "tmp", folder === "supplied" ? "audit with spaces" : "worktree-audit");
    const capture = join(directory, "temporary files observed");
    mkdirSync(scratch, { recursive: true });
    writeFileSync(gh, `#!/bin/sh
: > "$AUDIT_CAPTURE"
for path in "$AUDIT_SCRATCH"/*; do
  [ -f "$path" ] || continue
  printf '%s\\n' "$path" >> "$AUDIT_CAPTURE"
done
printf '[]'
`);
    chmodSync(gh, 0o755);
    const args = [join(scripts, "worktree-audit.sh"), repository];
    if (folder === "supplied") args.push(scratch);
    const result = spawnSync("bash", args, {
      env: { ...env, PATH: `${bins}:${process.env.PATH ?? ""}`, AUDIT_SCRATCH: scratch, AUDIT_CAPTURE: capture },
      encoding: "utf8",
      timeout: 10_000,
    });
    expect(result.status).toBe(0);
    const rows = result.stdout.trim().split("\n").map((line) => line.split("\t"));
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual([
      expect.any(String), expect.any(String), "YES", "clean", "no-remote", "-", "review-history", realpathSync(worktree),
    ]);
    expect(existsSync(worktree)).toBe(true);
    const observed = readFileSync(capture, "utf8").trim().split("\n").filter(Boolean);
    expect(observed.map((path) => realpathSync(dirname(path)))).toEqual([realpathSync(scratch)]);
    expect(readdirSync(scratch)).toEqual([]);
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

function withReceiptRepository(run: (fixture: {
  repository: string;
  git: (...args: string[]) => string;
  cli: (...args: string[]) => ReturnType<typeof spawnSync>;
  cliFrom: (cwd: string, ...args: string[]) => ReturnType<typeof spawnSync>;
}) => void): void {
  inTemporaryDirectory((directory) => {
    const repository = join(directory, "receipt repository");
    const home = join(directory, "home");
    mkdirSync(repository);
    mkdirSync(home);
    const env = { ...process.env, HOME: home, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", GIT_TERMINAL_PROMPT: "0" };
    const git = (...args: string[]) => {
      const result = spawnSync("git", ["-c", "core.hooksPath=/dev/null", "-C", repository, ...args], { env, encoding: "utf8", timeout: 10_000 });
      if (result.status !== 0) throw new Error(`fixture git ${args[0]} failed\n${result.stderr}`);
      return result.stdout;
    };
    git("init", "-b", "main");
    writeFileSync(join(repository, ".gitignore"), "ignored\n");
    writeFileSync(join(repository, "tracked.txt"), "original\n");
    git("add", ".gitignore", "tracked.txt");
    git("-c", "user.name=Fixture", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", "commit", "-m", "fixture");
    const cliFrom = (cwd: string, ...args: string[]) => spawnSync(process.execPath, [join(scripts, "check-receipt.ts"), "--receipts", "tmp/checks with spaces", ...args], { cwd, env, encoding: "utf8", timeout: 10_000 });
    const cli = (...args: string[]) => cliFrom(repository, ...args);
    run({ repository, git, cli, cliFrom });
  });
}

test("check receipt passes on an unchanged tree and ignores scratch output", () => {
  withReceiptRepository(({ repository, git, cli }) => {
    const recorded = cli("record", "typecheck", "printf 'check output\\n'");
    expect(recorded.status).toBe(0);
    expect(recorded.stdout).toContain("check output\n");
    expect(recorded.stdout).toContain("typecheck recorded. Exit code 0.");
    writeFileSync(join(repository, "ignored"), "ignored changes");
    const result = cli("check");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("All 1 check receipts passed on tree ");
    expect(git("status", "--porcelain")).toBe("");
    const receipt = JSON.parse(readFileSync(join(repository, "tmp/checks with spaces/typecheck.json"), "utf8"));
    expect(receipt.command).toBe("printf 'check output\\n'");
    expect(receipt.exitCode).toBe(0);
    expect(receipt.treeHash).toMatch(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/);
    expect(receipt.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

test.each(["tracked edit", "staged edit", "untracked file", "deleted file", "executable mode", "symlink", "tracked ignored file"])("check receipt refuses a stale receipt after a %s", (change) => {
  withReceiptRepository(({ repository, git, cli }) => {
    if (change === "tracked ignored file") {
      writeFileSync(join(repository, "ignored"), "original");
      git("add", "-f", "ignored");
    }
    expect(cli("record", "unit-tests", "exit 0").status).toBe(0);
    const tracked = join(repository, "tracked.txt");
    if (change === "tracked edit" || change === "staged edit") writeFileSync(tracked, "changed\n");
    if (change === "staged edit") git("add", "tracked.txt");
    if (change === "untracked file") writeFileSync(join(repository, "new file\nwith newline.txt"), "new\n");
    if (change === "deleted file" || change === "symlink") rmSync(tracked);
    if (change === "executable mode") chmodSync(tracked, 0o755);
    if (change === "tracked ignored file") writeFileSync(join(repository, "ignored"), "changed");
    if (change === "symlink") symlinkSync("ignored", tracked);
    const result = cli("check");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("unit-tests is stale. Run it again on the current tree.");
  });
});

test("check receipt binds untracked files across staging and committing", () => {
  withReceiptRepository(({ repository, git, cli }) => {
    writeFileSync(join(repository, "new.txt"), "new\n");
    expect(cli("record", "new-file", "exit 0").status).toBe(0);
    git("add", "new.txt");
    git("-c", "user.name=Fixture", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", "commit", "-m", "new file");
    expect(cli("check").status).toBe(0);
    writeFileSync(join(repository, "new.txt"), "edit\n");
    expect(cli("check").stderr).toContain("new-file is stale.");
  });
});

test("check receipt names every failed or stale check and replaces a rerun", () => {
  withReceiptRepository(({ repository, cli }) => {
    const failingCommand = 'test "$(cat tracked.txt)" = edit || exit 7';
    expect(cli("record", "failed-check", failingCommand).status).toBe(7);
    expect(cli("record", "passing-check", "exit 0").status).toBe(0);
    const failed = cli("check");
    expect(failed.status).toBe(1);
    expect(failed.stderr).toContain("failed-check failed with exit code 7.");
    writeFileSync(join(repository, "tracked.txt"), "edit\n");
    const stale = cli("check");
    expect(stale.status).toBe(1);
    expect(stale.stderr).toContain("failed-check is stale.");
    expect(stale.stderr).toContain("passing-check is stale.");
    expect(cli("record", "failed-check", failingCommand).status).toBe(0);
    expect(cli("record", "passing-check", "exit 0").status).toBe(0);
    expect(cli("check").status).toBe(0);
  });
});

test("check receipt refuses a command that changes its own input tree", () => {
  withReceiptRepository(({ cli }) => {
    const record = cli("record", "formatter", "printf changed > tracked.txt");
    expect(record.status).toBe(1);
    expect(record.stdout).toContain("The working tree changed during the check.");
    const result = cli("check");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("formatter is stale.");
  });
});

test("check receipt refuses empty, malformed, and interrupted results", () => {
  withReceiptRepository(({ repository, cli }) => {
    const empty = cli("check");
    expect(empty.status).toBe(1);
    expect(empty.stderr).toContain("No check receipts found.");
    expect(cli("record", "complete", "exit 0").status).toBe(0);
    const path = join(repository, "tmp/checks with spaces/complete.json");
    const receipt = JSON.parse(readFileSync(path, "utf8"));
    writeFileSync(path, JSON.stringify({ ...receipt, status: "running" }));
    const interrupted = cli("check");
    expect(interrupted.status).toBe(1);
    expect(interrupted.stderr).toContain("complete is unfinished.");
    writeFileSync(path, "{}");
    const malformed = cli("check");
    expect(malformed.status).toBe(1);
    expect(malformed.stderr).toContain("complete.json cannot be read. Invalid receipt.");
  });
});

test("check receipt refuses storage outside ignored project scratch", () => {
  withReceiptRepository(({ repository, git, cli }) => {
    for (const target of ["receipts", "tmp", "../escape"]) {
      const result = cli("--receipts", target, "record", "check", "exit 0");
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Keep receipts in a task directory");
    }
    mkdirSync(join(repository, "tmp/tracked"), { recursive: true });
    writeFileSync(join(repository, "tmp/tracked/saved.txt"), "tracked");
    git("add", "tmp/tracked/saved.txt");
    const tracked = cli("--receipts", "tmp/tracked", "record", "check", "exit 0");
    expect(tracked.status).toBe(1);
    expect(tracked.stderr).toContain("contains tracked files");
    mkdirSync(join(repository, "other"));
    symlinkSync(join(repository, "other"), join(repository, "tmp/linked"));
    const linked = cli("--receipts", "tmp/linked", "record", "check", "exit 0");
    expect(linked.status).toBe(1);
    expect(linked.stderr).toContain("must not contain symlinks");
  });
});

test("check receipt uses the project root for default storage and runs from the caller directory", () => {
  withReceiptRepository(({ repository, cli }) => {
    const nested = join(repository, "nested");
    mkdirSync(nested);
    const result = spawnSync(process.execPath, [join(scripts, "check-receipt.ts"), "record", "cwd", "pwd"], {
      cwd: nested,
      env: { ...process.env, HOME: join(dirname(repository), "home"), GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
      encoding: "utf8",
      timeout: 10_000,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`${realpathSync(nested)}\n`);
    expect(existsSync(join(repository, "tmp/check-receipt/cwd.json"))).toBe(true);
    expect(cli("--receipts", "tmp/check-receipt", "check").status).toBe(0);
  });
});

test("check receipt refuses a submodule tree rather than omit its files", () => {
  withReceiptRepository(({ git, cli }) => {
    git("update-index", "--add", "--cacheinfo", `160000,${git("rev-parse", "HEAD").trim()},module`);
    const result = cli("record", "submodule-check", "exit 0");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Check receipts do not support submodules.");
  });
});


test("check receipt preserves existing scratch ignore rules and refuses a linked ignore file", () => {
  withReceiptRepository(({ repository, cli }) => {
    const scratch = join(repository, "tmp/checks with spaces");
    mkdirSync(scratch, { recursive: true });
    const ignore = join(scratch, ".gitignore");
    writeFileSync(ignore, "existing-rule");
    expect(cli("record", "preserved", "exit 0").status).toBe(0);
    expect(readFileSync(ignore, "utf8")).toBe("existing-rule\n*\n");
    rmSync(ignore);
    const target = join(repository, "ignored");
    writeFileSync(target, "outside rules");
    symlinkSync(target, ignore);
    const linked = cli("record", "linked", "exit 0");
    expect(linked.status).toBe(1);
    expect(linked.stderr).toContain("The scratch ignore file must not be a symlink.");
    expect(readFileSync(target, "utf8")).toBe("outside rules");
  });
});


test.each(["content", "mode"])("check receipt fix B1 refuses a different index and committed %s tree", (change) => {
  withReceiptRepository(({ repository, git, cli }) => {
    expect(cli("record", "checked-tree", "exit 0").status).toBe(0);
    if (change === "content") {
      writeFileSync(join(repository, "tracked.txt"), "different\n");
      git("add", "tracked.txt");
      writeFileSync(join(repository, "tracked.txt"), "original\n");
    } else git("update-index", "--chmod=+x", "tracked.txt");
    const staged = cli("check", "--head", "HEAD");
    expect(staged.status).toBe(1);
    expect(staged.stderr).toContain("The index tree differs from the checked working tree.");
    git("-c", "user.name=Fixture", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", "commit", "-m", "different tree");
    const committed = cli("check", "--head", "HEAD");
    expect(committed.status).toBe(1);
    expect(committed.stderr).toContain("HEAD does not contain the checked working tree.");
    git("reset", "--hard", "HEAD~1");
    const restored = cli("check", "--head", "HEAD");
    expect(restored.status).toBe(0);
  });
});

test.each(["record", "check"])("check receipt fix B2 %s refuses a dangling ignore link without creating its target", (action) => {
  withReceiptRepository(({ repository, cli }) => {
    const scratch = join(repository, "tmp/checks with spaces");
    mkdirSync(scratch, { recursive: true });
    const target = join(repository, "outside-tmp.txt");
    symlinkSync(target, join(scratch, ".gitignore"));
    const result = action === "record" ? cli("record", "linked", "exit 0") : cli("check");
    expect(result.status).toBe(1);
    expect(existsSync(target)).toBe(false);
    expect(result.stderr).toContain("The scratch ignore file must not be a symlink.");
  });
});

test("check receipt fix B2 does not truncate through a hardlinked ignore file", () => {
  withReceiptRepository(({ repository, cli }) => {
    const scratch = join(repository, "tmp/checks with spaces");
    mkdirSync(scratch, { recursive: true });
    const target = join(repository, "tracked.txt");
    linkSync(target, join(scratch, ".gitignore"));
    expect(cli("record", "hardlink", "exit 0").status).toBe(0);
    expect(readFileSync(target, "utf8")).toBe("original\n");
    expect(readFileSync(join(scratch, ".gitignore"), "utf8")).toBe("original\n*\n");
  });
});

test("check receipt fix B3 refuses final save through a swapped directory", () => {
  withReceiptRepository(({ repository, cli }) => {
    const outside = join(repository, "outside");
    mkdirSync(outside);
    const result = cli("record", "swapped", "mv 'tmp/checks with spaces' 'tmp/old-checks'; ln -s ../outside 'tmp/checks with spaces'");
    expect(result.status).toBe(1);
    expect(existsSync(join(outside, "swapped.json"))).toBe(false);
    expect(result.stderr).toContain("The receipt directory must not contain symlinks.");
  });
});

test("check receipt fix B5 runs a packaged helper without dependencies or installed-copy writes", () => {
  withReceiptRepository(({ repository }) => {
    const installed = join(dirname(repository), "installed plugin with spaces");
    mkdirSync(installed);
    const helper = join(installed, "check-receipt.ts");
    cpSync(join(scripts, "check-receipt.ts"), helper);
    const env = { ...process.env, HOME: join(dirname(repository), "home"), GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
    const record = spawnSync(process.execPath, [helper, "record", "installed", "exit 0"], { cwd: repository, env, encoding: "utf8", timeout: 10_000 });
    expect(record.status).toBe(0);
    const checked = spawnSync(process.execPath, [helper, "check", "--head", "HEAD"], { cwd: repository, env, encoding: "utf8", timeout: 10_000 });
    expect(checked.status).toBe(0);
    expect(readdirSync(installed)).toEqual(["check-receipt.ts"]);
    const help = spawnSync(process.execPath, [helper, "--help"], { cwd: repository, env, encoding: "utf8", timeout: 10_000 });
    expect(help.status).toBe(0);
    expect(help.stdout).toContain("Receipts are local bookkeeping");
    expect(help.stdout).toContain("ignored files");
    expect(help.stdout).toContain("restored");
    expect(help.stdout).toContain("authenticity");
  });
});

test("check receipt fix C1 refuses a receipt copied from another repository", () => {
  withReceiptRepository(({ repository: source, cli: sourceCli }) => {
    expect(sourceCli("record", "foreign", "exit 0").status).toBe(0);
    withReceiptRepository(({ repository, cli }) => {
      const scratch = join(repository, "tmp/checks with spaces");
      mkdirSync(scratch, { recursive: true });
      cpSync(join(source, "tmp/checks with spaces/foreign.json"), join(scratch, "foreign.json"));
      const result = cli("check");
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("foreign belongs to another repository.");
    });
  });
});

test.each(["command", "directory"])("check receipt fix C3 refuses a reused name for another %s", (change) => {
  withReceiptRepository(({ repository, cli, cliFrom }) => {
    expect(cli("record", "unique", "exit 0").status).toBe(0);
    const nested = join(repository, "nested");
    mkdirSync(nested);
    const result = change === "command" ? cli("record", "unique", "exit 7") : cliFrom(nested, "record", "unique", "exit 0");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("unique already records");
    expect(result.stderr).toContain("exit 0");
    expect(result.stderr).toContain(change === "command" ? "exit 7" : realpathSync(nested));
    expect(cli("check").status).toBe(0);
  });
});

test("check receipt fix B1 refuses commit -a omitting a checked untracked file", () => {
  withReceiptRepository(({ repository, git, cli }) => {
    writeFileSync(join(repository, "tracked.txt"), "checked edit\n");
    writeFileSync(join(repository, "new.txt"), "checked input\n");
    expect(cli("record", "untracked-input", "test -f new.txt").status).toBe(0);
    git("-c", "user.name=Fixture", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", "commit", "-a", "-m", "commit tracked input only");
    const omitted = cli("check", "--head", "HEAD");
    expect(omitted.status).toBe(1);
    expect(omitted.stderr).toContain("HEAD does not contain the checked working tree.");
    git("add", "new.txt");
    git("-c", "user.name=Fixture", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", "commit", "-m", "include checked input");
    expect(cli("check", "--head", "HEAD").status).toBe(0);
  });
});

test.each(["record", "check", "head"])("check receipt fix N2 preserves real index bytes during %s", (action) => {
  withReceiptRepository(({ repository, git, cli }) => {
    if (action !== "record") expect(cli("record", "index-bytes", "exit 0").status).toBe(0);
    writeFileSync(join(repository, "tracked.txt"), "staged input\n");
    git("add", "tracked.txt");
    writeFileSync(join(repository, "tracked.txt"), "working input\n");
    writeFileSync(join(repository, "new.txt"), "untracked input\n");
    const index = resolve(repository, git("rev-parse", "--git-path", "index").trim());
    const before = readFileSync(index);
    const result = action === "record" ? cli("record", "index-bytes", "exit 0") : action === "head" ? cli("check", "--head", "HEAD") : cli("check");
    expect(result.status).toBe(action === "record" ? 0 : 1);
    expect(readFileSync(index)).toEqual(before);
    expect(git("show", ":tracked.txt")).toBe("staged input\n");
  });
});

test.each(["record", "check", "head"])("check receipt verifier N2 preserves a newly staged file index during %s", (action) => {
  withReceiptRepository(({ repository, git, cli }) => {
    writeFileSync(join(repository, "new.txt"), "staged input\n");
    if (action !== "record") expect(cli("record", "staged-input", "test -f new.txt").status).toBe(0);
    git("add", "new.txt");
    const index = resolve(repository, git("rev-parse", "--git-path", "index").trim());
    const before = readFileSync(index);
    const result = action === "record" ? cli("record", "staged-input", "test -f new.txt") : action === "head" ? cli("check", "--head", "HEAD") : cli("check");
    expect(result.status).toBe(action === "head" ? 1 : 0);
    expect(readFileSync(index)).toEqual(before);
    expect(git("show", ":new.txt")).toBe("staged input\n");
  });
});

test.each(["record", "check", "head"])("check receipt verifier N2 preserves an absent real index during %s", (action) => {
  withReceiptRepository(({ repository, git, cli }) => {
    git("checkout", "--orphan", "unborn");
    git("rm", "-rf", ".");
    writeFileSync(join(repository, "new.txt"), "untracked input\n");
    if (action !== "record") expect(cli("record", "unborn-input", "test -f new.txt").status).toBe(0);
    const index = resolve(repository, git("rev-parse", "--git-path", "index").trim());
    rmSync(index, { force: true });
    expect(existsSync(index)).toBe(false);
    const result = action === "record" ? cli("record", "unborn-input", "test -f new.txt") : action === "head" ? cli("check", "--head", "HEAD") : cli("check");
    expect(result.status).toBe(action === "head" ? 1 : 0);
    expect(existsSync(index)).toBe(false);
  });
});

test("check receipt verifier explains an unborn HEAD in plain words", () => {
  withReceiptRepository(({ git, cli }) => {
    git("checkout", "--orphan", "unborn");
    git("rm", "-rf", ".");
    expect(cli("record", "empty-tree", "exit 0").status).toBe(0);
    expect(cli("check").status).toBe(0);
    const result = cli("check", "--head", "HEAD");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('The named commit "HEAD" does not exist.');
    expect(result.stderr).not.toContain("fatal:");
  });
});

test.each(["assume-unchanged", "skip-worktree"])("check receipt fix N5 refuses changed %s content at record time", (flag) => {
  withReceiptRepository(({ repository, git, cli }) => {
    git("update-index", `--${flag}`, "tracked.txt");
    writeFileSync(join(repository, "tracked.txt"), "changed\n");
    const index = resolve(repository, git("rev-parse", "--git-path", "index").trim());
    const before = readFileSync(index);
    expect(cli("record", "flagged-input", 'test "$(cat tracked.txt)" = changed').status).toBe(0);
    expect(readFileSync(index)).toEqual(before);
    const result = cli("check", "--head", "HEAD");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("HEAD does not contain the checked working tree.");
    expect(readFileSync(index)).toEqual(before);
  });
});

test.each(["assume-unchanged", "skip-worktree"])("check receipt fix N5 reports an edit after record to %s content as stale", (flag) => {
  withReceiptRepository(({ repository, git, cli }) => {
    git("update-index", `--${flag}`, "tracked.txt");
    const index = resolve(repository, git("rev-parse", "--git-path", "index").trim());
    const before = readFileSync(index);
    expect(cli("record", "flagged-input", 'test "$(cat tracked.txt)" = original').status).toBe(0);
    expect(readFileSync(index)).toEqual(before);
    writeFileSync(join(repository, "tracked.txt"), "changed\n");
    const result = cli("check", "--head", "HEAD");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("flagged-input is stale.");
    expect(readFileSync(index)).toEqual(before);
  });
});

test("check receipt fix N5 refuses sparse checkouts in plain words", () => {
  withReceiptRepository(({ repository, git, cli }) => {
    git("config", "core.sparseCheckout", "true");
    const index = resolve(repository, git("rev-parse", "--git-path", "index").trim());
    const before = readFileSync(index);
    for (const args of [["record", "sparse-input", "exit 0"], ["check"], ["check", "--head", "HEAD"]]) {
      const result = cli(...args);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Check receipts do not support sparse checkouts.");
      expect(readFileSync(index)).toEqual(before);
    }
  });
});
