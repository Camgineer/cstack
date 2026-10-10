import { accessSync, constants, existsSync, readFileSync, realpathSync, readdirSync } from "node:fs";
import { dirname, join, basename, delimiter } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const metadata = JSON.parse(readFileSync(join(root, "tools/metadata.json"), "utf8"));
const { name } = metadata;
const home = process.env.HOME;
if (!home) throw new Error("HOME is required.");
const entry = `${name}-intent`;
const labels = { intent: "Intent", claude: "Claude Code", codex: "Codex", cursor: "Cursor" };

function jsonFile(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

function command(name) {
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    const path = join(directory, name);
    try { accessSync(path, constants.X_OK); return path; } catch {}
  }
  return null;
}

function intentCommand() {
  const found = command("intentd");
  if (found) return found;
  for (const directory of ["/Applications", join(home, "Applications")]) {
    if (!existsSync(directory)) continue;
    for (const app of readdirSync(directory).filter((value) => /^Intent.*\.app$/.test(value))) {
      for (const suffix of ["Contents/MacOS/intentd", "Contents/Resources/intentd"]) {
        const path = join(directory, app, suffix);
        if (existsSync(path)) return path;
      }
    }
  }
  return null;
}

function run(binary, args) {
  const result = spawnSync(binary, args, { encoding: "utf8", timeout: 120000, maxBuffer: 16 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  if (result.error || result.status !== 0) {
    throw new Error(`${shell(binary, args)} failed. ${result.error?.message ?? result.stderr.trim() ?? ""}`);
  }
  return result.stdout;
}

function shell(binary, args = []) {
  return [binary, ...args].map((value) => /^[a-zA-Z0-9_./:@=#+-]+$/.test(value) ? value : `'${value.replaceAll("'", "'\\''")}'`).join(" ");
}

function source(value) {
  if (typeof value !== "string") return null;
  const match = /^(?:github:|git\+ssh:\/\/git@github\.com\/|git\+https:\/\/github\.com\/|https:\/\/github\.com\/)?([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:#([\w./-]+))?$/.exec(value);
  if (!match) return null;
  const repo = `${match[1]}/${match[2]}`;
  const ref = match[3];
  return { repo, ref, npm: `github:${repo}${ref ? `#${ref}` : ""}`, codex: `${repo}${ref ? `@${ref}` : ""}`, git: `https://github.com/${repo}.git${ref ? `#${ref}` : ""}` };
}

function packageSource() {
  const modules = dirname(root);
  if (basename(modules) !== "node_modules") return null;
  let lock;
  try { lock = jsonFile(join(dirname(modules), "package-lock.json")); } catch { return null; }
  const requested = source(lock?.packages?.[""]?.dependencies?.[name]);
  if (requested) return requested;
  const resolved = source(lock?.packages?.[`node_modules/${name}`]?.resolved);
  if (resolved) return { ...resolved, ref: undefined, npm: `github:${resolved.repo}`, codex: resolved.repo, git: `https://github.com/${resolved.repo}.git` };
  return null;
}

function intentSnapshot() {
  const mode = join(home, ".intent/skills", `${name}-mode`);
  let version = "unknown";
  const installed = existsSync(join(mode, "SKILL.md"));
  if (installed) {
    const plugin = dirname(dirname(realpathSync(mode)));
    version = jsonFile(join(plugin, "tools/metadata.json"))?.version ?? "unknown";
  }
  return { present: Boolean(intentCommand()) || existsSync(join(home, ".intent")), copies: installed ? [{ version }] : [] };
}

function claudeSnapshot(binary) {
  if (!binary) return { present: false, copies: [] };
  const list = JSON.parse(run(binary, ["plugin", "list", "--json"]));
  if (!Array.isArray(list)) throw new Error("Claude Code returned an unreadable plugin list.");
  return { present: true, copies: list.filter((copy) => typeof copy.id === "string" && copy.id.split("@")[0] === name && copy.scope !== "synced") };
}

function codexSnapshot(binary) {
  if (!binary) return { present: false, copies: [], markets: [] };
  const list = JSON.parse(run(binary, ["plugin", "list", "--json"]));
  const markets = JSON.parse(run(binary, ["plugin", "marketplace", "list", "--json"]));
  if (!Array.isArray(list.installed) || !Array.isArray(markets.marketplaces)) throw new Error("Codex returned an unreadable plugin list.");
  return { present: true, copies: list.installed.filter((copy) => copy.name === name), markets: markets.marketplaces };
}

function cursorSnapshot(binary) {
  const present = Boolean(binary) || existsSync("/Applications/Cursor.app") || existsSync(join(home, ".cursor"));
  const installed = jsonFile(join(home, ".claude/plugins/installed_plugins.json"));
  const settings = jsonFile(join(home, ".claude/settings.json"));
  const markets = binary ? JSON.parse(run(binary, ["plugin", "marketplace", "list", "--format", "json"])) : [];
  if (!Array.isArray(markets)) throw new Error("Cursor returned an unreadable marketplace list.");
  const copies = Object.entries(installed?.plugins ?? {}).flatMap(([id, entries]) => id.split("@")[0] === name && settings?.enabledPlugins?.[id] === true ? entries.filter((copy) => copy.scope === "user" && copy.installPath).slice(0, 1).map((copy) => ({ ...copy, id })) : []);
  return { present, copies, markets, native: "unknown" };
}

function inspect(id, binary) {
  try {
    if (id === "intent") return intentSnapshot();
    if (id === "claude") return claudeSnapshot(binary);
    if (id === "codex") return codexSnapshot(binary);
    return cursorSnapshot(binary);
  } catch (error) {
    return { present: Boolean(binary), copies: [], problem: error.message };
  }
}

function retry(id, chosenSource) {
  return shell("npx", ["--yes", chosenSource?.npm ?? "github:OWNER/REPO", "--hosts", id]);
}

function plan(id, snapshot, binary, chosenSource, fetchedSource) {
  if (snapshot.problem) return { commands: [], action: `Could not inspect. ${snapshot.problem}`, failed: true };
  if (!snapshot.present) return { commands: [], action: `Install ${labels[id]}, then run ${retry(id, chosenSource)}` };
  if (id === "cursor") {
    const commands = [];
    const market = snapshot.markets.find((item) => item.name === name);
    if (binary && market) commands.push([binary, ["plugin", "marketplace", "update", market.name]]);
    else if (binary && chosenSource) commands.push([binary, ["plugin", "marketplace", "add", chosenSource.git]]);
    const provider = command("claude");
    if (provider) commands.push(...snapshot.copies.map((copy) => [provider, ["plugin", "update", copy.id, "--scope", copy.scope ?? "user"]]));
    return { commands, action: `Open Cursor Customize, find ${name}, and select Install or update. Native installation and version are unknown.${snapshot.copies.length ? " Claude Code imports follow their provider update." : ""}${!market && !chosenSource ? ` Add the GitHub repository first with ${shell(binary ?? "cursor-agent", ["plugin", "marketplace", "add", "https://github.com/OWNER/REPO.git"])}.` : ""}` };
  }
  if (id === "intent") {
    if (!chosenSource) return { commands: [], action: `Run ${retry(id, null)} to deliver the GitHub package` };
    if (fetchedSource?.npm === chosenSource.npm) {
      return { commands: [["sh", [join(root, "hooks/intent-deliver.sh")]]], action: "Start a new Intent agent. Run setup to configure specialists." };
    }
    return { commands: [["npx", ["--yes", `--package=${chosenSource.npm}`, entry, "--hosts", "intent"]]], action: "Start a new Intent agent. Run setup to configure specialists." };
  }
  if (!binary) return { commands: [], action: `Put ${id} on PATH, then run ${retry(id, chosenSource)}` };
  if (id === "claude") {
    if (snapshot.copies.length) {
      return { commands: snapshot.copies.map((copy) => [binary, ["plugin", "update", copy.id, "--scope", copy.scope ?? "user"]]), action: "Restart Claude Code." };
    }
    if (!chosenSource) return { commands: [], action: `Run ${retry(id, null)} to install from GitHub` };
    return { commands: [[binary, ["plugin", "marketplace", "add", chosenSource.git]], [binary, ["plugin", "install", `${name}@${name}`, "--scope", "user"]]], action: "Restart Claude Code." };
  }
  const copies = snapshot.copies;
  const commands = [];
  let migrate = false;
  const pending = [];
  if (!copies.length) {
    if (!chosenSource) return { commands: [], action: `Run ${retry(id, null)} to install from GitHub` };
    commands.push([binary, ["plugin", "marketplace", "add", chosenSource.codex]], [binary, ["plugin", "add", `${name}@${name}`]]);
  }
  for (const copy of copies) {
    const market = copy.marketplaceName;
    const configured = copy.marketplaceSource ?? snapshot.markets.find((item) => item.name === market)?.marketplaceSource;
    if (configured?.sourceType === "local") {
      if (!chosenSource) {
        pending.push(`Run ${retry(id, null)} to move ${copy.pluginId} from its local folder to GitHub.`);
        continue;
      }
      migrate = true;
      commands.push([binary, ["plugin", "marketplace", "remove", market]], [binary, ["plugin", "marketplace", "add", chosenSource.codex]], [binary, ["plugin", "add", `${name}@${name}`]]);
    } else if (configured?.sourceType === "git") {
      commands.push([binary, ["plugin", "marketplace", "upgrade", market]], [binary, ["plugin", "add", copy.pluginId]]);
    } else {
      pending.push(`Run ${shell(binary, ["plugin", "add", copy.pluginId])}. This marketplace has no Git refresh command.`);
    }
  }
  return { commands, migrate, action: [...pending, ...(commands.length ? ["Start a new Codex session. Review and trust its hooks when asked."] : [])].join(" ") };
}

function versions(snapshot) {
  if (snapshot.problem) return "unknown";
  if (!snapshot.copies.length) return snapshot.native ? "unknown" : "-";
  return snapshot.copies.map((copy) => copy.version ?? "unknown").join(", ") + (snapshot.native ? " (Claude import)" : "");
}

function table(rows) {
  const cells = [["Host", "Present", "Installed", "Before", "After", "Result and next action"], ...rows];
  const widths = cells[0].map((_, index) => Math.max(...cells.map((row) => row[index].length)));
  for (const row of cells) process.stdout.write(row.map((cell, index) => cell.padEnd(widths[index])).join("  ").trimEnd() + "\n");
}

async function main() {
  const { values } = parseArgs({ options: { yes: { type: "boolean", short: "y" }, "report-only": { type: "boolean" }, hosts: { type: "string" }, source: { type: "string" }, help: { type: "boolean", short: "h" } } });
  if (values.help) {
    process.stdout.write(`Usage: ${entry} [options]\n\nInstall or update the plugin in Intent, Claude Code, Codex, and Cursor.\n\nOptions:\n  -y, --yes             Skip the question and update installed hosts only.\n  --hosts LIST          Select hosts without a question. Use intent,claude,codex,cursor.\n  --source OWNER/REPO   Use this GitHub source instead of npx package metadata.\n  --report-only         Show detection and planned commands. Change nothing.\n  -h, --help            Show this help.\n\nInstalled hosts are selected by default. Without a terminal, --yes is automatic.\nUpdates use each host's configured source. Fresh installs and a Codex local-folder\nmove use --source or the Git source in npx's adjacent package-lock.json.\nWithout a Git source, other updates continue and the table gives a retry command.\nCursor installation needs its Customize page. Intent specialists belong to setup.\n`);
    return;
  }
  const fetchedSource = packageSource();
  const chosenSource = values.source ? source(values.source) : fetchedSource;
  if (values.source && !chosenSource) throw new Error("--source must name a GitHub repository, such as OWNER/REPO or github:OWNER/REPO.");
  const binaries = { intent: intentCommand(), claude: command("claude"), codex: command("codex"), cursor: command("cursor-agent") ?? command("agent") };
  const snapshots = Object.fromEntries(Object.keys(labels).map((id) => [id, inspect(id, binaries[id])]));
  let selected = Object.keys(labels).filter((id) => snapshots[id].copies.length);
  if (values.hosts !== undefined) {
    selected = values.hosts === "none" ? [] : values.hosts.split(",");
    if (selected.some((id) => !Object.hasOwn(labels, id))) throw new Error("--hosts accepts intent,claude,codex,cursor, or none.");
  } else if (!values.yes && !values["report-only"] && process.stdin.isTTY && process.stdout.isTTY) {
    for (const id of Object.keys(labels)) process.stdout.write(`${id}: ${snapshots[id].present ? "present" : "not present"}, ${versions(snapshots[id])}${selected.includes(id) ? ", selected" : ""}\n`);
    const terminal = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await terminal.question(`Hosts to install or update [${selected.join(",") || "none"}]. Enter a comma-separated list or none: `);
    terminal.close();
    if (answer.trim()) selected = answer.trim() === "none" ? [] : answer.trim().split(",").map((id) => id.trim());
    if (selected.some((id) => !Object.hasOwn(labels, id))) throw new Error("Choose intent,claude,codex,cursor, or none.");
  }
  process.stdout.write(chosenSource ? `GitHub source ${chosenSource.npm}${values.source ? " from --source" : " from npx package-lock.json"}.\n` : "No GitHub source supplied. Installed providers still use their configured source.\n");
  const rows = [];
  const completed = new Map();
  const previewed = new Set();
  let failed = false;
  for (const id of Object.keys(labels)) {
    const before = snapshots[id];
    let after = before;
    let action = before.problem ? `Could not inspect. ${before.problem}` : "Not selected.";
    failed ||= Boolean(before.problem);
    if (selected.includes(id)) {
      const operation = plan(id, before, binaries[id], chosenSource, fetchedSource);
      failed ||= Boolean(operation.failed);
      action = operation.action;
      if (values["report-only"]) {
        const commands = operation.commands.filter((item) => {
          const key = JSON.stringify(item);
          if (previewed.has(key)) return false;
          previewed.add(key);
          return true;
        });
        action = commands.length ? `Would run ${commands.map(([binary, args]) => shell(binary, args)).join(" ; ")}. ${action}` : action;
      } else if (operation.commands.length) {
        if (operation.migrate) process.stdout.write("Moving Codex from its local folder to the GitHub source before updating.\n");
        try {
          const kept = [];
          for (const [binary, args] of operation.commands) {
            const key = JSON.stringify([binary, args]);
            const output = completed.get(key) ?? run(binary, args);
            completed.set(key, output);
            kept.push(...output.split("\n").filter((line) => line.startsWith("left your own ") || line.startsWith("To keep the mode on") || line.startsWith("Before any other step")));
          }
          action = `Updated. ${kept.length ? `${kept.join(". ")}. Nothing is needed for your own files. ` : ""}${action}`;
        } catch (error) {
          failed = true;
          action = `${error.message} Retry with ${retry(id, chosenSource)}`;
        }
        after = inspect(id, binaries[id]);
        if (after.problem) { failed = true; action += ` Could not read the resulting version. ${after.problem}`; }
      }
    }
    rows.push([labels[id], before.present ? "yes" : "no", after.problem ? "unknown" : after.copies.length ? "yes" : after.native ? "unknown" : "no", versions(before), versions(after), action.replace(/\s+/g, " ")]);
  }
  if (values["report-only"]) process.stdout.write("Report only. No install, update, or move was run.\n");
  table(rows);
  process.exitCode = failed ? 1 : 0;
}

main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 2; });
