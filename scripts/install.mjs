#!/usr/bin/env node

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
  cursor: [".cursor", "skills"],
  gemini: [".gemini", "skills"],
  opencode: [".config", "opencode", "skills"],
};

export const DEFAULT_TARGETS = ["claude", "agents", "codex", "cursor"];
export const ALL_TARGETS = Object.keys(TARGET_DEFS);

export function usage() {
  return `Usage: node scripts/install.mjs [options]

Install cstack skills (upstream pstack + cstack overlay) into coding-agent skill directories.
Uses symlinks on macOS/Linux and directory junctions on Windows by default.
Never modifies unrelated skills (such as T3 Projects' new-project or built-in system skills).

Options:
  --targets <list>  Comma-separated targets: ${ALL_TARGETS.join(", ")}, or "all"
                    (default: ${DEFAULT_TARGETS.join(",")})
  --copy            Copy skill directories instead of linking
  --force           Replace conflicting non-cstack entries at target paths
  --dry-run         Print planned changes without modifying the filesystem
  --uninstall       Remove cstack-managed entries recorded in the manifest
  --status          Show current installation status from the manifest
  --home <dir>      Override the home directory (default: current user's home)
  -h, --help        Show this help message
`;
}

export function parseArgs(argv) {
  const opts = {
    action: "install",
    targets: null,
    copy: false,
    force: false,
    dryRun: false,
    homeDir: os.homedir(),
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--targets": {
        if (i + 1 >= argv.length) {
          throw new Error("--targets requires a comma-separated value");
        }
        opts.targets = parseTargetList(argv[++i]);
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

function parseTargetList(raw) {
  const tokens = raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  if (tokens.length === 0) {
    throw new Error("--targets must specify at least one target");
  }

  const resolved = new Set();
  for (const token of tokens) {
    if (token === "all") {
      for (const name of ALL_TARGETS) {
        resolved.add(name);
      }
    } else if (Object.hasOwn(TARGET_DEFS, token)) {
      resolved.add(token);
    } else {
      throw new Error(
        `Unknown target "${token}". Valid targets: ${ALL_TARGETS.join(", ")}, all`,
      );
    }
  }

  return [...resolved];
}

export function getManifestPath(homeDir) {
  return path.join(homeDir, ".config", "cstack", "install-manifest.json");
}

export function getTargetDir(homeDir, targetName) {
  const segments = TARGET_DEFS[targetName];
  if (!segments) {
    throw new Error(`Unknown target "${targetName}"`);
  }
  return path.join(homeDir, ...segments);
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

export function installCstack({
  repoRoot = DEFAULT_REPO_ROOT,
  homeDir = os.homedir(),
  targets = DEFAULT_TARGETS,
  copy = false,
  force = false,
  dryRun = false,
  platform = process.platform,
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
    const targetDir = getTargetDir(homeDir, targetName);
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

      const ownedByCstack =
        matchesManagedEntry(stat, prevEntry) ||
        (stat &&
          isLinkUnder(destPath, path.join(resolvedRepoRoot, "skills")));

      if (stat && !ownedByCstack && !force) {
        summary.conflicts.push({
          target: targetName,
          skill: skill.name,
          destPath,
          reason: "existing non-cstack entry (re-run with --force to replace)",
        });
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

  const summary = installCstack({
    repoRoot: DEFAULT_REPO_ROOT,
    homeDir: opts.homeDir,
    targets: opts.targets || DEFAULT_TARGETS,
    copy: opts.copy,
    force: opts.force,
    dryRun: opts.dryRun,
  });
  console.log(formatInstallSummary(summary, opts.dryRun));
  process.exit(summary.conflicts.length > 0 ? 1 : 0);
}

const isDirectRun =
  process.argv[1] &&
  pathToFileURL(fs.realpathSync(process.argv[1])).href === import.meta.url;

if (isDirectRun) {
  main();
}
