import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  discoverSkills,
  getManifestPath,
  getStatus,
  getTargetDir,
  installCstack,
  parseArgs,
  uninstallCstack,
} from "./install.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INSTALL_SCRIPT = path.join(REPO_ROOT, "scripts", "install.mjs");

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test("install, idempotent re-run, status, and uninstall preserve unrelated skills", () => {
  const homeDir = makeTempDir("cstack-home-");
  try {
    // Seed unrelated skills (e.g., T3 Projects new-project and Codex .system)
    const claudeNewProject = path.join(homeDir, ".claude", "skills", "new-project");
    const codexSystem = path.join(homeDir, ".codex", "skills", ".system");
    fs.mkdirSync(claudeNewProject, { recursive: true });
    fs.mkdirSync(codexSystem, { recursive: true });
    fs.writeFileSync(path.join(claudeNewProject, "SKILL.md"), "# new-project\n");
    fs.writeFileSync(path.join(codexSystem, "keep.txt"), "built-in\n");

    const skills = discoverSkills(REPO_ROOT);
    assert.ok(skills.some((s) => s.name === "cstack-mode"));
    assert.ok(skills.some((s) => s.name === "poteto-mode"));

    // Dry run should not create links or manifest
    const dry = installCstack({
      repoRoot: REPO_ROOT,
      homeDir,
      targets: ["claude", "codex"],
      dryRun: true,
    });
    assert.equal(dry.installed, skills.length * 2);
    assert.equal(fs.existsSync(getManifestPath(homeDir)), false);

    // Real install
    const first = installCstack({
      repoRoot: REPO_ROOT,
      homeDir,
      targets: ["claude", "codex"],
    });
    assert.equal(first.installed, skills.length * 2);
    assert.equal(first.conflicts.length, 0);
    assert.equal(fs.existsSync(getManifestPath(homeDir)), true);

    // Verify cstack-mode symlink resolves back to repo root so docs/harness/t3-code.md is reachable
    const linkedCstackMode = path.join(
      getTargetDir(homeDir, "claude"),
      "cstack-mode",
      "SKILL.md",
    );
    const resolvedSkill = fs.realpathSync(linkedCstackMode);
    const resolvedAdapter = path.resolve(
      path.dirname(resolvedSkill),
      "..",
      "..",
      "docs",
      "harness",
      "t3-code.md",
    );
    assert.equal(fs.existsSync(resolvedAdapter), true);

    // Re-run is idempotent
    const second = installCstack({
      repoRoot: REPO_ROOT,
      homeDir,
      targets: ["claude", "codex"],
    });
    assert.equal(second.installed, 0);
    assert.equal(second.updated, 0);
    assert.equal(second.unchanged, skills.length * 2);

    // Status reports healthy
    const status = getStatus({ homeDir });
    assert.equal(status.installed, true);
    assert.equal(status.entries.length, skills.length * 2);
    assert.ok(status.entries.every((e) => e.state === "ok"));

    // Uninstall removes only cstack entries
    const removed = uninstallCstack({ homeDir });
    assert.equal(removed.removed, skills.length * 2);
    assert.equal(removed.skipped.length, 0);
    assert.equal(fs.existsSync(getManifestPath(homeDir)), false);

    // Unrelated skills are completely untouched
    assert.equal(fs.existsSync(path.join(claudeNewProject, "SKILL.md")), true);
    assert.equal(fs.existsSync(path.join(codexSystem, "keep.txt")), true);
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

test("CLI --help, --targets, --status, and --uninstall work end-to-end", () => {
  const homeDir = makeTempDir("cstack-cli-");
  try {
    const helpOut = execFileSync(process.execPath, [INSTALL_SCRIPT, "--help"], {
      encoding: "utf8",
    });
    assert.match(helpOut, /Usage: node scripts\/install\.mjs/);

    const installOut = execFileSync(
      process.execPath,
      [INSTALL_SCRIPT, "--home", homeDir, "--targets", "claude,cursor"],
      { encoding: "utf8" },
    );
    assert.match(installOut, /Targets: claude, cursor/);
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
  const parsed = parseArgs(["--targets", "all", "--copy", "--dry-run"]);
  assert.equal(parsed.targets.length, 6);
  assert.equal(parsed.copy, true);
  assert.equal(parsed.dryRun, true);

  assert.throws(() => parseArgs(["--targets", "unknown"]), /Unknown target/);
  assert.throws(() => parseArgs(["--bogus"]), /Unknown option/);
});
