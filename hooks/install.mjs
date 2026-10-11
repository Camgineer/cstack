import { accessSync, constants, existsSync, readFileSync, realpathSync, readdirSync, lstatSync, readlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, basename, delimiter, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const metadata = JSON.parse(readFileSync(join(root, "tools/metadata.json"), "utf8"));
const { name } = metadata;
const home = process.env.HOME;
if (!home || !isAbsolute(home)) throw new Error("HOME must be an absolute path.");
const entry = `${name}-intent`;
let commandTimeout = 120000;
let deliveryChild = false;
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

function run(binary, args, cwd, retryCommands = [[binary, args, cwd]]) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { cwd, detached: !deliveryChild && process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let bytes = 0;
    let settled = false;
    const stop = () => {
      try { process.kill(deliveryChild || process.platform === "win32" ? child.pid : -child.pid, "SIGKILL"); }
      catch { child.kill("SIGKILL"); }
    };
    const finish = (problem) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.stdout.destroy();
      child.stderr.destroy();
      if (problem) {
        stop();
        child.unref();
        reject(new Error(`${commandLine([binary, args, cwd])} failed. ${problem} ${stdout.trim()} ${stderr.trim()} Retry with ${retryCommands.map(commandLine).join(" && ")}.`.replace(/\s+/g, " ")));
      } else resolve(stdout);
    };
    const timer = setTimeout(() => finish(`timed out after ${commandTimeout}ms.`), commandTimeout);
    for (const [stream, collect] of [[child.stdout, (data) => { stdout += data; }], [child.stderr, (data) => { stderr += data; }]]) {
      stream.setEncoding("utf8");
      stream.on("data", (data) => {
        bytes += Buffer.byteLength(data);
        if (bytes > 16 * 1024 * 1024) finish("command output exceeded 16 MiB.");
        else collect(data);
      });
    }
    child.on("error", (error) => finish(error.message));
    child.on("close", (code, signal) => finish(code === 0 ? null : `exit ${code ?? signal}.`));
  });
}

function shell(binary, args = []) {
  return [binary, ...args].map((value) => /^[a-zA-Z0-9_./:@=#+-]+$/.test(value) ? value : `'${value.replaceAll("'", "'\\''")}'`).join(" ");
}

function commandLine([binary, args, cwd]) {
  return `${cwd ? `cd ${shell(cwd)} && ` : ""}${shell(binary, args)}`;
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

function intentContents(plugin) {
  const hash = createHash("sha256");
  const visit = (relative) => {
    const path = join(plugin, relative);
    if (!existsSync(path)) return;
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) hash.update(JSON.stringify([relative, "link", readlinkSync(path)]));
    else if (stat.isDirectory()) {
      hash.update(JSON.stringify([relative, "directory"]));
      for (const child of readdirSync(path).sort()) if (child !== "node_modules") visit(join(relative, child));
    } else {
      const data = readFileSync(path);
      hash.update(JSON.stringify([relative, "file", data.length])).update(data);
    }
  };
  for (const relative of ["agents", "hooks", "skills", "tools/metadata.json", "LICENSE"]) visit(relative);
  return hash.digest("hex");
}

function intentSnapshot() {
  const mode = join(home, ".intent/skills", `${name}-mode`);
  let version = "unknown";
  let installPath;
  const installed = existsSync(join(mode, "SKILL.md"));
  if (installed) {
    installPath = dirname(dirname(realpathSync(mode)));
    version = jsonFile(join(installPath, "tools/metadata.json"))?.version ?? "unknown";
  }
  return { present: Boolean(intentCommand()) || existsSync(join(home, ".intent")), copies: installed ? [{ version, installPath, content: intentContents(installPath) }] : [] };
}

async function claudeSnapshot(binary) {
  if (!binary) return { present: false, copies: [] };
  const list = JSON.parse(await run(binary, ["plugin", "list", "--json"]));
  if (!Array.isArray(list)) throw new Error("Claude Code returned an unreadable plugin list.");
  return { present: true, copies: list.filter((copy) => typeof copy.id === "string" && copy.id.split("@")[0] === name && copy.scope !== "synced") };
}

async function codexSnapshot(binary) {
  if (!binary) return { present: false, copies: [], markets: [] };
  const list = JSON.parse(await run(binary, ["plugin", "list", "--json"]));
  const markets = JSON.parse(await run(binary, ["plugin", "marketplace", "list", "--json"]));
  if (!Array.isArray(list.installed) || !Array.isArray(markets.marketplaces)) throw new Error("Codex returned an unreadable plugin list.");
  return { present: true, copies: list.installed.filter((copy) => copy.name === name), markets: markets.marketplaces };
}

async function cursorSnapshot(binary) {
  const present = Boolean(binary) || existsSync("/Applications/Cursor.app") || existsSync(join(home, ".cursor"));
  const installed = jsonFile(join(home, ".claude/plugins/installed_plugins.json"));
  const settings = jsonFile(join(home, ".claude/settings.json"));
  const markets = binary ? JSON.parse(await run(binary, ["plugin", "marketplace", "list", "--format", "json"])) : [];
  if (!Array.isArray(markets)) throw new Error("Cursor returned an unreadable marketplace list.");
  const copies = Object.entries(installed?.plugins ?? {}).flatMap(([id, entries]) => id.split("@")[0] === name && settings?.enabledPlugins?.[id] === true ? entries.filter((copy) => copy.scope === "user" && copy.installPath).slice(0, 1).map((copy) => ({ ...copy, id })) : []);
  return { present, copies, markets, native: "unknown" };
}

async function inspect(id, binary) {
  try {
    if (id === "intent") return intentSnapshot();
    if (id === "claude") return await claudeSnapshot(binary);
    if (id === "codex") return await codexSnapshot(binary);
    return await cursorSnapshot(binary);
  } catch (error) {
    const args = id === "cursor" ? ["plugin", "marketplace", "list", "--format", "json"] : ["plugin", "list", "--json"];
    return { present: Boolean(binary), copies: [], problem: error.message.includes("Retry with ") ? error.message : `${error.message} Retry with ${id === "intent" ? retry(id, null) : shell(binary, args)}.` };
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
      return { delivery: "direct", commands: [["sh", [join(root, "hooks/intent-deliver.sh")]]], action: "Run setup to configure specialists." };
    }
    return { delivery: "fetched", commands: [["npx", ["--yes", `--package=${chosenSource.npm}`, entry, "--deliver-intent-source", chosenSource.npm, "--timeout-ms", String(commandTimeout)]]], action: "Run setup to configure specialists." };
  }
  if (!binary) return { commands: [], action: `Put ${id} on PATH, then run ${retry(id, chosenSource)}` };
  if (id === "claude") {
    if (snapshot.copies.length) {
      return { independent: true, commands: snapshot.copies.map((copy) => [binary, ["plugin", "update", copy.id, "--scope", copy.scope ?? "user"], copy.scope === "project" || copy.scope === "local" ? copy.projectPath : undefined]), action: "" };
    }
    if (!chosenSource) return { commands: [], action: `Run ${retry(id, null)} to install from GitHub` };
    return { commands: [[binary, ["plugin", "marketplace", "add", chosenSource.git]], [binary, ["plugin", "install", `${name}@${name}`, "--scope", "user"]]], action: "" };
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
  return { commands, migrate, pending: pending.join(" "), action: [...pending, ...(commands.length ? ["Review and trust its hooks when asked."] : [])].join(" ") };
}

function intentDelivery(output, packageSource) {
  const lines = output.trim().split("\n").filter(Boolean);
  const changed = lines.some((line) => /^(linked|removed|added) /.test(line));
  return { kind: "intent-delivery", source: packageSource.npm, changed, messages: lines.filter((line) => !/^(copied|linked|removed) /.test(line)) };
}

function fetchedDelivery(output, chosenSource) {
  let result;
  try { result = JSON.parse(output); }
  catch { throw new Error(`The fetched Intent package returned an unreadable delivery result. ${output.trim()}`); }
  if (!result || result.kind !== "intent-delivery" || result.source !== chosenSource.npm || typeof result.changed !== "boolean" || !Array.isArray(result.messages) || result.messages.some((line) => typeof line !== "string")) {
    throw new Error(`The fetched Intent package returned an unreadable delivery result. ${output.trim()}`);
  }
  return result;
}

function versions(snapshot) {
  if (snapshot.problem) return "unknown";
  if (!snapshot.copies.length) return snapshot.native ? "unknown" : "-";
  return snapshot.copies.map((copy) => copy.version ?? "unknown").join(", ") + (snapshot.native ? " (Claude import)" : "");
}

function copyState(snapshot) {
  return JSON.stringify(snapshot.copies.map((copy) => {
    const configured = copy.marketplaceSource ?? snapshot.markets?.find((item) => item.name === copy.marketplaceName)?.marketplaceSource;
    return [copy.id ?? copy.pluginId ?? copy.name, copy.scope, copy.projectPath, copy.version, copy.installPath, copy.content, configured?.sourceType, configured?.source, copy.source];
  }).map((copy) => JSON.stringify(copy)).sort());
}

function table(rows) {
  const cells = [["Host", "Present", "Installed", "Before", "After", "Result and next action"], ...rows];
  const widths = cells[0].map((_, index) => Math.max(...cells.map((row) => row[index].length)));
  for (const row of cells) process.stdout.write(row.map((cell, index) => cell.padEnd(widths[index])).join("  ").trimEnd() + "\n");
}

async function main() {
  const { values } = parseArgs({ options: { yes: { type: "boolean", short: "y" }, "report-only": { type: "boolean" }, hosts: { type: "string" }, source: { type: "string" }, "timeout-ms": { type: "string" }, "deliver-intent-source": { type: "string" }, help: { type: "boolean", short: "h" } } });
  if (values.help) {
    process.stdout.write(`Usage: ${entry} [options]\n\nInstall or update the plugin in Intent, Claude Code, Codex, and Cursor.\n\nOptions:\n  -y, --yes             Skip the question and update installed hosts only.\n  --hosts LIST          Select hosts without a question. Use intent,claude,codex,cursor.\n  --source OWNER/REPO   Use this GitHub source instead of npx package metadata.\n  --report-only         Show detection and planned commands. Change nothing.\n  --timeout-ms MS       Limit each host command to MS milliseconds. Default 120000.\n  -h, --help            Show this help.\n\nInstalled hosts are selected by default. Without a terminal, --yes is automatic.\nUpdates use each host's configured source. Fresh installs and a Codex local-folder\nmove use --source or a best-effort read of npx's adjacent package-lock.json.\nWithout a Git source, other updates continue and the table gives a retry command.\nUnchanged copies report their current version and need no session action.\nFor updated copies, new sessions use the new version. Open sessions keep the old\nversion until you start them again.\nCursor installation needs its Customize page. Intent specialists belong to setup.\n`);
    return;
  }
  if (values["timeout-ms"] !== undefined) {
    commandTimeout = Number(values["timeout-ms"]);
    if (!Number.isSafeInteger(commandTimeout) || commandTimeout < 1) throw new Error("--timeout-ms must be a positive integer.");
  }
  const execute = (...command) => {
    if (values["report-only"]) throw new Error("Report-only cannot install, update, move, or deliver the plugin.");
    return run(...command);
  };
  if (values["deliver-intent-source"] !== undefined) {
    const packageSource = source(values["deliver-intent-source"]);
    if (!packageSource || basename(dirname(root)) !== "node_modules" || existsSync(join(root, ".git"))) throw new Error("Intent package delivery requires a fetched GitHub package.");
    deliveryChild = true;
    const output = await execute("sh", [join(root, "hooks/intent-deliver.sh")]);
    process.stdout.write(JSON.stringify(intentDelivery(output, packageSource)) + "\n");
    return;
  }
  const fetchedSource = packageSource();
  const chosenSource = values.source ? source(values.source) : fetchedSource;
  if (values.source && !chosenSource) throw new Error("--source must name a GitHub repository, such as OWNER/REPO or github:OWNER/REPO.");
  const binaries = { intent: intentCommand(), claude: command("claude"), codex: command("codex"), cursor: command("cursor-agent") ?? command("agent") };
  const snapshots = {};
  for (const id of Object.keys(labels)) snapshots[id] = await inspect(id, binaries[id]);
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
          const key = JSON.stringify([item[0], item[1], item[2] ?? null]);
          if (previewed.has(key)) return false;
          previewed.add(key);
          return true;
        });
        action = commands.length ? `${operation.migrate ? "Would move Codex from its local folder to the GitHub source before updating. " : ""}Would run ${commands.map(commandLine).join(" ; ")}. ${action}` : action;
      } else if (operation.commands.length) {
        if (operation.migrate) process.stdout.write("Moving Codex from its local folder to the GitHub source before updating.\n");
        const kept = [];
        let deliveryChanged = false;
        let problem;
        try {
          const problems = [];
          for (const [index, [binary, args, cwd]] of operation.commands.entries()) {
            try {
              const key = JSON.stringify([binary, args, cwd ?? null]);
              const output = completed.get(key) ?? await execute(binary, args, cwd, operation.migrate ? operation.commands.slice(index) : undefined);
              completed.set(key, output);
              if (id === "intent") {
                const outcome = operation.delivery === "fetched" ? fetchedDelivery(output, chosenSource) : intentDelivery(output, chosenSource);
                deliveryChanged ||= outcome.changed;
                kept.push(...outcome.messages);
              }
            } catch (error) {
              const message = error.message.includes("Retry with ") ? error.message : `${error.message} Retry with ${commandLine([binary, args, cwd])}.`;
              if (!operation.independent) throw new Error(message);
              problems.push(message);
            }
          }
          if (problems.length) throw new Error(problems.join(" "));
        } catch (error) {
          failed = true;
          problem = error.message;
        }
        after = await inspect(id, binaries[id]);
        if (after.problem) {
          failed = true;
          problem = `${problem ?? ""} Could not read the resulting version. ${after.problem}`;
        }
        const changed = !after.problem && (copyState(before) !== copyState(after) || deliveryChanged);
        const outcomes = [["left your own ", "personal entries untouched"], ["Recorded the earlier ", "earlier links recorded"]];
        const summarized = kept.filter((line) => !outcomes.some(([prefix]) => line.startsWith(prefix)));
        for (const [prefix, description] of outcomes) {
          const matching = kept.filter((line) => line.startsWith(prefix));
          if (matching.length === 1) summarized.push(matching[0]);
          else if (matching.length > 1) summarized.push(`${matching.length} ${description}. For example, ${matching[0]}`);
        }
        const preserved = kept.some((line) => line.startsWith("left your own "));
        const messages = `${summarized.map((line) => /[.:]$/.test(line) ? `${line} ` : `${line}. `).join("")}${preserved ? "Nothing is needed for your own files. " : ""}`;
        if (problem) action = `${problem} ${messages}`;
        else if (changed) action = `Updated. New sessions use version ${versions(after)}. Sessions already open keep the old version until you start them again. ${messages}${action}`;
        else if (operation.pending) action = `No installed version changed. ${messages}${operation.pending}`;
        else if (after.copies.length) action = `Already current at ${versions(after)}. ${messages}${id === "cursor" ? action : ""}`;
        else action = `${id === "intent" ? "No files changed." : "Marketplace checked."} ${messages}${id === "cursor" ? action : ""}`;
      }
    }
    rows.push([labels[id], before.present ? "yes" : "no", after.problem ? "unknown" : after.copies.length ? "yes" : after.native ? "unknown" : "no", versions(before), versions(after), action.replace(/\s+/g, " ")]);
  }
  if (values["report-only"]) process.stdout.write("Report only. No install, update, or move was run.\n");
  table(rows);
  process.exitCode = failed ? 1 : 0;
}

main().catch((error) => { process.stderr.write(`${error.message}\n`); process.exitCode = 2; });
