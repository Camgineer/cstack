import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, realpathSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const script = join(root, "hooks/intent-deliver.sh");

function withHome(run: (home: string) => void): void {
  const home = mkdtempSync(join(tmpdir(), "intent home "));
  try {
    fixturePath(home);
    run(home);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

function install(home: string, from = script) {
  return spawnSync("sh", [from], { env: { PATH: join(home, "bin"), HOME: home }, encoding: "utf8" });
}

function visibleSkills(): string[] {
  return readdirSync(join(root, "skills"))
    .filter((name) => existsSync(join(root, "skills", name, "SKILL.md")))
    .filter((name) => !/^disable-model-invocation: true$/m.test(readFileSync(join(root, "skills", name, "SKILL.md"), "utf8").split("\n---\n")[0] ?? ""))
    .sort();
}

test("links every visible skill into Intent, and leaves specialist setup alone", () => {
  withHome((home) => {
    const result = install(home);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);

    const skills = join(home, ".intent/skills");
    const linked = readdirSync(skills).sort();
    expect(linked).toEqual(visibleSkills());
    expect(linked).toContain("cstack-mode");
    expect(linked).not.toContain("principle-laziness-protocol");
    expect(readlinkSync(join(skills, "cstack-mode"))).toBe(join(root, "skills/cstack-mode"));
    expect(readFileSync(join(skills, "setup/SKILL.md"), "utf8")).toBe(readFileSync(join(root, "skills/setup/SKILL.md"), "utf8"));

    const specialists = join(home, ".intent/specialists");
    expect(existsSync(specialists)).toBe(false);

    const rerun = install(home);
    expect(rerun.status).toBe(0);
    expect(rerun.stdout).toBe("");
  });
});

test("an update drops links to removed or hidden skills and keeps the person's own entries", () => {
  withHome((home) => {
    const skills = join(home, ".intent/skills");
    mkdirSync(join(skills, "align"), { recursive: true });
    symlinkSync(join(root, "skills/retired"), join(skills, "retired"));
    symlinkSync(join(root, "skills/principle-laziness-protocol"), join(skills, "principle-laziness-protocol"));
    mkdirSync(join(home, "elsewhere/how"), { recursive: true });
    symlinkSync(join(home, "elsewhere/how"), join(skills, "how"));

    const result = install(home);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`removed ${join(skills, "retired")}\n`);
    expect(result.stdout).toContain(`removed ${join(skills, "principle-laziness-protocol")}\n`);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("left your own align as it is\n");
    expect(result.stdout).toContain("left your own how as it is\n");

    const linked = readdirSync(skills);
    expect(linked).not.toContain("retired");
    expect(linked).not.toContain("principle-laziness-protocol");
    expect(readdirSync(join(skills, "align"))).toEqual([]);
    expect(readlinkSync(join(skills, "how"))).toBe(join(home, "elsewhere/how"));
    expect(readlinkSync(join(skills, "cstack-mode"))).toBe(join(root, "skills/cstack-mode"));
  });
});

test("follows a link to the script back to its checkout", () => {
  withHome((home) => {
    mkdirSync(join(home, "bin"), { recursive: true });
    symlinkSync(script, join(home, "bin/intent-install"));

    const result = install(home, join(home, "bin/intent-install"));
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(readlinkSync(join(home, ".intent/skills/cstack-mode"))).toBe(join(root, "skills/cstack-mode"));
  });
});

function copyPlugin(to: string): void {
  for (const entry of ["agents", "hooks", "skills", "tools"]) {
    cpSync(join(root, entry), join(to, entry), { recursive: true, filter: (source) => !source.includes("node_modules") });
  }
}

function npxInstall(home: string, cache: string) {
  const bin = join(cache, "node_modules/.bin");
  mkdirSync(bin, { recursive: true });
  symlinkSync("../cstack/hooks/intent-deliver.sh", join(bin, "cstack-intent"));
  return install(home, join(bin, "cstack-intent"));
}

test("run by npx, it links to its own copy, which outlives npx's cache and follows each update", () => {
  withHome((home) => {
    const copy = join(realpathSync(home), ".local/share/cstack");
    const skills = join(home, ".intent/skills");
    const first = join(home, "npx/first");
    copyPlugin(join(first, "node_modules/cstack"));

    const result = npxInstall(home, first);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
    expect(result.stdout.split("\n")[0]).toBe(`copied the plugin to ${copy}`);
    expect(readlinkSync(join(skills, "cstack-mode"))).toBe(join(copy, "skills/cstack-mode"));
    expect(existsSync(join(home, ".intent/specialists"))).toBe(false);
    rmSync(first, { recursive: true });
    expect(readFileSync(join(skills, "setup/SKILL.md"), "utf8")).toBe(readFileSync(join(root, "skills/setup/SKILL.md"), "utf8"));

    const update = join(home, "npx/update");
    copyPlugin(join(update, "node_modules/cstack"));
    rmSync(join(update, "node_modules/cstack/skills/how"), { recursive: true });
    const updated = npxInstall(home, update);
    expect(updated.status).toBe(0);
    expect(updated.stdout).toContain(`removed ${join(skills, "how")}\n`);
    expect(readdirSync(skills).sort()).toEqual(visibleSkills().filter((name) => name !== "how"));
  });
});

test("run by npx, it leaves a folder of the person's own where its copy would go", () => {
  withHome((home) => {
    const mine = join(home, ".local/share/cstack");
    mkdirSync(mine, { recursive: true });
    const cache = join(home, "npx");
    copyPlugin(join(cache, "node_modules/cstack"));

    const result = npxInstall(home, cache);
    expect(result.status).toBe(2);
    expect(result.stderr).toBe(`kept ${mine}: it is not a copy of this plugin\n`);
    expect(readdirSync(mine)).toEqual([]);
    expect(existsSync(join(home, ".intent"))).toBe(false);
  });
});

test("a checkout reached through an alias, then moved, keeps working links", () => {
  withHome((home) => {
    const checkout = join(home, "plugin checkout");
    copyPlugin(checkout);
    mkdirSync(join(checkout, ".git"));
    symlinkSync(checkout, join(home, "alias"));
    expect(install(home, join(home, "alias/hooks/intent-deliver.sh")).status).toBe(0);

    const skills = join(home, ".intent/skills");
    expect(readlinkSync(join(skills, "cstack-mode"))).toBe(join(realpathSync(checkout), "skills/cstack-mode"));
    const again = install(home, join(checkout, "hooks/intent-deliver.sh"));
    expect(again.status).toBe(0);
    expect(again.stdout).toBe("");

    const moved = join(home, "moved checkout");
    renameSync(checkout, moved);
    const afterMove = install(home, join(moved, "hooks/intent-deliver.sh"));
    expect(afterMove.stderr).toBe("");
    expect(afterMove.status).toBe(0);
    expect(readlinkSync(join(skills, "cstack-mode"))).toBe(join(realpathSync(moved), "skills/cstack-mode"));
    expect(existsSync(join(home, ".intent/specialists"))).toBe(false);
    expect(readdirSync(skills).sort()).toEqual(visibleSkills());
  });
});

test("the first install turns the mode on through Intent's personal rule, and an update leaves the rule alone", () => {
  withHome((home) => {
    const bin = join(home, "bin");
    mkdirSync(bin, { recursive: true });
    writeFileSync(join(bin, "intentd"), `#!/bin/sh
case "$2" in
  rules.get) printf '{"enabled":false,"content":"","updatedAt":0}' ;;
  rules.update) printf '%s\\n' "$4" >> "${join(home, "updates")}"; printf '{}' ;;
esac
case "$1" in settings) echo 'git.autoCommit = false' ;; esac
`, { mode: 0o755 });
    const run = () => spawnSync("sh", [script], { env: { PATH: bin, HOME: home }, encoding: "utf8" });

    expect(run().stdout).toContain("added the cstack-mode rule to Intent's Settings, under Agent Behavior\n");
    const update = JSON.parse(readFileSync(join(home, "updates"), "utf8"));
    expect(update).toEqual({
      workspaceId: "global",
      ruleType: "workspace",
      enabled: true,
      content: "Before any other step, read the `cstack-mode` skill's SKILL.md from your skills list and follow it for the rest of the session.",
    });

    expect(run().stdout).toBe("");
    expect(readFileSync(join(home, "updates"), "utf8").trim().split("\n")).toHaveLength(1);
  });
});

function fixturePath(home: string): string {
  const bin = join(home, "bin");
  mkdirSync(bin, { recursive: true });
  if (!existsSync(join(bin, "node"))) {
    const located = spawnSync("which", ["node"], { encoding: "utf8" });
    if (located.status !== 0) throw new Error("The install tests need Node on PATH.");
    symlinkSync(located.stdout.trim(), join(bin, "node"));
    for (const utility of ["sh", "sed", "head", "awk", "dirname", "basename", "cp", "mkdir", "rm", "ln", "readlink", "mv", "find", "grep"]) {
      symlinkSync(spawnSync("which", [utility], { encoding: "utf8" }).stdout.trim(), join(bin, utility));
    }
    writeFileSync(join(bin, "intentd"), '#!/bin/sh\ncase "$2" in rules.get) printf \'{"content":"cstack-mode","enabled":true}\' ;; esac\n', { mode: 0o755 });
  }
  return bin;
}

function hosts(home: string, options: { claude?: boolean; codex?: "git" | "local"; fail?: string; cursorMarket?: boolean } = {}) {
  const bin = fixturePath(home);
  const state = {
    claude: options.claude ? [{ id: "cstack@cstack", version: "1.0.0", scope: "user" }] : [],
    codex: options.codex ? [{ name: "cstack", pluginId: "cstack@cstack", marketplaceName: "cstack", version: "2.0.0", marketplaceSource: { sourceType: options.codex, source: join(home, "old folder") } }] : [],
    markets: options.codex ? [{ name: "cstack", marketplaceSource: { sourceType: options.codex, source: "configured" } }] : [],
  };
  writeFileSync(join(home, "state.json"), JSON.stringify(state));
  const standIn = [
    "#!/usr/bin/env node",
    "import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';",
    "import { basename, join } from 'node:path';",
    "const home = process.env.HOME;",
    "const file = join(home, 'state.json');",
    "const state = JSON.parse(readFileSync(file, 'utf8'));",
    "const host = basename(process.argv[1]);",
    "const args = process.argv.slice(2);",
    "appendFileSync(join(home, 'commands.jsonl'), JSON.stringify([host,...args])+'\\n');",
    "if (host+' '+args.join(' ') === " + JSON.stringify(options.fail ?? "") + ") { console.error('fixture failure'); process.exit(1); }",
    "let result = {};",
    "if (host === 'cursor-agent') result = args[2] === 'list' ? " + JSON.stringify(options.cursorMarket ? [{name:"cstack",gitUrl:"https://github.com/example/toolkit.git"}] : []) + " : {};",
    "if (host === 'claude') {",
    "  if (args[1] === 'list') result = state.claude;",
    "  else if (args[1] === 'update' || args[1] === 'install') state.claude = [{id:'cstack@cstack',version:'9.0.0',scope:'user'}];",
    "} else if (host === 'codex') {",
    "  if (args[1] === 'list') result = {installed:state.codex};",
    "  else if (args[2] === 'list') result = {marketplaces:state.markets};",
    "  else if (args[2] === 'remove') state.markets = [];",
    "  else if (args[2] === 'add') state.markets = [{name:'cstack',marketplaceSource:{sourceType:'git',source:args[3]}}];",
    "  else if (args[1] === 'add') state.codex = [{name:'cstack',pluginId:'cstack@cstack',marketplaceName:'cstack',version:'9.0.0',marketplaceSource:{sourceType:'git',source:'configured'}}];",
    "}",
    "writeFileSync(file,JSON.stringify(state));",
    "if (host === 'claude' && (args[1] === 'update' || args[1] === 'install')) { try { const registry = join(home, '.claude/plugins/installed_plugins.json'); const value = JSON.parse(readFileSync(registry, 'utf8')); value.plugins['cstack@cstack'][0].version = '9.0.0'; writeFileSync(registry, JSON.stringify(value)); } catch {} }",
    "console.log(JSON.stringify(result));",
  ].join("\n");
  writeFileSync(join(bin, "host.mjs"), standIn, { mode: 0o755 });
  for (const host of ["claude", "codex", "cursor-agent"]) symlinkSync("host.mjs", join(bin, host));
  return { PATH: bin, HOME: home };
}

const entry = join(root, "hooks/intent-install.sh");

function commandRun(home: string, args: string[] = [], from = entry) {
  return spawnSync("sh", [from, ...args], { env: { PATH: join(home, "bin"), HOME: home }, encoding: "utf8", timeout: 20000 });
}

function mutations(home: string): string[][] {
  const file = join(home, "commands.jsonl");
  if (!existsSync(file)) return [];
  const calls: string[][] = readFileSync(file, "utf8").trim().split("\n").map((line) => JSON.parse(line));
  return calls.filter((args) => !args.includes("list"));
}

function fetchedPackage(home: string): string {
  const cache = join(home, "npx/cache");
  copyPlugin(join(cache, "node_modules/cstack"));
  writeFileSync(join(cache, "package-lock.json"), JSON.stringify({ packages: {
    "": { dependencies: { cstack: "github:example/toolkit" } },
    "node_modules/cstack": { resolved: "git+ssh://git@github.com/example/toolkit.git#0123456789012345678901234567890123456789" },
  } }));
  return join(cache, "node_modules/cstack/hooks/intent-install.sh");
}

test("the public command reports all hosts without running an update", () => {
  withHome((home) => {
    hosts(home, { claude: true, codex: "git" });
    const result = commandRun(home, ["--report-only"]);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Report only. No install, update, or move was run.");
    expect(result.stdout).toMatch(/Claude Code\s+yes\s+yes\s+1.0.0\s+1.0.0/);
    expect(result.stdout).toMatch(/Codex\s+yes\s+yes\s+2.0.0\s+2.0.0/);
    expect(result.stdout).toContain("Intent");
    expect(result.stdout).toContain("Cursor");
    expect(result.stdout).toContain("Would run");
    expect(mutations(home)).toEqual([]);
  });
});

test("without a terminal or with --yes, only installed hosts update through their configured sources", () => {
  for (const args of [[], ["--yes"]]) withHome((home) => {
    hosts(home, { claude: true, codex: "git" });
    const result = commandRun(home, args);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Claude Code\s+yes\s+yes\s+1.0.0\s+9.0.0/);
    expect(result.stdout).toMatch(/Codex\s+yes\s+yes\s+2.0.0\s+9.0.0/);
    expect(mutations(home)).toEqual([
      ["claude", "plugin", "update", "cstack@cstack", "--scope", "user"],
      ["codex", "plugin", "marketplace", "upgrade", "cstack"],
      ["codex", "plugin", "add", "cstack@cstack"],
    ]);
    expect(existsSync(join(home, ".intent"))).toBe(false);
  });
});

test("the host selection flag installs fresh copies from the npx Git source", () => {
  withHome((home) => {
    hosts(home);
    const result = commandRun(home, ["--hosts", "claude,codex"], fetchedPackage(home));
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("GitHub source github:example/toolkit from npx package-lock.json.");
    expect(mutations(home)).toEqual([
      ["claude", "plugin", "marketplace", "add", "https://github.com/example/toolkit.git"],
      ["claude", "plugin", "install", "cstack@cstack", "--scope", "user"],
      ["codex", "plugin", "marketplace", "add", "example/toolkit"],
      ["codex", "plugin", "add", "cstack@cstack"],
    ]);
    expect(result.stdout).toMatch(/Claude Code\s+yes\s+yes\s+-\s+9.0.0/);
    expect(result.stdout).toMatch(/Codex\s+yes\s+yes\s+-\s+9.0.0/);
  });
});

test("--source wins over npx metadata when Codex moves off a local folder", () => {
  withHome((home) => {
    hosts(home, { codex: "local" });
    const result = commandRun(home, ["--yes", "--source", "other/fork"], fetchedPackage(home));
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Moving Codex from its local folder to the GitHub source before updating.");
    expect(mutations(home)).toEqual([
      ["codex", "plugin", "marketplace", "remove", "cstack"],
      ["codex", "plugin", "marketplace", "add", "other/fork"],
      ["codex", "plugin", "add", "cstack@cstack"],
    ]);
    expect(result.stdout).toMatch(/Codex\s+yes\s+yes\s+2.0.0\s+9.0.0/);
  });
});

test("a failing host leaves its retry command and the other hosts still update", () => {
  withHome((home) => {
    hosts(home, { claude: true, codex: "git", fail: "claude plugin update cstack@cstack --scope user" });
    const result = commandRun(home, ["--yes"]);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("fixture failure");
    expect(result.stdout).toContain("Retry with npx --yes github:OWNER/REPO --hosts claude");
    expect(result.stdout).toMatch(/Claude Code\s+yes\s+yes\s+1.0.0\s+1.0.0/);
    expect(result.stdout).toMatch(/Codex\s+yes\s+yes\s+2.0.0\s+9.0.0/);
    expect(mutations(home)).toEqual([
      ["claude", "plugin", "update", "cstack@cstack", "--scope", "user"],
      ["codex", "plugin", "marketplace", "upgrade", "cstack"],
      ["codex", "plugin", "add", "cstack@cstack"],
    ]);
  });
});

test("without a Git source, local migration gives a command while other updates continue", () => {
  withHome((home) => {
    hosts(home, { claude: true, codex: "local" });
    const result = commandRun(home, ["--hosts", "intent,claude,codex,cursor"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("npx --yes github:OWNER/REPO --hosts intent");
    expect(result.stdout).toContain("npx --yes github:OWNER/REPO --hosts codex");
    expect(result.stdout).toContain("Open Cursor Customize, find cstack, and select Install or update.");
    expect(mutations(home)).toEqual([["claude", "plugin", "update", "cstack@cstack", "--scope", "user"]]);
    expect(result.stdout).toMatch(/Claude Code\s+yes\s+yes\s+1.0.0\s+9.0.0/);
  });
});

test("npx delivery leaves a person's own specialist intact and succeeds with that result in the table", () => {
  withHome((home) => {
    hosts(home);
    const specialists = join(home, ".intent/specialists");
    mkdirSync(specialists, { recursive: true });
    writeFileSync(join(specialists, "cstack-agent.md"), "My provider and model.\n");
    const result = commandRun(home, ["--hosts", "intent"], fetchedPackage(home));
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("left your own cstack-agent.md as it is. Nothing is needed for your own files.");
    expect(result.stdout.indexOf("left your own")).toBeGreaterThan(result.stdout.indexOf("Host"));
    expect(readFileSync(join(specialists, "cstack-agent.md"), "utf8")).toBe("My provider and model.\n");
    expect(readdirSync(specialists)).toEqual(["cstack-agent.md"]);
    expect(readFileSync(join(home, ".intent/skills/cstack-mode/SKILL.md"), "utf8")).toBe(readFileSync(join(root, "skills/cstack-mode/SKILL.md"), "utf8"));
  });
});

const terminalDriver = [
  "import os, pty, select, subprocess, sys, time",
  "master, slave = pty.openpty()",
  "p = subprocess.Popen(['sh', sys.argv[1]], stdin=slave, stdout=slave, stderr=slave, close_fds=True)",
  "os.close(slave)",
  "output = b''",
  "sent = False",
  "deadline = time.monotonic() + 10",
  "try:",
  "    while time.monotonic() < deadline:",
  "        ready, _, _ = select.select([master], [], [], 0.1)",
  "        if ready:",
  "            try:",
  "                chunk = os.read(master, 65536)",
  "            except OSError:",
  "                break",
  "            if not chunk:",
  "                break",
  "            output += chunk",
  "            if not sent and b'Enter a comma-separated list or none:' in output:",
  "                os.write(master, b'\\n')",
  "                sent = True",
  "        if p.poll() is not None and not ready:",
  "            break",
  "    sys.stdout.write(output.decode())",
  "    if not sent:",
  "        sys.exit(3)",
  "    sys.exit(p.wait(timeout=2))",
  "finally:",
  "    if p.poll() is None:",
  "        p.kill()",
  "        p.wait()",
  "    os.close(master)",
].join("\n");

test("the terminal question selects installed hosts by default", () => {
  withHome((home) => {
    const env = hosts(home, { claude: true });
    const result = spawnSync("/usr/bin/python3", ["-c", terminalDriver, entry], { env, encoding: "utf8", timeout: 15000 });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Hosts to install or update [claude]");
    expect(mutations(home)).toEqual([["claude", "plugin", "update", "cstack@cstack", "--scope", "user"]]);
    expect(result.stdout).toMatch(/Claude Code\s+yes\s+yes\s+1.0.0\s+9.0.0/);
  });
});

test("Cursor refreshes its marketplace and a shared Claude import updates once", () => {
  withHome((home) => {
    hosts(home, { claude: true, cursorMarket: true });
    mkdirSync(join(home, ".claude/plugins"), { recursive: true });
    writeFileSync(join(home, ".claude/settings.json"), JSON.stringify({ enabledPlugins: { "cstack@cstack": true } }));
    writeFileSync(join(home, ".claude/plugins/installed_plugins.json"), JSON.stringify({ plugins: {
      "cstack@cstack": [{ scope: "user", version: "1.0.0", installPath: join(home, "provider-copy") }],
    } }));
    const result = commandRun(home, ["--yes"]);
    expect(result.status).toBe(0);
    expect(mutations(home)).toEqual([
      ["claude", "plugin", "update", "cstack@cstack", "--scope", "user"],
      ["cursor-agent", "plugin", "marketplace", "update", "cstack"],
    ]);
    expect(result.stdout).toContain("1.0.0 (Claude import)");
    expect(result.stdout).toContain("9.0.0 (Claude import)");
    expect(result.stdout).toContain("Native installation and version are unknown.");
    expect(result.stdout).toContain("Open Cursor Customize");
  });
});

test("missing or malformed npx metadata still allows a provider update and never supplies a local checkout", () => {
  for (const lock of ["missing", "malformed"]) withHome((home) => {
    hosts(home, { claude: true });
    const from = fetchedPackage(home);
    const file = join(home, "npx/cache/package-lock.json");
    if (lock === "missing") rmSync(file);
    else writeFileSync(file, "not JSON");
    const result = commandRun(home, ["--hosts", "intent,claude,codex"], from);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("No GitHub source supplied.");
    expect(result.stdout).toContain("npx --yes github:OWNER/REPO --hosts intent");
    expect(result.stdout).toContain("npx --yes github:OWNER/REPO --hosts codex");
    expect(result.stdout).toMatch(/Claude Code\s+yes\s+yes\s+1.0.0\s+9.0.0/);
    expect(mutations(home)).toEqual([["claude", "plugin", "update", "cstack@cstack", "--scope", "user"]]);
  });
});

test("help reads no host and an inspection failure still lets another provider update", () => {
  withHome((home) => {
    hosts(home, { claude: true, codex: "git", fail: "claude plugin list --json" });
    const help = commandRun(home, ["--help"]);
    expect(help.status).toBe(0);
    expect(help.stdout).toContain("Usage: cstack-intent [options]");
    expect(help.stdout).toContain("--report-only");
    expect(existsSync(join(home, "commands.jsonl"))).toBe(false);
    const run = commandRun(home, ["--yes"]);
    expect(run.status).toBe(1);
    expect(run.stdout).toContain("Could not inspect.");
    expect(run.stdout).toMatch(/Codex\s+yes\s+yes\s+2.0.0\s+9.0.0/);
    expect(mutations(home)).toEqual([
      ["codex", "plugin", "marketplace", "upgrade", "cstack"],
      ["codex", "plugin", "add", "cstack@cstack"],
    ]);
  });
});

test("one local Codex copy without a source does not hold back its Git copy", () => {
  withHome((home) => {
    hosts(home, { codex: "local" });
    const path = join(home, "state.json");
    const state = JSON.parse(readFileSync(path, "utf8"));
    state.codex.push({ name: "cstack", pluginId: "cstack@remote", marketplaceName: "remote", version: "3.0.0", marketplaceSource: { sourceType: "git", source: "https://github.com/example/toolkit.git" } });
    writeFileSync(path, JSON.stringify(state));
    const result = commandRun(home, ["--yes"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("move cstack@cstack from its local folder to GitHub");
    expect(result.stdout).toContain("2.0.0, 3.0.0");
    expect(mutations(home)).toEqual([
      ["codex", "plugin", "marketplace", "upgrade", "remote"],
      ["codex", "plugin", "add", "cstack@remote"],
    ]);
  });
});
