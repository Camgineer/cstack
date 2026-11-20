import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  ALL_TARGETS,
  DEFAULT_TARGETS,
  discoverSkills,
  formatUpdateSummary,
  getGlobalInstructionPath,
  getManifestPath,
  getStatus,
  getTargetDir,
  installCstack,
  installGlobalInstructions,
  parseArgs,
  uninstallCstack,
  updateCstack,
} from "./install.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const INSTALL_SCRIPT = path.join(__dirname, "install.mjs");

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

test("install, idempotent re-run, status, and uninstall preserve unrelated skills", () => {
  const homeDir = makeTempDir("cstack-home-");
  try {
    const codexSystem = path.join(homeDir, ".codex", "skills", ".system");
    const agyCustom = path.join(homeDir, ".gemini", "config", "skills", "custom-skill");
    fs.mkdirSync(codexSystem, { recursive: true });
    fs.mkdirSync(agyCustom, { recursive: true });
    fs.writeFileSync(path.join(codexSystem, "keep.txt"), "built-in\n");
    fs.writeFileSync(path.join(agyCustom, "SKILL.md"), "# custom\n");

    const skills = discoverSkills(REPO_ROOT);
    assert.ok(skills.some((s) => s.name === "cstack-mode"));
    assert.ok(skills.some((s) => s.name === "poteto-mode"));

    // Dry run should not create links or manifest
    const dry = installCstack({
      repoRoot: REPO_ROOT,
      homeDir,
      targets: ["claude", "codex", "antigravity"],
      dryRun: true,
    });
    assert.equal(dry.installed, skills.length * 3);
    assert.equal(fs.existsSync(getManifestPath(homeDir)), false);

    // Real install
    const first = installCstack({
      repoRoot: REPO_ROOT,
      homeDir,
      targets: ["claude", "codex", "antigravity"],
    });
    assert.equal(first.installed, skills.length * 3);
    assert.equal(first.conflicts.length, 0);
    assert.equal(fs.existsSync(getManifestPath(homeDir)), true);

    // Verify cstack-mode symlink resolves back to repo root so Orca and T3 Code adapters are reachable
    for (const target of ["claude", "antigravity"]) {
      const linkedCstackMode = path.join(
        getTargetDir(homeDir, target),
        "cstack-mode",
        "SKILL.md",
      );
      const resolvedSkill = fs.realpathSync(linkedCstackMode);
      const docsHarnessDir = path.resolve(
        path.dirname(resolvedSkill),
        "..",
        "..",
        "docs",
        "harness",
      );
      assert.equal(fs.existsSync(path.join(docsHarnessDir, "orca.md")), true);
      assert.equal(fs.existsSync(path.join(docsHarnessDir, "t3-code.md")), true);
      assert.equal(
        fs.existsSync(path.join(docsHarnessDir, "t3-code-projects.md")),
        false,
      );
    }

    // Re-run is idempotent
    const second = installCstack({
      repoRoot: REPO_ROOT,
      homeDir,
      targets: ["claude", "codex", "antigravity"],
    });
    assert.equal(second.installed, 0);
    assert.equal(second.updated, 0);
    assert.equal(second.unchanged, skills.length * 3);

    // Status reports healthy
    const status = getStatus({ homeDir });
    assert.equal(status.installed, true);
    assert.equal(status.entries.length, skills.length * 3);
    assert.ok(status.entries.every((e) => e.state === "ok"));

    // Uninstall removes only cstack entries
    const removed = uninstallCstack({ homeDir });
    assert.equal(removed.removed, skills.length * 3);
    assert.equal(removed.skipped.length, 0);
    assert.equal(fs.existsSync(getManifestPath(homeDir)), false);

    // Unrelated skills are completely untouched
    assert.equal(fs.existsSync(path.join(codexSystem, "keep.txt")), true);
    assert.equal(fs.existsSync(path.join(agyCustom, "SKILL.md")), true);
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});

test("conflicts are skipped without --force and replaced with --force", () => {
  const homeDir = makeTempDir("cstack-conflict-");
  try {
    const conflictDir = path.join(homeDir, ".claude", "skills", "cstack-mode");
    fs.mkdirSync(conflictDir, { recursive: true });
    fs.writeFileSync(path.join(conflictDir, "SKILL.md"), "custom\n");

    const blocked = installCstack({
      repoRoot: REPO_ROOT,
      homeDir,
      targets: ["claude"],
    });
    assert.equal(blocked.conflicts.length, 1);
    assert.equal(blocked.conflicts[0].skill, "cstack-mode");
    assert.equal(fs.readFileSync(path.join(conflictDir, "SKILL.md"), "utf8"), "custom\n");

    const forced = installCstack({
      repoRoot: REPO_ROOT,
      homeDir,
      targets: ["claude"],
      force: true,
    });
    assert.equal(forced.conflicts.length, 0);
    assert.equal(forced.updated, 1);
    assert.equal(fs.lstatSync(conflictDir).isSymbolicLink(), true);

    // If a user later replaces a managed symlink with a real directory, re-install refuses to overwrite it
    fs.unlinkSync(conflictDir);
    fs.mkdirSync(conflictDir, { recursive: true });
    fs.writeFileSync(path.join(conflictDir, "SKILL.md"), "user-replaced\n");

    const protectedRes = installCstack({
      repoRoot: REPO_ROOT,
      homeDir,
      targets: ["claude"],
    });
    assert.equal(protectedRes.conflicts.length, 1);
    assert.equal(
      fs.readFileSync(path.join(conflictDir, "SKILL.md"), "utf8"),
      "user-replaced\n",
    );
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});

test("copy mode installs, records repoRoot in manifest, and uninstalls cleanly", () => {
  const homeDir = makeTempDir("cstack-copy-");
  try {
    const res = installCstack({
      repoRoot: REPO_ROOT,
      homeDir,
      targets: ["agents"],
      copy: true,
    });
    assert.equal(res.conflicts.length, 0);
    const copiedSkillDir = path.join(getTargetDir(homeDir, "agents"), "cstack-mode");
    assert.equal(fs.lstatSync(copiedSkillDir).isSymbolicLink(), false);
    assert.equal(fs.existsSync(path.join(copiedSkillDir, "SKILL.md")), true);

    const manifest = JSON.parse(fs.readFileSync(getManifestPath(homeDir), "utf8"));
    assert.equal(manifest.repoRoot, fs.realpathSync(REPO_ROOT));

    const removed = uninstallCstack({ homeDir });
    assert.equal(removed.removed, res.skillCount);
    assert.equal(fs.existsSync(copiedSkillDir), false);
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});

test("prunes skills removed from repo on re-install", () => {
  const fakeRepo = makeTempDir("cstack-fakerepo-");
  const homeDir = makeTempDir("cstack-prune-");
  try {
    const skillA = path.join(fakeRepo, "skills", "skill-a");
    const skillB = path.join(fakeRepo, "skills", "skill-b");
    fs.mkdirSync(skillA, { recursive: true });
    fs.mkdirSync(skillB, { recursive: true });
    fs.writeFileSync(path.join(skillA, "SKILL.md"), "# a\n");
    fs.writeFileSync(path.join(skillB, "SKILL.md"), "# b\n");

    installCstack({ repoRoot: fakeRepo, homeDir, targets: ["claude"] });
    assert.equal(
      fs.existsSync(path.join(homeDir, ".claude", "skills", "skill-b")),
      true,
    );

    fs.rmSync(skillB, { recursive: true, force: true });
    const res = installCstack({ repoRoot: fakeRepo, homeDir, targets: ["claude"] });
    assert.equal(res.pruned, 1);
    assert.equal(
      fs.existsSync(path.join(homeDir, ".claude", "skills", "skill-b")),
      false,
    );
    assert.equal(
      fs.existsSync(path.join(homeDir, ".claude", "skills", "skill-a")),
      true,
    );
  } finally {
    fs.rmSync(fakeRepo, { recursive: true, force: true });
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});

test("installGlobalInstructions enforces skills first, backs up symlinks/@-imports without writing through links, and verifies digests", () => {
  const fakeRepo = makeTempDir("cstack-global-repo-");
  const homeDir = makeTempDir("cstack-global-home-");
  const externalDir = makeTempDir("cstack-global-ext-");
  const backupDir = path.join(homeDir, "test-backups");
  try {
    for (const s of ["cstack-mode", "poteto-mode"]) {
      const dir = path.join(fakeRepo, "skills", s);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "SKILL.md"), `# ${s}\n`);
    }
    const globalDir = path.join(fakeRepo, "global");
    fs.mkdirSync(globalDir, { recursive: true });
    const sourceText = "Start every task with cstack-mode.\n";
    fs.writeFileSync(path.join(globalDir, "AGENTS.md"), sourceText, "utf8");
    execFileSync("git", ["-C", fakeRepo, "init", "-q"]);
    execFileSync("git", ["-C", fakeRepo, "add", "global/AGENTS.md"]);
    execFileSync("git", [
      "-C",
      fakeRepo,
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.com",
      "commit",
      "-q",
      "-m",
      "approve global instructions",
    ]);
    // Uncommitted working-tree edit must NEVER be installed
    fs.writeFileSync(path.join(globalDir, "AGENTS.md"), "UNAPPROVED WORKING TREE EDIT\n", "utf8");
    const expectedSha = sha256(Buffer.from(sourceText, "utf8"));

    // Fails when skills are not installed yet
    assert.throws(
      () =>
        installGlobalInstructions({
          repoRoot: fakeRepo,
          homeDir,
          globalTargets: ["claude", "codex", "antigravity"],
          globalRef: "HEAD",
          backupDir,
        }),
      /Install cstack skills before installing global instructions/,
    );

    // Partial globalTargets must still require skills in ALL folders named by AGENTS.md
    installCstack({
      repoRoot: fakeRepo,
      homeDir,
      targets: ["claude"],
    });
    assert.throws(
      () =>
        installGlobalInstructions({
          repoRoot: fakeRepo,
          homeDir,
          globalTargets: ["claude"],
          globalRef: "HEAD",
          backupDir,
        }),
      /antigravity/,
    );

    // Install skills first
    installCstack({
      repoRoot: fakeRepo,
      homeDir,
      targets: ["claude", "agents", "antigravity"],
    });

    // Set up tricky pre-existing destinations:
    // 1. Claude: single-line @ import pointing to an external file
    const extTarget = path.join(externalDir, "old-AGENTS.md");
    fs.writeFileSync(extTarget, "legacy toolkit instructions\n", "utf8");
    fs.mkdirSync(path.join(homeDir, ".claude"), { recursive: true });
    fs.writeFileSync(
      path.join(homeDir, ".claude", "CLAUDE.md"),
      `@${extTarget}\n`,
      "utf8",
    );

    // 2. Codex: symlink pointing to a file that ALREADY holds sourceText (must still be replaced as regular file!)
    const symTarget = path.join(externalDir, "same-bytes.md");
    fs.writeFileSync(symTarget, sourceText, "utf8");
    fs.mkdirSync(path.join(homeDir, ".codex"), { recursive: true });
    fs.symlinkSync(symTarget, path.join(homeDir, ".codex", "AGENTS.md"));

    // 3. Antigravity: missing (~/.gemini/GEMINI.md)

    // Refuses omitting globalRef
    assert.throws(
      () =>
        installGlobalInstructions({
          repoRoot: fakeRepo,
          homeDir,
          globalTargets: ["claude", "codex", "antigravity"],
          backupDir,
        }),
      /requires an approved git commit ref/,
    );

    // Dry run touches nothing
    const dryRes = installGlobalInstructions({
      repoRoot: fakeRepo,
      homeDir,
      globalTargets: ["claude", "codex", "antigravity"],
      globalRef: "HEAD",
      backupDir,
      dryRun: true,
    });
    assert.equal(dryRes.results.length, 3);
    assert.equal(fs.lstatSync(path.join(homeDir, ".codex", "AGENTS.md")).isSymbolicLink(), true);
    assert.equal(fs.existsSync(path.join(homeDir, ".gemini", "GEMINI.md")), false);

    // Real install
    const res = installGlobalInstructions({
      repoRoot: fakeRepo,
      homeDir,
      globalTargets: ["claude", "codex", "antigravity"],
      globalRef: "HEAD",
      backupDir,
    });
    assert.equal(res.sourceSha256, expectedSha);

    const byTarget = Object.fromEntries(res.results.map((r) => [r.target, r]));
    assert.equal(byTarget.claude.previousKind, "at-import");
    assert.equal(byTarget.claude.action, "replaced");
    assert.equal(byTarget.codex.previousKind, "symlink");
    assert.equal(byTarget.codex.action, "replaced");
    assert.equal(byTarget.antigravity.previousKind, "missing");
    assert.equal(byTarget.antigravity.action, "created");

    // Verify regular files, matching digests, and untouched external symlink target
    for (const target of ["claude", "codex", "antigravity"]) {
      const dest = getGlobalInstructionPath(homeDir, target);
      const stat = fs.lstatSync(dest);
      assert.equal(stat.isSymbolicLink(), false);
      assert.equal(stat.isFile(), true);
      assert.equal(sha256(fs.readFileSync(dest)), expectedSha);
    }
    assert.equal(
      fs.readFileSync(path.join(backupDir, "claude", "resolved.md"), "utf8"),
      "legacy toolkit instructions\n",
    );
    const backedUpLink = path.join(backupDir, "codex", "AGENTS.md");
    if (process.platform !== "win32") {
      assert.equal(fs.lstatSync(backedUpLink).isSymbolicLink(), true);
      assert.equal(fs.readlinkSync(backedUpLink), symTarget);
    }
    assert.equal(
      fs.readFileSync(path.join(backupDir, "codex", "symlink.txt"), "utf8").includes(symTarget),
      true,
    );
    assert.equal(
      fs.readFileSync(path.join(backupDir, "codex", "resolved.md"), "utf8"),
      sourceText,
    );

    // Re-run is completely unchanged
    const rerun = installGlobalInstructions({
      repoRoot: fakeRepo,
      homeDir,
      globalTargets: ["claude", "codex", "antigravity"],
      globalRef: "HEAD",
      backupDir: path.join(homeDir, "second-backup"),
    });
    assert.ok(rerun.results.every((r) => r.action === "unchanged"));
    assert.equal(fs.existsSync(path.join(homeDir, "second-backup")), false);
  } finally {
    fs.rmSync(fakeRepo, { recursive: true, force: true });
    fs.rmSync(homeDir, { recursive: true, force: true });
    fs.rmSync(externalDir, { recursive: true, force: true });
  }
});

test("respects CLAUDE_CONFIG_DIR and CODEX_HOME when respectEnv is enabled", () => {
  const homeDir = makeTempDir("cstack-env-home-");
  const customClaude = path.join(homeDir, "custom-claude");
  const customCodex = path.join(homeDir, "custom-codex");
  const env = { CLAUDE_CONFIG_DIR: customClaude, CODEX_HOME: customCodex };
  try {
    assert.equal(
      getTargetDir(homeDir, "claude", { env, respectEnv: true }),
      path.join(customClaude, "skills"),
    );
    assert.equal(
      getGlobalInstructionPath(homeDir, "claude", { env, respectEnv: true }),
      path.join(customClaude, "CLAUDE.md"),
    );
    assert.equal(
      getGlobalInstructionPath(homeDir, "codex", { env, respectEnv: true }),
      path.join(customCodex, "AGENTS.md"),
    );
    assert.equal(
      getGlobalInstructionPath(homeDir, "antigravity", { env, respectEnv: true }),
      path.join(homeDir, ".gemini", "GEMINI.md"),
    );
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});

test("CLI --help, --targets, --status, and --uninstall work end-to-end", () => {
  const homeDir = makeTempDir("cstack-cli-");
  try {
    const helpOut = execFileSync(process.execPath, [INSTALL_SCRIPT, "--help"], {
      encoding: "utf8",
    });
    assert.match(helpOut, /Usage: node scripts\/install\.mjs/);
    assert.match(helpOut, /--global/);

    const installOut = execFileSync(
      process.execPath,
      [INSTALL_SCRIPT, "--home", homeDir, "--targets", "claude,antigravity"],
      { encoding: "utf8" },
    );
    assert.match(installOut, /Targets: claude, antigravity/);
    assert.match(installOut, /0 conflicts/);

    const statusOut = execFileSync(
      process.execPath,
      [INSTALL_SCRIPT, "--home", homeDir, "--status"],
      { encoding: "utf8" },
    );
    assert.match(statusOut, /0 missing, 0 drifted/);

    const uninstallOut = execFileSync(
      process.execPath,
      [INSTALL_SCRIPT, "--home", homeDir, "--uninstall"],
      { encoding: "utf8" },
    );
    assert.match(uninstallOut, /0 skipped, 0 remaining/);
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});

test("parseArgs validates options and target names", () => {
  const parsed = parseArgs([
    "--targets",
    "all",
    "--global-targets",
    "claude,antigravity",
    "--global-ref",
    "HEAD",
    "--copy",
    "--dry-run",
  ]);
  assert.equal(parsed.targets.length, ALL_TARGETS.length);
  assert.deepEqual(DEFAULT_TARGETS, ["claude", "agents", "codex", "antigravity"]);
  assert.equal(parsed.installGlobal, true);
  assert.deepEqual(parsed.globalTargets, ["claude", "antigravity"]);
  assert.equal(parsed.globalRef, "HEAD");
  assert.equal(parsed.copy, true);
  assert.equal(parsed.dryRun, true);

  assert.throws(() => parseArgs(["--global"]), /require --global-ref/);
  assert.throws(() => parseArgs(["--global-targets", "claude"]), /require --global-ref/);
  assert.throws(() => parseArgs(["--targets", "unknown"]), /Unknown target/);
  assert.throws(() => parseArgs(["--global-targets", "cursor"]), /Unknown target/);
  assert.throws(() => parseArgs(["--bogus"]), /Unknown option/);
});

test("installGlobalInstructions refuses directory at instruction path, refuses overwriting existing backup dir, reports differences before write, and supports --global-ref", () => {
  const homeDir = makeTempDir("cstack-safety-home-");
  const backupDir = path.join(homeDir, "backups");
  try {
    installCstack({
      repoRoot: REPO_ROOT,
      homeDir,
      targets: ["claude", "agents", "antigravity"],
    });

    // 1. Directory at instruction-file path must be refused without deletion
    const dirAtDest = path.join(homeDir, ".claude", "CLAUDE.md");
    fs.mkdirSync(dirAtDest, { recursive: true });
    fs.writeFileSync(path.join(dirAtDest, "keep.txt"), "important\n");
    assert.throws(
      () =>
        installGlobalInstructions({
          repoRoot: REPO_ROOT,
          homeDir,
          globalTargets: ["claude"],
          globalRef: "HEAD",
          backupDir,
        }),
      /Refusing to replace directory/,
    );
    assert.equal(fs.existsSync(path.join(dirAtDest, "keep.txt")), true);
    fs.rmSync(dirAtDest, { recursive: true, force: true });

    // 2. Existing backup dir must not be overwritten
    fs.writeFileSync(dirAtDest, "old content\n", "utf8");
    fs.mkdirSync(path.join(backupDir, "claude"), { recursive: true });
    assert.throws(
      () =>
        installGlobalInstructions({
          repoRoot: REPO_ROOT,
          homeDir,
          globalTargets: ["claude"],
          globalRef: "HEAD",
          backupDir,
        }),
      /Refusing to overwrite existing backup directory/,
    );
    assert.equal(fs.readFileSync(dirAtDest, "utf8"), "old content\n");

    // 3. onDifference fires BEFORE any write, and globalRef reads exact git commit bytes
    const events = [];
    const freshBackup = path.join(homeDir, "backups-2");
    const res = installGlobalInstructions({
      repoRoot: REPO_ROOT,
      homeDir,
      globalTargets: ["claude"],
      globalRef: "HEAD",
      backupDir: freshBackup,
      onDifference: (diff) => {
        // Confirm destination still has old bytes when onDifference fires
        events.push({
          target: diff.target,
          contentAtCallback: fs.readFileSync(diff.destPath, "utf8"),
        });
      },
    });
    assert.equal(events.length, 1);
    assert.equal(events[0].contentAtCallback, "old content\n");
    assert.ok(res.commitSha && res.commitSha.length === 40);
    const gitBytes = execFileSync("git", ["-C", REPO_ROOT, "show", `${res.commitSha}:global/AGENTS.md`]);
    assert.deepEqual(fs.readFileSync(dirAtDest), gitBytes);
    if (process.platform !== "win32") {
      assert.equal(fs.statSync(path.join(freshBackup, "claude")).mode & 0o777, 0o700);
      assert.equal(fs.statSync(path.join(freshBackup, "claude", "CLAUDE.md")).mode & 0o777, 0o600);
      assert.equal(fs.statSync(dirAtDest).mode & 0o777, 0o600);
    }
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});

test("changing CLAUDE_CONFIG_DIR does not misidentify unrelated skill dir as cstack-owned", () => {
  const homeDir = makeTempDir("cstack-env-own-");
  const claudeDirA = path.join(homeDir, "claude-a");
  const claudeDirB = path.join(homeDir, "claude-b");
  try {
    installCstack({
      repoRoot: REPO_ROOT,
      homeDir,
      targets: ["claude"],
      copy: true,
      env: { CLAUDE_CONFIG_DIR: claudeDirA },
      respectEnv: true,
    });

    // Put an unrelated pre-existing directory in claudeDirB
    const unrelated = path.join(claudeDirB, "skills", "cstack-mode");
    fs.mkdirSync(unrelated, { recursive: true });
    fs.writeFileSync(path.join(unrelated, "SKILL.md"), "user custom\n");

    const res = installCstack({
      repoRoot: REPO_ROOT,
      homeDir,
      targets: ["claude"],
      copy: true,
      env: { CLAUDE_CONFIG_DIR: claudeDirB },
      respectEnv: true,
    });
    assert.equal(res.conflicts.length, 1);
    assert.equal(fs.readFileSync(path.join(unrelated, "SKILL.md"), "utf8"), "user custom\n");
    const statusAfter = getStatus({ homeDir });
    assert.ok(
      statusAfter.entries.some(
        (e) => e.skill === "cstack-mode" && e.destPath === path.join(claudeDirA, "skills", "cstack-mode"),
      ),
    );
    assert.ok(
      statusAfter.entries.some(
        (e) => e.skill === "poteto-mode" && e.destPath === path.join(claudeDirA, "skills", "poteto-mode"),
      ),
    );
    assert.ok(
      statusAfter.entries.some(
        (e) => e.skill === "poteto-mode" && e.destPath === path.join(claudeDirB, "skills", "poteto-mode"),
      ),
    );
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});

test("changing CODEX_HOME preserves prior manifest entries on a clean move", () => {
  const homeDir = makeTempDir("cstack-codex-move-");
  const codexA = path.join(homeDir, "codex-a");
  const codexB = path.join(homeDir, "codex-b");
  try {
    installCstack({
      repoRoot: REPO_ROOT,
      homeDir,
      targets: ["codex"],
      env: { CODEX_HOME: codexA },
      respectEnv: true,
    });
    const moved = installCstack({
      repoRoot: REPO_ROOT,
      homeDir,
      targets: ["codex"],
      env: { CODEX_HOME: codexB },
      respectEnv: true,
    });
    assert.equal(moved.conflicts.length, 0);
    const status = getStatus({ homeDir });
    assert.ok(status.entries.some((e) => e.destPath === path.join(codexA, "skills", "cstack-mode")));
    assert.ok(status.entries.some((e) => e.destPath === path.join(codexB, "skills", "cstack-mode")));
  } finally {
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});

test("updateCstack fast-forwards, re-links new skills, prunes removed skills, and alerts on global/AGENTS.md drift without overwriting", () => {
  const bareOrigin = makeTempDir("cstack-update-origin-");
  const authorRepo = makeTempDir("cstack-update-author-");
  const localClone = makeTempDir("cstack-update-clone-");
  const homeDir = makeTempDir("cstack-update-home-");
  const gitCommit = (cwd, msg) => {
    execFileSync("git", ["-C", cwd, "add", "-A"]);
    execFileSync("git", [
      "-C",
      cwd,
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.com",
      "commit",
      "-q",
      "-m",
      msg,
    ]);
  };
  try {
    execFileSync("git", ["init", "--bare", "-q", bareOrigin]);
    execFileSync("git", ["clone", "-q", bareOrigin, authorRepo]);
    execFileSync("git", ["-C", authorRepo, "checkout", "-q", "-b", "main"]);

    // Initial skills + global/AGENTS.md v1
    for (const s of ["cstack-mode", "poteto-mode", "old-skill"]) {
      const dir = path.join(authorRepo, "skills", s);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "SKILL.md"), `# ${s}\n`);
    }
    fs.mkdirSync(path.join(authorRepo, "global"), { recursive: true });
    const v1Global = "Approved global v1\n";
    fs.writeFileSync(path.join(authorRepo, "global", "AGENTS.md"), v1Global);
    gitCommit(authorRepo, "v1");
    execFileSync("git", ["-C", authorRepo, "push", "-q", "-u", "origin", "main"]);

    // Clone to local machine and install skills + v1 global instructions (claude & codex only)
    fs.rmSync(localClone, { recursive: true, force: true });
    execFileSync("git", ["clone", "-q", "-b", "main", bareOrigin, localClone]);
    installCstack({ repoRoot: localClone, homeDir, targets: ["claude", "agents", "antigravity"] });
    installGlobalInstructions({
      repoRoot: localClone,
      homeDir,
      globalTargets: ["claude", "codex"],
      globalRef: "HEAD",
      backupDir: path.join(homeDir, "bk-v1"),
    });

    // Upstream adds new-skill, removes old-skill, and updates global/AGENTS.md to v2
    fs.rmSync(path.join(authorRepo, "skills", "old-skill"), { recursive: true, force: true });
    fs.mkdirSync(path.join(authorRepo, "skills", "new-skill"), { recursive: true });
    fs.writeFileSync(path.join(authorRepo, "skills", "new-skill", "SKILL.md"), "# new-skill\n");
    fs.writeFileSync(path.join(authorRepo, "global", "AGENTS.md"), "Unapproved global v2\n");
    gitCommit(authorRepo, "v2");
    const v2Sha = execFileSync("git", ["-C", authorRepo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    execFileSync("git", ["-C", authorRepo, "push", "-q", "origin", "main"]);

    // Dry-run uses read-only ls-remote: detects remote v2 without writing objects/FETCH_HEAD or touching files
    const fetchHeadPath = path.join(localClone, ".git", "FETCH_HEAD");
    const hadFetchHead = fs.existsSync(fetchHeadPath);
    const dryRes = updateCstack({ repoRoot: localClone, homeDir, dryRun: true });
    assert.equal(dryRes.hasUpstreamUpdate, true);
    assert.equal(dryRes.pulled, false);
    assert.equal(dryRes.remoteSha, v2Sha);
    assert.equal(dryRes.upstreamRelation, "remote-unfetched");
    assert.equal(dryRes.previewFromLocalHeadOnly, true);
    assert.equal(fs.existsSync(fetchHeadPath), hadFetchHead);
    assert.equal(fs.existsSync(path.join(homeDir, ".claude", "skills", "new-skill")), false);
    assert.equal(fs.existsSync(path.join(homeDir, ".claude", "skills", "old-skill")), true);

    // Real update fast-forwards, links new-skill, prunes old-skill, and NEVER overwrites global files
    const res = updateCstack({ repoRoot: localClone, homeDir });
    assert.equal(res.pulled, true);
    assert.equal(res.afterSha, v2Sha);
    assert.equal(fs.existsSync(path.join(homeDir, ".claude", "skills", "new-skill")), true);
    assert.equal(fs.existsSync(path.join(homeDir, ".claude", "skills", "old-skill")), false);
    assert.ok(res.status.entries.every((e) => e.state === "ok"));
    // Preserved installed target set (claude, agents, antigravity — did not add codex)
    assert.equal(fs.existsSync(path.join(homeDir, ".codex", "skills", "new-skill")), false);

    // Global files still hold v1 bytes, while globalDrift flags both claude & codex and leaves missing antigravity non-blocking
    assert.equal(fs.readFileSync(path.join(homeDir, ".claude", "CLAUDE.md"), "utf8"), v1Global);
    assert.equal(fs.readFileSync(path.join(homeDir, ".codex", "AGENTS.md"), "utf8"), v1Global);
    assert.equal(res.globalDrift.needsApproval, true);
    assert.equal(res.globalDrift.commitSha, v2Sha);
    const byT = Object.fromEntries(res.globalDrift.targets.map((t) => [t.target, t.state]));
    assert.equal(byT.claude, "changed");
    assert.equal(byT.codex, "changed");
    assert.equal(byT.antigravity, "missing");

    // Refuses to update when tracked files have uncommitted edits
    fs.writeFileSync(path.join(localClone, "global", "AGENTS.md"), "dirty edit\n");
    assert.throws(
      () => updateCstack({ repoRoot: localClone, homeDir }),
      /uncommitted changes to tracked files/,
    );
    execFileSync("git", ["-C", localClone, "checkout", "--", "global/AGENTS.md"]);

    // Refuses detached HEAD with clear explanatory error
    execFileSync("git", ["-C", localClone, "checkout", "-q", "--detach", "HEAD"]);
    assert.throws(
      () => updateCstack({ repoRoot: localClone, homeDir }),
      /Refusing to update detached HEAD/,
    );
    execFileSync("git", ["-C", localClone, "checkout", "-q", "main"]);

    // Mixed-mode installations preserve copy vs link per target across updates (including newly added skills)
    const mixedHome = makeTempDir("cstack-update-mixed-home-");
    try {
      installCstack({ repoRoot: localClone, homeDir: mixedHome, targets: ["claude"], copy: true });
      installCstack({ repoRoot: localClone, homeDir: mixedHome, targets: ["codex"], copy: false });

      // Push a v3 skill upstream and update
      fs.mkdirSync(path.join(authorRepo, "skills", "v3-skill"), { recursive: true });
      fs.writeFileSync(path.join(authorRepo, "skills", "v3-skill", "SKILL.md"), "# v3-skill\n");
      gitCommit(authorRepo, "v3");
      execFileSync("git", ["-C", authorRepo, "push", "-q", "origin", "main"]);

      const mixedRes = updateCstack({ repoRoot: localClone, homeDir: mixedHome });
      assert.equal(mixedRes.installSummary.mode, "mixed");

      const claudeExisting = fs.lstatSync(path.join(mixedHome, ".claude", "skills", "new-skill"));
      const claudeAdded = fs.lstatSync(path.join(mixedHome, ".claude", "skills", "v3-skill"));
      assert.equal(claudeExisting.isSymbolicLink(), false);
      assert.equal(claudeExisting.isDirectory(), true);
      assert.equal(claudeAdded.isSymbolicLink(), false);
      assert.equal(claudeAdded.isDirectory(), true);

      const codexExisting = fs.lstatSync(path.join(mixedHome, ".codex", "skills", "new-skill"));
      const codexAdded = fs.lstatSync(path.join(mixedHome, ".codex", "skills", "v3-skill"));
      assert.equal(codexExisting.isSymbolicLink(), true);
      assert.equal(codexAdded.isSymbolicLink(), true);
    } finally {
      fs.rmSync(mixedHome, { recursive: true, force: true });
    }

    // Dry-run does not report "already up to date" when upstream is unset or missing on remote
    execFileSync("git", ["-C", localClone, "branch", "--unset-upstream"]);
    const noUpstreamRes = updateCstack({ repoRoot: localClone, homeDir, dryRun: true });
    assert.equal(noUpstreamRes.upstreamRelation, "no-upstream");
    assert.equal(noUpstreamRes.wouldFailPull, true);
    const noUpstreamText = formatUpdateSummary(noUpstreamRes, true);
    assert.match(noUpstreamText, /no upstream/i);
    assert.match(noUpstreamText, /would fail/i);
    assert.doesNotMatch(noUpstreamText, /already up to date/i);

    execFileSync("git", ["-C", localClone, "config", "branch.main.remote", "origin"]);
    execFileSync("git", ["-C", localClone, "config", "branch.main.merge", "refs/heads/does-not-exist"]);
    const missingRefRes = updateCstack({ repoRoot: localClone, homeDir, dryRun: true });
    assert.equal(missingRefRes.upstreamRelation, "missing-remote-ref");
    assert.equal(missingRefRes.wouldFailPull, true);
    const missingRefText = formatUpdateSummary(missingRefRes, true);
    assert.match(missingRefText, /missing on remote/i);
    assert.match(missingRefText, /would fail/i);
    assert.doesNotMatch(missingRefText, /already up to date/i);
  } finally {
    fs.rmSync(bareOrigin, { recursive: true, force: true });
    fs.rmSync(authorRepo, { recursive: true, force: true });
    fs.rmSync(localClone, { recursive: true, force: true });
    fs.rmSync(homeDir, { recursive: true, force: true });
  }
});

test("parseArgs supports --update/--refresh and rejects conflicting flags", () => {
  assert.equal(parseArgs(["--update"]).action, "update");
  assert.equal(parseArgs(["--refresh"]).action, "update");
  assert.throws(() => parseArgs(["--update", "--uninstall"]), /mutually exclusive/);
  assert.throws(() => parseArgs(["--update", "--status"]), /mutually exclusive/);
  assert.throws(() => parseArgs(["--update", "--global", "--global-ref", "HEAD"]), /Cannot combine --update with --global/);
});
