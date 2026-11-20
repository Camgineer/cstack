#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_REPO_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");

export const TARGET_DEFS = {
  claude: [".claude", "skills"],
  agents: [".agents", "skills"],
  codex: [".codex", "skills"],
  antigravity: [".gemini", "config", "skills"],
  cursor: [".cursor", "skills"],
  gemini: [".gemini", "skills"],
  opencode: [".config", "opencode", "skills"],
};

export const DEFAULT_TARGETS = ["claude", "agents", "codex", "antigravity"];
export const ALL_TARGETS = Object.keys(TARGET_DEFS);

export const GLOBAL_TARGET_DEFS = {
  claude: {
    envDir: "CLAUDE_CONFIG_DIR",
    defaultDir: [".claude"],
    filename: "CLAUDE.md",
    requiredSkillsTarget: "claude",
  },
  codex: {
    envDir: "CODEX_HOME",
    defaultDir: [".codex"],
    filename: "AGENTS.md",
    requiredSkillsTarget: "agents",
  },
  antigravity: {
    envDir: null,
    defaultDir: [".gemini"],
    filename: "GEMINI.md",
    requiredSkillsTarget: "antigravity",
  },
};

export const DEFAULT_GLOBAL_TARGETS = ["claude", "codex", "antigravity"];
export const ALL_GLOBAL_TARGETS = Object.keys(GLOBAL_TARGET_DEFS);

export function usage() {
  return `Usage: node scripts/install.mjs [options]

Install cstack skills (upstream pstack + cstack overlay) into coding-agent skill directories,
and optionally install global instruction files from global/AGENTS.md.
Uses symlinks on macOS/Linux and directory junctions on Windows by default.
Never modifies unrelated skills (such as built-in system skills or Orca bundled skills).

Options:
  --targets <list>         Comma-separated skill targets: ${ALL_TARGETS.join(", ")}, or "all"
                           (default: ${DEFAULT_TARGETS.join(",")})
  --global                 Also install global/AGENTS.md to each harness's global instruction file
  --global-targets <list>  Comma-separated global instruction targets: ${ALL_GLOBAL_TARGETS.join(", ")}, or "all"
                           (default: ${DEFAULT_GLOBAL_TARGETS.join(",")}; implies --global)
  --global-ref <ref>       Git commit/ref to read global/AGENTS.md from (default: working tree file)
  --backup-dir <dir>       Directory for backups when replacing existing global instruction files
                           (default: ~/.config/cstack/global-backups/<timestamp>)
  --copy                   Copy skill directories instead of linking
  --force                  Replace conflicting non-cstack entries at skill target paths
  --dry-run                Print planned changes without modifying the filesystem
  --uninstall              Remove cstack-managed skill entries recorded in the manifest
  --status                 Show current installation status from the manifest
  --home <dir>             Override the home directory (default: current user's home)
  -h, --help               Show this help message
`;
}

export function parseArgs(argv) {
  const opts = {
    action: "install",
    targets: null,
    installGlobal: false,
    globalTargets: null,
    globalRef: null,
    backupDir: null,
    copy: false,
    force: false,
    dryRun: false,
    homeDir: os.homedir(),
    homeOverridden: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--targets": {
        if (i + 1 >= argv.length) {
          throw new Error("--targets requires a comma-separated value");
        }
        opts.targets = parseTargetList(argv[++i], TARGET_DEFS, ALL_TARGETS, "--targets");
        break;
      }
      case "--global":
        opts.installGlobal = true;
        break;
      case "--global-targets": {
        if (i + 1 >= argv.length) {
          throw new Error("--global-targets requires a comma-separated value");
        }
        opts.installGlobal = true;
        opts.globalTargets = parseTargetList(
          argv[++i],
          GLOBAL_TARGET_DEFS,
          ALL_GLOBAL_TARGETS,
          "--global-targets",
        );
        break;
      }
      case "--global-ref": {
        if (i + 1 >= argv.length) {
          throw new Error("--global-ref requires a git commit or ref");
        }
        opts.installGlobal = true;
        opts.globalRef = argv[++i];
        break;
      }
      case "--backup-dir": {
        if (i + 1 >= argv.length) {
          throw new Error("--backup-dir requires a directory path");
        }
        opts.backupDir = path.resolve(argv[++i]);
        break;
      }
      case "--copy":
        opts.copy = true;
        break;
      case "--force":
        opts.force = true;
        break;
      case "--dry-run":
        opts.dryRun = true;
        break;
      case "--uninstall":
        opts.action = "uninstall";
        break;
      case "--status":
        opts.action = "status";
        break;
      case "--home": {
        if (i + 1 >= argv.length) {
          throw new Error("--home requires a directory path");
        }
        opts.homeDir = path.resolve(argv[++i]);
        opts.homeOverridden = true;
        break;
      }
      case "-h":
      case "--help":
        opts.help = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return opts;
}

function parseTargetList(raw, defs, allNames, flagName) {
  const tokens = raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  if (tokens.length === 0) {
    throw new Error(`${flagName} must specify at least one target`);
  }

  const resolved = new Set();
  for (const token of tokens) {
    if (token === "all") {
      for (const name of allNames) {
        resolved.add(name);
      }
    } else if (Object.hasOwn(defs, token)) {
      resolved.add(token);
    } else {
      throw new Error(
        `Unknown target "${token}". Valid targets: ${allNames.join(", ")}, all`,
      );
    }
  }

  return [...resolved];
}

export function getManifestPath(homeDir) {
  return path.join(homeDir, ".config", "cstack", "install-manifest.json");
}

export function getTargetDir(homeDir, targetName, { env = process.env, respectEnv = false } = {}) {
  const segments = TARGET_DEFS[targetName];
  if (!segments) {
    throw new Error(`Unknown target "${targetName}"`);
  }
  if (respectEnv && targetName === "claude" && env.CLAUDE_CONFIG_DIR) {
    return path.join(path.resolve(env.CLAUDE_CONFIG_DIR), "skills");
  }
  if (respectEnv && targetName === "codex" && env.CODEX_HOME) {
    return path.join(path.resolve(env.CODEX_HOME), "skills");
  }
  return path.join(homeDir, ...segments);
}

export function getGlobalInstructionPath(
  homeDir,
  targetName,
  { env = process.env, respectEnv = false } = {},
) {
  const def = GLOBAL_TARGET_DEFS[targetName];
  if (!def) {
    throw new Error(`Unknown global target "${targetName}"`);
  }
  if (respectEnv && def.envDir && env[def.envDir]) {
    return path.join(path.resolve(env[def.envDir]), def.filename);
  }
  return path.join(homeDir, ...def.defaultDir, def.filename);
}

export function discoverSkills(repoRoot) {
  const skillsRoot = path.join(repoRoot, "skills");
  if (!fs.existsSync(skillsRoot)) {
    throw new Error(`Skills directory not found: ${skillsRoot}`);
  }

  const entries = fs.readdirSync(skillsRoot, { withFileTypes: true });
  const skills = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const skillDir = path.join(skillsRoot, entry.name);
    const skillFile = path.join(skillDir, "SKILL.md");
    if (fs.existsSync(skillFile)) {
      skills.push({ name: entry.name, sourceDir: skillDir });
    }
  }

  skills.sort((a, b) => a.name.localeCompare(b.name));
  return skills;
}

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function lstatOrNull(targetPath) {
  try {
    return fs.lstatSync(targetPath);
  } catch (err) {
    if (err && err.code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

function normalizePath(p) {
  let cleaned = p;
  if (cleaned.startsWith("\\\\?\\")) {
    cleaned = cleaned.slice(4);
  }
  const resolved = path.resolve(cleaned);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function readLinkTarget(linkPath) {
  const raw = fs.readlinkSync(linkPath);
  return path.resolve(path.dirname(linkPath), raw);
}

function isLinkTo(linkPath, expectedTarget) {
  const stat = lstatOrNull(linkPath);
  if (!stat || !stat.isSymbolicLink()) {
    return false;
  }
  const actual = readLinkTarget(linkPath);
  if (normalizePath(actual) === normalizePath(expectedTarget)) {
    return true;
  }
  try {
    return (
      normalizePath(fs.realpathSync(linkPath)) ===
      normalizePath(fs.realpathSync(expectedTarget))
    );
  } catch {
    return false;
  }
}

function isLinkUnder(linkPath, rootDir) {
  const stat = lstatOrNull(linkPath);
  if (!stat || !stat.isSymbolicLink()) {
    return false;
  }
  const actual = normalizePath(readLinkTarget(linkPath));
  const root = normalizePath(rootDir);
  return actual === root || actual.startsWith(root + path.sep);
}

function loadManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  const raw = fs.readFileSync(manifestPath, "utf8");
  return JSON.parse(raw);
}

function saveManifest(manifestPath, manifest) {
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function matchesManagedEntry(stat, entry) {
  if (!stat || !entry) {
    return false;
  }
  if (entry.mode === "link") {
    return stat.isSymbolicLink();
  }
  if (entry.mode === "copy") {
    return stat.isDirectory() && !stat.isSymbolicLink();
  }
  return false;
}

function removeEntry(targetPath, stat) {
  if (stat.isSymbolicLink()) {
    fs.unlinkSync(targetPath);
  } else {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function createLink(sourceDir, destPath, platform = process.platform) {
  const linkType = platform === "win32" ? "junction" : "dir";
  fs.symlinkSync(sourceDir, destPath, linkType);
}

function copyDir(sourceDir, destPath) {
  fs.cpSync(sourceDir, destPath, { recursive: true });
}

function parseSingleLineAtImport(rawText, destPath, homeDir) {
  const trimmed = rawText.trim();
  if (!trimmed.startsWith("@") || trimmed.includes("\n") || trimmed.includes("\r")) {
    return null;
  }
  let target = trimmed.slice(1).trim();
  if (!target) {
    return null;
  }
  if (target.startsWith("~/") || target.startsWith("~\\")) {
    target = path.join(homeDir, target.slice(2));
  }
  return path.resolve(path.dirname(destPath), target);
}

function readGlobalSourceBytes(resolvedRepoRoot, globalRef) {
  if (globalRef) {
    const commitSha = execFileSync(
      "git",
      ["-C", resolvedRepoRoot, "rev-parse", "--verify", `${globalRef}^{commit}`],
      { encoding: "utf8" },
    ).trim();
    const bytes = execFileSync(
      "git",
      ["-C", resolvedRepoRoot, "show", `${commitSha}:global/AGENTS.md`],
      { maxBuffer: 1024 * 1024 },
    );
    return {
      sourceLabel: `${commitSha}:global/AGENTS.md`,
      commitSha,
      bytes,
    };
  }
  const sourcePath = path.join(resolvedRepoRoot, "global", "AGENTS.md");
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Global instructions source not found: ${sourcePath}`);
  }
  return {
    sourceLabel: sourcePath,
    commitSha: null,
    bytes: fs.readFileSync(sourcePath),
  };
}

export function installCstack({
  repoRoot = DEFAULT_REPO_ROOT,
  homeDir = os.homedir(),
  targets = DEFAULT_TARGETS,
  copy = false,
  force = false,
  dryRun = false,
  platform = process.platform,
  env = process.env,
  respectEnv = false,
} = {}) {
  const resolvedRepoRoot = fs.realpathSync(repoRoot);
  const skills = discoverSkills(resolvedRepoRoot);
  const manifestPath = getManifestPath(homeDir);
  const prevManifest = loadManifest(manifestPath);
  const mode = copy ? "copy" : "link";

  const prevManagedByKey = new Map();
  if (prevManifest && Array.isArray(prevManifest.entries)) {
    for (const entry of prevManifest.entries) {
      prevManagedByKey.set(`${entry.target}:${entry.skill}`, entry);
    }
  }

  const desiredKeys = new Set();
  const nextEntries = [];
  const summary = {
    repoRoot: resolvedRepoRoot,
    manifestPath,
    mode,
    targets: [...targets],
    skillCount: skills.length,
    installed: 0,
    updated: 0,
    unchanged: 0,
    pruned: 0,
    conflicts: [],
    actions: [],
  };

  for (const targetName of targets) {
    const targetDir = getTargetDir(homeDir, targetName, { env, respectEnv });
    if (!dryRun) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    for (const skill of skills) {
      const key = `${targetName}:${skill.name}`;
      desiredKeys.add(key);
      const destPath = path.join(targetDir, skill.name);
      const stat = lstatOrNull(destPath);
      const prevEntry = prevManagedByKey.get(key);

      if (mode === "link" && stat && isLinkTo(destPath, skill.sourceDir)) {
        summary.unchanged += 1;
        nextEntries.push({
          target: targetName,
          skill: skill.name,
          destPath,
          sourceDir: skill.sourceDir,
          mode,
        });
        continue;
      }

      const prevMatchesSamePath =
        Boolean(prevEntry) &&
        normalizePath(prevEntry.destPath) === normalizePath(destPath) &&
        matchesManagedEntry(stat, prevEntry);

      const ownedByCstack =
        prevMatchesSamePath ||
        (stat &&
          isLinkUnder(destPath, path.join(resolvedRepoRoot, "skills")));

      if (stat && !ownedByCstack && !force) {
        summary.conflicts.push({
          target: targetName,
          skill: skill.name,
          destPath,
          reason: "existing non-cstack entry (re-run with --force to replace)",
        });
        if (prevEntry && normalizePath(prevEntry.destPath) !== normalizePath(destPath)) {
          nextEntries.push(prevEntry);
        }
        continue;
      }

      const actionType = stat ? "update" : "install";
      summary.actions.push({
        type: actionType,
        target: targetName,
        skill: skill.name,
        destPath,
        sourceDir: skill.sourceDir,
        mode,
      });

      if (!dryRun) {
        if (stat) {
          removeEntry(destPath, stat);
        }
        if (mode === "copy") {
          copyDir(skill.sourceDir, destPath);
        } else {
          createLink(skill.sourceDir, destPath, platform);
        }
      }

      if (actionType === "install") {
        summary.installed += 1;
      } else {
        summary.updated += 1;
      }

      nextEntries.push({
        target: targetName,
        skill: skill.name,
        destPath,
        sourceDir: skill.sourceDir,
        mode,
      });
    }
  }

  if (prevManifest && Array.isArray(prevManifest.entries)) {
    for (const prevEntry of prevManifest.entries) {
      const key = `${prevEntry.target}:${prevEntry.skill}`;
      if (desiredKeys.has(key)) {
        continue;
      }
      // A run with a subset of targets must not drop the manifest's record of the other harnesses.
      if (!targets.includes(prevEntry.target)) {
        nextEntries.push(prevEntry);
        continue;
      }

      const stat = lstatOrNull(prevEntry.destPath);
      if (!stat) {
        continue;
      }

      if (!matchesManagedEntry(stat, prevEntry)) {
        continue;
      }

      summary.actions.push({
        type: "prune",
        target: prevEntry.target,
        skill: prevEntry.skill,
        destPath: prevEntry.destPath,
      });

      if (!dryRun) {
        removeEntry(prevEntry.destPath, stat);
      }
      summary.pruned += 1;
    }
  }

  nextEntries.sort((a, b) =>
    `${a.target}:${a.skill}`.localeCompare(`${b.target}:${b.skill}`),
  );

  if (!dryRun) {
    saveManifest(manifestPath, {
      version: 1,
      repoRoot: resolvedRepoRoot,
      updatedAt: new Date().toISOString(),
      entries: nextEntries,
    });
  }

  return summary;
}

export function installGlobalInstructions({
  repoRoot = DEFAULT_REPO_ROOT,
  homeDir = os.homedir(),
  globalTargets = DEFAULT_GLOBAL_TARGETS,
  globalRef = null,
  backupDir = null,
  dryRun = false,
  env = process.env,
  respectEnv = false,
  onDifference = null,
} = {}) {
  const resolvedRepoRoot = fs.realpathSync(repoRoot);

  // Step 1 of global/README.md contract: verify required skills exist first.
  const missingSkills = [];
  for (const targetName of globalTargets) {
    const def = GLOBAL_TARGET_DEFS[targetName];
    if (!def) {
      throw new Error(`Unknown global target "${targetName}"`);
    }
    const skillsDir = getTargetDir(homeDir, def.requiredSkillsTarget, {
      env,
      respectEnv,
    });
    for (const requiredSkill of ["cstack-mode", "poteto-mode"]) {
      const skillFile = path.join(skillsDir, requiredSkill, "SKILL.md");
      if (!fs.existsSync(skillFile)) {
        missingSkills.push({ target: targetName, skillFile });
      }
    }
  }
  if (missingSkills.length > 0 && !dryRun) {
    const details = missingSkills
      .map((m) => `${m.target}: missing ${m.skillFile}`)
      .join("; ");
    throw new Error(
      `Install cstack skills before installing global instructions (${details})`,
    );
  }

  // Step 2: read source bytes (from an approved git ref when provided, or working tree).
  const { sourceLabel, commitSha, bytes: sourceBytes } = readGlobalSourceBytes(
    resolvedRepoRoot,
    globalRef,
  );
  const sourceSha256 = sha256(sourceBytes);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const effectiveBackupDir =
    backupDir || path.join(homeDir, ".config", "cstack", "global-backups", stamp);

  // Step 3 (Pass 1): inspect every destination without following links and validate safety BEFORE any write.
  const plans = [];
  for (const targetName of globalTargets) {
    const destPath = getGlobalInstructionPath(homeDir, targetName, {
      env,
      respectEnv,
    });
    const stat = lstatOrNull(destPath);

    if (!stat) {
      plans.push({
        target: targetName,
        destPath,
        stat: null,
        previousKind: "missing",
        action: "created",
        linkTarget: null,
        atImportTarget: null,
        rawBytes: null,
        resolvedBytes: null,
        targetBackupDir: null,
      });
      continue;
    }

    if (stat.isDirectory()) {
      throw new Error(
        `Refusing to replace directory at global instruction path: ${destPath}`,
      );
    }

    if (stat.isFile() && !stat.isSymbolicLink()) {
      const existingBytes = fs.readFileSync(destPath);
      if (sha256(existingBytes) === sourceSha256) {
        plans.push({
          target: targetName,
          destPath,
          stat,
          previousKind: "regular-match",
          action: "unchanged",
          linkTarget: null,
          atImportTarget: null,
          rawBytes: null,
          resolvedBytes: null,
          targetBackupDir: null,
        });
        continue;
      }
    }

    let previousKind = "other";
    let linkTarget = null;
    let atImportTarget = null;
    let rawBytes = null;
    let resolvedBytes = null;

    if (stat.isSymbolicLink()) {
      previousKind = "symlink";
      linkTarget = fs.readlinkSync(destPath);
      const absTarget = readLinkTarget(destPath);
      if (fs.existsSync(absTarget) && fs.statSync(absTarget).isFile()) {
        resolvedBytes = fs.readFileSync(absTarget);
      }
    } else if (stat.isFile()) {
      rawBytes = fs.readFileSync(destPath);
      const rawText = rawBytes.toString("utf8");
      atImportTarget = parseSingleLineAtImport(rawText, destPath, homeDir);
      if (atImportTarget) {
        previousKind = "at-import";
        if (fs.existsSync(atImportTarget) && fs.statSync(atImportTarget).isFile()) {
          resolvedBytes = fs.readFileSync(atImportTarget);
        }
      } else {
        previousKind = "regular-diff";
      }
    } else {
      throw new Error(
        `Refusing to replace non-regular entry at global instruction path: ${destPath}`,
      );
    }

    const targetBackupDir = path.join(effectiveBackupDir, targetName);
    if (!dryRun && fs.existsSync(targetBackupDir)) {
      throw new Error(
        `Refusing to overwrite existing backup directory: ${targetBackupDir}`,
      );
    }

    plans.push({
      target: targetName,
      destPath,
      stat,
      previousKind,
      action: "replaced",
      linkTarget,
      atImportTarget,
      rawBytes,
      resolvedBytes,
      targetBackupDir,
    });
  }

  // Step 4a: report every difference BEFORE performing any write.
  if (typeof onDifference === "function") {
    for (const plan of plans) {
      if (plan.action === "replaced") {
        onDifference({
          target: plan.target,
          destPath: plan.destPath,
          previousKind: plan.previousKind,
          linkTarget: plan.linkTarget,
          atImportTarget: plan.atImportTarget,
          backupPath: plan.targetBackupDir,
        });
      }
    }
  }

  // Step 4b & 5: execute writes and verify SHA-256 digests.
  const summary = {
    sourcePath: sourceLabel,
    commitSha,
    sourceSha256,
    backupDir: effectiveBackupDir,
    missingSkills,
    results: [],
  };

  for (const plan of plans) {
    if (plan.action === "created") {
      if (!dryRun) {
        fs.mkdirSync(path.dirname(plan.destPath), { recursive: true });
        fs.writeFileSync(plan.destPath, sourceBytes);
        const writtenSha = sha256(fs.readFileSync(plan.destPath));
        if (writtenSha !== sourceSha256) {
          throw new Error(`Digest mismatch after writing ${plan.destPath}`);
        }
      }
    } else if (plan.action === "replaced") {
      if (!dryRun) {
        fs.mkdirSync(plan.targetBackupDir, { recursive: true, mode: 0o700 });
        try { fs.chmodSync(plan.targetBackupDir, 0o700); } catch {}
        if (plan.previousKind === "symlink") {
          fs.writeFileSync(
            path.join(plan.targetBackupDir, "symlink.txt"),
            `${plan.destPath} -> ${plan.linkTarget}\n`,
            { encoding: "utf8", mode: 0o600 },
          );
        } else if (plan.rawBytes !== null) {
          fs.writeFileSync(
            path.join(plan.targetBackupDir, path.basename(plan.destPath)),
            plan.rawBytes,
            { mode: 0o600 },
          );
        }
        if (plan.resolvedBytes !== null) {
          fs.writeFileSync(
            path.join(plan.targetBackupDir, "resolved.md"),
            plan.resolvedBytes,
            { mode: 0o600 },
          );
        }

        // Never write through a symlink: unlink the entry itself, then write a regular file.
        fs.unlinkSync(plan.destPath);
        fs.mkdirSync(path.dirname(plan.destPath), { recursive: true });
        fs.writeFileSync(plan.destPath, sourceBytes);

        const postStat = fs.lstatSync(plan.destPath);
        if (postStat.isSymbolicLink() || !postStat.isFile()) {
          throw new Error(`Expected regular file at ${plan.destPath} after install`);
        }
        const writtenSha = sha256(fs.readFileSync(plan.destPath));
        if (writtenSha !== sourceSha256) {
          throw new Error(`Digest mismatch after writing ${plan.destPath}`);
        }
      }
    }

    summary.results.push({
      target: plan.target,
      destPath: plan.destPath,
      previousKind: plan.previousKind,
      linkTarget: plan.linkTarget,
      atImportTarget: plan.atImportTarget,
      action: plan.action,
      backupPath: plan.targetBackupDir,
      sha256: sourceSha256,
    });
  }

  return summary;
}

export function uninstallCstack({
  homeDir = os.homedir(),
  targets = null,
  dryRun = false,
} = {}) {
  const manifestPath = getManifestPath(homeDir);
  const manifest = loadManifest(manifestPath);

  const summary = {
    manifestPath,
    removed: 0,
    skipped: [],
    missing: 0,
    remaining: 0,
  };

  if (!manifest || !Array.isArray(manifest.entries)) {
    return summary;
  }

  const targetFilter = targets ? new Set(targets) : null;
  const remainingEntries = [];

  for (const entry of manifest.entries) {
    if (targetFilter && !targetFilter.has(entry.target)) {
      remainingEntries.push(entry);
      continue;
    }

    const stat = lstatOrNull(entry.destPath);
    if (!stat) {
      summary.missing += 1;
      continue;
    }

    if (!matchesManagedEntry(stat, entry)) {
      summary.skipped.push({
        target: entry.target,
        skill: entry.skill,
        destPath: entry.destPath,
        reason: "entry type changed since install; refusing to delete",
      });
      continue;
    }

    if (!dryRun) {
      removeEntry(entry.destPath, stat);
    }
    summary.removed += 1;
  }

  summary.remaining = remainingEntries.length;

  if (!dryRun) {
    if (remainingEntries.length === 0) {
      fs.rmSync(manifestPath, { force: true });
    } else {
      saveManifest(manifestPath, {
        ...manifest,
        updatedAt: new Date().toISOString(),
        entries: remainingEntries,
      });
    }
  }

  return summary;
}

export function getStatus({ homeDir = os.homedir() } = {}) {
  const manifestPath = getManifestPath(homeDir);
  const manifest = loadManifest(manifestPath);

  if (!manifest) {
    return { installed: false, manifestPath, entries: [] };
  }

  const checked = (manifest.entries || []).map((entry) => {
    const stat = lstatOrNull(entry.destPath);
    let state = "ok";
    if (!stat) {
      state = "missing";
    } else if (entry.mode === "link" && !isLinkTo(entry.destPath, entry.sourceDir)) {
      state = "drifted";
    } else if (entry.mode === "copy" && (!stat.isDirectory() || stat.isSymbolicLink())) {
      state = "drifted";
    }
    return { ...entry, state };
  });

  return {
    installed: true,
    manifestPath,
    repoRoot: manifest.repoRoot,
    updatedAt: manifest.updatedAt,
    entries: checked,
  };
}

function formatInstallSummary(summary, dryRun) {
  const prefix = dryRun ? "[dry-run] " : "";
  const lines = [
    `${prefix}cstack install (${summary.mode}) from ${summary.repoRoot}`,
    `Targets: ${summary.targets.join(", ")} (${summary.skillCount} skills)`,
    `Result: ${summary.installed} installed, ${summary.updated} updated, ${summary.unchanged} unchanged, ${summary.pruned} pruned, ${summary.conflicts.length} conflicts`,
  ];

  if (summary.conflicts.length > 0) {
    lines.push("Conflicts:");
    for (const conflict of summary.conflicts) {
      lines.push(`  - ${conflict.destPath}: ${conflict.reason}`);
    }
  }

  if (!dryRun) {
    lines.push(`Manifest: ${summary.manifestPath}`);
  }
  return lines.join("\n");
}

function formatGlobalSummary(summary, dryRun) {
  const prefix = dryRun ? "[dry-run] " : "";
  const lines = [
    `${prefix}Global instructions from ${summary.sourcePath} (sha256: ${summary.sourceSha256})`,
  ];
  for (const r of summary.results) {
    let detail = `${r.action} (${r.previousKind})`;
    if (r.backupPath) {
      detail += `, backed up to ${r.backupPath}`;
    }
    lines.push(`  - ${r.target}: ${r.destPath} -> ${detail}`);
  }
  return lines.join("\n");
}

function formatUninstallSummary(summary, dryRun) {
  const prefix = dryRun ? "[dry-run] " : "";
  const lines = [
    `${prefix}cstack uninstall: ${summary.removed} removed, ${summary.missing} already missing, ${summary.skipped.length} skipped, ${summary.remaining} remaining`,
  ];
  for (const item of summary.skipped) {
    lines.push(`  - ${item.destPath}: ${item.reason}`);
  }
  return lines.join("\n");
}

function formatStatus(status) {
  if (!status.installed) {
    return `cstack is not installed (no manifest at ${status.manifestPath}).`;
  }
  const counts = { ok: 0, missing: 0, drifted: 0 };
  const byTarget = new Map();
  for (const entry of status.entries) {
    counts[entry.state] = (counts[entry.state] || 0) + 1;
    byTarget.set(entry.target, (byTarget.get(entry.target) || 0) + 1);
  }
  const targetSummary = [...byTarget.entries()]
    .map(([t, n]) => `${t}=${n}`)
    .join(", ");
  const lines = [
    `cstack repoRoot: ${status.repoRoot}`,
    `Manifest: ${status.manifestPath} (updated ${status.updatedAt})`,
    `Targets: ${targetSummary || "none"}`,
    `Health: ${counts.ok} ok, ${counts.missing} missing, ${counts.drifted} drifted`,
  ];
  return lines.join("\n");
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Error: ${err.message}\n`);
    console.error(usage());
    process.exit(1);
  }

  if (opts.help) {
    process.stdout.write(usage());
    process.exit(0);
  }

  if (opts.action === "status") {
    const status = getStatus({ homeDir: opts.homeDir });
    console.log(formatStatus(status));
    process.exit(0);
  }

  if (opts.action === "uninstall") {
    const summary = uninstallCstack({
      homeDir: opts.homeDir,
      targets: opts.targets,
      dryRun: opts.dryRun,
    });
    console.log(formatUninstallSummary(summary, opts.dryRun));
    process.exit(summary.skipped.length > 0 ? 1 : 0);
  }

  const respectEnv = !opts.homeOverridden;
  const summary = installCstack({
    repoRoot: DEFAULT_REPO_ROOT,
    homeDir: opts.homeDir,
    targets: opts.targets || DEFAULT_TARGETS,
    copy: opts.copy,
    force: opts.force,
    dryRun: opts.dryRun,
    respectEnv,
  });
  console.log(formatInstallSummary(summary, opts.dryRun));
  if (summary.conflicts.length > 0) {
    process.exit(1);
  }

  if (opts.installGlobal) {
    try {
      const globalSummary = installGlobalInstructions({
        repoRoot: DEFAULT_REPO_ROOT,
        homeDir: opts.homeDir,
        globalTargets: opts.globalTargets || DEFAULT_GLOBAL_TARGETS,
        globalRef: opts.globalRef,
        backupDir: opts.backupDir,
        dryRun: opts.dryRun,
        respectEnv,
        onDifference: (diff) => {
          const prefix = opts.dryRun ? "[dry-run] " : "";
          const targetInfo = diff.linkTarget
            ? ` (symlink -> ${diff.linkTarget})`
            : diff.atImportTarget
              ? ` (@ import -> ${diff.atImportTarget})`
              : "";
          console.log(
            `${prefix}Difference before write [${diff.target}]: ${diff.destPath} is ${diff.previousKind}${targetInfo}; backing up to ${diff.backupPath}`,
          );
        },
      });
      console.log(formatGlobalSummary(globalSummary, opts.dryRun));
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  }
}

const isDirectRun =
  process.argv[1] &&
  pathToFileURL(fs.realpathSync(process.argv[1])).href === import.meta.url;

if (isDirectRun) {
  main();
}
