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

test.each(["public", "internal"])("report-only blocks Intent writes through public and internal entry paths (%s)", (route) => {
  withHome((home) => {
    hosts(home);
    const from = fetchedPackage(home);
    writeFileSync(join(home, "bin/intentd"), `#!/bin/sh
case "$2" in
  rules.get) printf '{"enabled":false,"content":""}' ;;
  rules.update) printf '%s\\n' "$4" > "${join(home, "rule-update")}"; printf '{}' ;;
esac
`, { mode: 0o755 });
    const args = route === "internal" ? ["--deliver-intent-source", "github:example/toolkit"] : ["--hosts", "intent"];
    const preview = commandRun(home, ["--report-only", ...args], from);
    expect(preview.status).toBe(route === "internal" ? 2 : 0);
    if (route === "internal") expect(preview.stderr).toContain("Report-only cannot install, update, move, or deliver the plugin.");
    else expect(preview.stdout).toContain("Report only. No install, update, or move was run.");
    expect(existsSync(join(home, ".local/share/cstack"))).toBe(false);
    expect(existsSync(join(home, ".intent/skills"))).toBe(false);
    expect(existsSync(join(home, ".intent/specialists"))).toBe(false);
    expect(existsSync(join(home, "rule-update"))).toBe(false);
    const delivery = commandRun(home, args, from);
    expect(delivery.status).toBe(0);
    expect(readFileSync(join(home, ".intent/skills/cstack-mode/SKILL.md"), "utf8")).toBe(readFileSync(join(root, "skills/cstack-mode/SKILL.md"), "utf8"));
    expect(JSON.parse(readFileSync(join(home, "rule-update"), "utf8"))).toEqual({
      workspaceId: "global",
      ruleType: "workspace",
      enabled: true,
      content: "Before any other step, read the `cstack-mode` skill's SKILL.md from your skills list and follow it for the rest of the session.",
    });
  });
}, 15000);

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
    expect(result.stdout).toMatch(/Retry with .*claude'? plugin update cstack@cstack --scope user\./);
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

test.each(["missing", "malformed", "null", "[]", '{"packages":[]}', '{"packages":{"":{"dependencies":{"cstack":{"url":"github:example/toolkit"}}},"node_modules/cstack":{"resolved":["github:example/toolkit"]}}}'])("unavailable npx source metadata keeps provider updates and no-source actions (%s)", (lock) => {
  withHome((home) => {
    hosts(home, { claude: true });
    const from = fetchedPackage(home);
    const file = join(home, "npx/cache/package-lock.json");
    if (lock === "missing") rmSync(file);
    else writeFileSync(file, lock === "malformed" ? "not JSON" : lock);
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

test.each(["inspection", "update"])("a termination-resistant host times out, cleans up its child, and continues (%s)", (phase) => {
  withHome((home) => {
    hosts(home, { codex: "git" });
    rmSync(join(home, "bin/claude"));
    writeFileSync(join(home, "bin/claude"), [
      "#!/usr/bin/env node",
      "const fs = require('node:fs'); const { spawn } = require('node:child_process');",
      "if (" + JSON.stringify(phase) + " === 'update' && process.argv[3] === 'list') { console.log('[{\"id\":\"cstack@cstack\",\"scope\":\"user\",\"version\":\"1.0.0\"}]'); process.exit(0); }",
      "fs.writeFileSync(process.env.HOME+'/hung-pid', String(process.pid));",
      "const child = spawn(process.execPath, ['-e', \"process.on('SIGTERM', () => {}); setInterval(() => {}, 1000);\"], {stdio:'inherit'});",
      "fs.writeFileSync(process.env.HOME+'/descendant-pid', String(child.pid));",
      "process.on('SIGTERM', () => {});",
      "console.log('waiting for the fixture service');",
      "setInterval(() => {}, 1000);",
    ].join("\n"), { mode: 0o755 });
    try {
      const result = spawnSync("sh", [entry, "--hosts", "claude,codex", "--timeout-ms", "500"], {
        env: { PATH: join(home, "bin"), HOME: home }, encoding: "utf8", timeout: 4000, killSignal: "SIGKILL",
      });
      expect(result.status).toBe(1);
      expect(result.stdout).toContain("timed out");
      expect(result.stdout).toContain("waiting for the fixture service");
      expect(result.stdout).toContain(phase === "inspection" ? "plugin list --json" : "plugin update cstack@cstack --scope user");
      expect(result.stdout).toMatch(phase === "inspection" ? /Retry with .*claude'? plugin list --json\./ : /Retry with .*claude'? plugin update cstack@cstack --scope user\./);
      expect(result.stdout).toMatch(/Codex\s+yes\s+yes\s+2.0.0\s+9.0.0/);
      expect(mutations(home)).toEqual([
        ["codex", "plugin", "marketplace", "upgrade", "cstack"],
        ["codex", "plugin", "add", "cstack@cstack"],
      ]);
      for (const file of ["hung-pid", "descendant-pid"]) {
        const pid = Number(readFileSync(join(home, file), "utf8"));
        let stopped = false;
        try {
          process.kill(pid, 0);
          const stat = `/proc/${pid}/stat`;
          stopped = existsSync(stat) && /^.*\) Z /.test(readFileSync(stat, "utf8"));
        } catch { stopped = true; }
        expect(stopped).toBe(true);
      }
    } finally {
      for (const file of ["hung-pid", "descendant-pid"]) {
        const pidFile = join(home, file);
        if (existsSync(pidFile)) { try { process.kill(Number(readFileSync(pidFile, "utf8")), "SIGKILL"); } catch {} }
      }
    }
  });
});

test("a failing host retains its stdout and stderr in the final table", () => {
  withHome((home) => {
    hosts(home, { codex: "git" });
    rmSync(join(home, "bin/claude"));
    writeFileSync(join(home, "bin/claude"), `#!/bin/sh
if [ "$2" = list ]; then
  printf '[{"id":"cstack@cstack","scope":"user","version":"1.0.0"}]'
else
  echo 'Failure detail on stdout'
  echo 'Failure detail on stderr' >&2
  exit 7
fi
`, { mode: 0o755 });
    const result = commandRun(home, ["--yes"]);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("Failure detail on stdout");
    expect(result.stdout).toContain("Failure detail on stderr");
    expect(result.stdout.indexOf("Failure detail")).toBeGreaterThan(result.stdout.indexOf("Host"));
    expect(result.stdout).toMatch(/Codex\s+yes\s+yes\s+2.0.0\s+9.0.0/);
  });
});

function intentFetch(home: string, lock: "valid" | "missing" | "unchanged") {
  const from = fetchedPackage(home);
  const packageRoot = resolve(from, "../..");
  const metadata = JSON.parse(readFileSync(join(packageRoot, "tools/metadata.json"), "utf8"));
  writeFileSync(join(packageRoot, "tools/metadata.json"), JSON.stringify({ ...metadata, version: "1.5.0" }, null, 2));
  if (lock === "missing") rmSync(join(home, "npx/cache/package-lock.json"));
  if (lock === "unchanged") {
    writeFileSync(join(packageRoot, "hooks/intent-deliver.sh"), "#!/bin/sh\nleft='left your own cstack-agent.md as it is'\nprintf '%s\\n' \"$left\"\n");
  }
  writeFileSync(join(home, "bin/npx"), `#!/bin/sh
printf '%s\\n' "$*" >> "$HOME/fetch-calls"
shift 3
exec sh '${from}' "$@"
`, { mode: 0o755 });
}

test("an explicit Intent source preserves personal files and rule actions in the outer table", () => {
  withHome((home) => {
    hosts(home);
    intentFetch(home, "valid");
    const specialists = join(home, ".intent/specialists");
    mkdirSync(specialists, { recursive: true });
    writeFileSync(join(specialists, "cstack-agent.md"), "My specialist.\n");
    writeFileSync(join(home, "bin/intentd"), `#!/bin/sh\nprintf '{"enabled":false,"content":"a disabled personal rule"}'\n`, { mode: 0o755 });
    const result = commandRun(home, ["--hosts", "intent", "--source", "other/fork"]);
    expect(result.status).toBe(0);
    const intent = result.stdout.split("\n").find((line) => /^Intent\s/.test(line));
    expect(intent).toContain("Updated.");
    expect(intent).toContain("left your own cstack-agent.md as it is");
    expect(intent).toContain("Nothing is needed for your own files.");
    expect(intent).toContain("To keep the mode on, paste this into Intent's Settings");
    expect(intent).toContain("Before any other step");
    expect(readFileSync(join(specialists, "cstack-agent.md"), "utf8")).toBe("My specialist.\n");
    expect(readFileSync(join(home, "fetch-calls"), "utf8").trim().split("\n")).toHaveLength(1);
  });
});

test("an explicit Intent source delivers without another package lockfile", () => {
  withHome((home) => {
    hosts(home);
    intentFetch(home, "missing");
    const result = commandRun(home, ["--hosts", "intent", "--source", "other/fork"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Intent\s+yes\s+yes\s+-\s+1.5.0\s+Updated/);
    expect(readFileSync(join(home, ".intent/skills/cstack-mode/SKILL.md"), "utf8")).toBe(readFileSync(join(root, "skills/cstack-mode/SKILL.md"), "utf8"));
    expect(readFileSync(join(home, "fetch-calls"), "utf8").trim().split("\n")).toHaveLength(1);
  });
});

test("Intent reports unchanged delivery and its preserved files without claiming an update", () => {
  withHome((home) => {
    hosts(home);
    intentFetch(home, "unchanged");
    const result = commandRun(home, ["--hosts", "intent", "--source", "other/fork"]);
    expect(result.status).toBe(0);
    const intent = result.stdout.split("\n").find((line) => /^Intent\s/.test(line));
    expect(intent).toContain("No files changed.");
    expect(intent).not.toContain("Updated.");
    expect(intent).toContain("left your own cstack-agent.md as it is");
    expect(intent).not.toContain("Start a new Intent agent");
  });
});

test.each(["success", "first project fails"])("Claude project copies keep their directories and a shared user copy updates once (%s)", (scenario) => {
  const failFirst = scenario === "first project fails";
  withHome((home) => {
    hosts(home, { cursorMarket: true });
    const projectA = join(home, "project A");
    const projectB = join(home, "project B");
    mkdirSync(projectA);
    mkdirSync(projectB);
    writeFileSync(join(home, "copies.json"), JSON.stringify([
      { id: "cstack@cstack", scope: "project", projectPath: projectA, version: "1.0.0" },
      { id: "cstack@cstack", scope: "project", projectPath: projectB, version: "2.0.0" },
      { id: "cstack@cstack", scope: "user", version: "3.0.0" },
    ]));
    mkdirSync(join(home, ".claude/plugins"), { recursive: true });
    writeFileSync(join(home, ".claude/settings.json"), JSON.stringify({ enabledPlugins: { "cstack@cstack": true } }));
    writeFileSync(join(home, ".claude/plugins/installed_plugins.json"), JSON.stringify({ plugins: {
      "cstack@cstack": [{ scope: "user", version: "3.0.0", installPath: join(home, "provider-copy") }],
    } }));
    rmSync(join(home, "bin/claude"));
    writeFileSync(join(home, "bin/claude"), [
      "#!/usr/bin/env node",
      "const fs = require('node:fs'); const path = require('node:path');",
      "const home = process.env.HOME; const args = process.argv.slice(2);",
      "const file = path.join(home, 'copies.json'); const copies = JSON.parse(fs.readFileSync(file));",
      "if (args[1] === 'list') console.log(JSON.stringify(copies));",
      "else {",
      "  fs.appendFileSync(path.join(home, 'project-calls'), JSON.stringify({args,cwd:process.cwd()})+'\\n');",
      "  const scope = args[args.indexOf('--scope')+1];",
      "  if (" + JSON.stringify(failFirst) + " && scope === 'project' && process.cwd() === " + JSON.stringify(realpathSync(projectA)) + ") { console.log('first project failed'); process.exit(7); }",
      "  for (const copy of copies) if (copy.scope === scope && (scope === 'user' || fs.realpathSync(copy.projectPath) === process.cwd())) copy.version = '9.0.0';",
      "  fs.writeFileSync(file, JSON.stringify(copies));",
      "  if (scope === 'user') { const registry = path.join(home, '.claude/plugins/installed_plugins.json'); const state = JSON.parse(fs.readFileSync(registry)); state.plugins['cstack@cstack'][0].version = '9.0.0'; fs.writeFileSync(registry, JSON.stringify(state)); }",
      "  console.log('updated');",
      "}",
    ].join("\n"), { mode: 0o755 });
    const result = commandRun(home, ["--hosts", "claude,cursor"]);
    expect(result.status).toBe(failFirst ? 1 : 0);
    expect(JSON.parse(readFileSync(join(home, "copies.json"), "utf8"))).toEqual([
      { id: "cstack@cstack", scope: "project", projectPath: projectA, version: failFirst ? "1.0.0" : "9.0.0" },
      { id: "cstack@cstack", scope: "project", projectPath: projectB, version: "9.0.0" },
      { id: "cstack@cstack", scope: "user", version: "9.0.0" },
    ]);
    const calls = readFileSync(join(home, "project-calls"), "utf8").trim().split("\n").map((line) => JSON.parse(line));
    expect(calls).toEqual([
      { args: ["plugin", "update", "cstack@cstack", "--scope", "project"], cwd: realpathSync(projectA) },
      { args: ["plugin", "update", "cstack@cstack", "--scope", "project"], cwd: realpathSync(projectB) },
      { args: ["plugin", "update", "cstack@cstack", "--scope", "user"], cwd: process.cwd() },
    ]);
    expect(result.stdout).toMatch(failFirst ? /Claude Code\s+yes\s+yes\s+1.0.0, 2.0.0, 3.0.0\s+1.0.0, 9.0.0, 9.0.0/ : /Claude Code\s+yes\s+yes\s+1.0.0, 2.0.0, 3.0.0\s+9.0.0, 9.0.0, 9.0.0/);
    if (failFirst) expect(result.stdout).toContain("first project failed");
    expect(result.stdout).toMatch(/Cursor\s+yes\s+yes\s+3.0.0 \(Claude import\)\s+9.0.0 \(Claude import\)/);
  });
});


function sharedImport(home: string) {
  mkdirSync(join(home, ".claude/plugins"), { recursive: true });
  writeFileSync(join(home, ".claude/settings.json"), JSON.stringify({ enabledPlugins: { "cstack@cstack": true } }));
  writeFileSync(join(home, ".claude/plugins/installed_plugins.json"), JSON.stringify({ plugins: {
    "cstack@cstack": [{ scope: "user", version: "1.0.0", installPath: join(home, "provider-copy") }],
  } }));
}

test("a second run reports every unchanged installed host as already current without session steps", () => {
  withHome((home) => {
    hosts(home, { claude: true, codex: "git", cursorMarket: true });
    intentFetch(home, "valid");
    sharedImport(home);
    const specialists = join(home, ".intent/specialists");
    mkdirSync(specialists, { recursive: true });
    writeFileSync(join(specialists, "cstack-agent.md"), "My specialist.\n");
    const args = ["--hosts", "intent,claude,codex,cursor", "--source", "other/fork"];
    const first = commandRun(home, args);
    expect(first.status).toBe(0);
    expect(first.stdout).toMatch(/Intent\s+yes\s+yes\s+-\s+1.5.0\s+Updated/);
    const second = commandRun(home, args);
    expect(second.status).toBe(0);
    for (const [host, version] of [["Intent", "1.5.0"], ["Claude Code", "9.0.0"], ["Codex", "9.0.0"], ["Cursor", "9.0.0 (Claude import)"]]) {
      const row = second.stdout.split("\n").find((line) => line.startsWith(host + " "));
      expect(row).toContain(`Already current at ${version}.`);
      expect(row).not.toMatch(/Updated\.|[Rr]estart|[Ss]tart a new|New sessions|Run setup/);
      if (host === "Cursor") expect(row).toContain("Open Cursor Customize, find cstack, and select Install or update. Native installation and version are unknown.");
      else expect(row).not.toContain("Open Cursor");
    }
    expect(second.stdout).toContain("left your own cstack-agent.md as it is. Nothing is needed for your own files.");
    expect(readFileSync(join(specialists, "cstack-agent.md"), "utf8")).toBe("My specialist.\n");
  });
}, 15000);

test("a Codex source change is updated even when its version stays the same", () => {
  withHome((home) => {
    hosts(home, { codex: "local" });
    const file = join(home, "state.json");
    const state = JSON.parse(readFileSync(file, "utf8"));
    state.codex[0].version = "9.0.0";
    writeFileSync(file, JSON.stringify(state));
    const result = commandRun(home, ["--hosts", "codex", "--source", "other/fork"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Codex\s+yes\s+yes\s+9.0.0\s+9.0.0\s+Updated\./);
    expect(JSON.parse(readFileSync(file, "utf8")).codex[0].marketplaceSource).toEqual({ sourceType: "git", source: "configured" });
    expect(result.stdout).toContain("New sessions use version 9.0.0.");
  });
});

test.each([
  ["claude", "plugin update cstack@cstack --scope user"],
  ["codex", "plugin marketplace upgrade cstack"],
])("a failed installed %s update offers its native retry without a source placeholder", (host, command) => {
  withHome((home) => {
    hosts(home, { claude: true, codex: "git", fail: `${host} ${command}` });
    const result = commandRun(home, ["--yes"]);
    expect(result.status).toBe(1);
    const row = result.stdout.split("\n").find((line) => line.startsWith(host === "claude" ? "Claude Code " : "Codex "));
    expect(row).toContain("fixture failure");
    expect(row).toMatch(new RegExp(`Retry with .*${host}'? ${command}\\.`));
    expect(row).not.toContain("OWNER/REPO");
    expect(row).not.toContain("Retry with npx");
  });
});

test("report-only announces a Codex local-folder move without doing it", () => {
  withHome((home) => {
    hosts(home, { codex: "local" });
    const file = join(home, "state.json");
    const before = readFileSync(file, "utf8");
    const result = commandRun(home, ["--hosts", "codex", "--source", "other/fork", "--report-only"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Would move Codex from its local folder to the GitHub source before updating.");
    expect(result.stdout).toMatch(/Codex\s+yes\s+yes\s+2.0.0\s+2.0.0/);
    expect(mutations(home)).toEqual([]);
    expect(readFileSync(file, "utf8")).toBe(before);
  });
});

test("updated hosts explain which sessions use the new version", () => {
  withHome((home) => {
    hosts(home, { claude: true, codex: "git", cursorMarket: true });
    intentFetch(home, "valid");
    sharedImport(home);
    const result = commandRun(home, ["--hosts", "intent,claude,codex,cursor", "--source", "other/fork"]);
    expect(result.status).toBe(0);
    for (const [host, version] of [["Intent", "1.5.0"], ["Claude Code", "9.0.0"], ["Codex", "9.0.0"], ["Cursor", "9.0.0 (Claude import)"]]) {
      const row = result.stdout.split("\n").find((line) => line.startsWith(host + " "));
      expect(row).toContain(`Updated. New sessions use version ${version}. Sessions already open keep the old version until you start them again.`);
      expect(row).not.toMatch(/[Rr]estart|Start a new/);
    }
  });
});

test("Intent detects changed package files at the same version and an identical repeat is current", () => {
  withHome((home) => {
    hosts(home);
    intentFetch(home, "valid");
    const args = ["--hosts", "intent", "--source", "other/fork"];
    expect(commandRun(home, args).status).toBe(0);
    const changed = "# A changed skill from the fetched branch\n";
    writeFileSync(join(home, "npx/cache/node_modules/cstack/skills/how/SKILL.md"), changed);
    const update = commandRun(home, args);
    expect(update.status).toBe(0);
    expect(readFileSync(join(home, ".intent/skills/how/SKILL.md"), "utf8")).toBe(changed);
    expect(update.stdout).toMatch(/Intent\s+yes\s+yes\s+1.5.0\s+1.5.0\s+Updated\./);
    const repeat = commandRun(home, args);
    expect(repeat.status).toBe(0);
    expect(repeat.stdout).toMatch(/Intent\s+yes\s+yes\s+1.5.0\s+1.5.0\s+Already current at 1.5.0\./);
    expect(repeat.stdout).not.toContain("New sessions");
  });
}, 15000);

test.each([
  ["retained", "plugin marketplace add other/fork"],
  ["dropped", "plugin marketplace add other/fork"],
  ["retained", "plugin add cstack@cstack"],
  ["dropped", "plugin add cstack@cstack"],
])("a failed Codex move gives the remaining recovery steps (plugin %s, fails %s)", (removal, failingCommand) => {
  const dropsPlugin = removal === "dropped";
  withHome((home) => {
    hosts(home, { codex: "local" });
    const host = join(home, "bin/host.mjs");
    const standIn = readFileSync(host, "utf8").replace(
      "else if (args[2] === 'remove') state.markets = [];",
      `else if (args[2] === 'remove') { state.markets = []; ${dropsPlugin ? "state.codex = [];" : ""} }`,
    ).replace(
      "let result = {};",
      "if (host === 'codex' && args.join(' ') === " + JSON.stringify(failingCommand) + " && !state.failedOnce) { state.failedOnce = true; writeFileSync(file,JSON.stringify(state)); console.error('fixture move failed'); process.exit(7); }\nlet result = {};",
    );
    writeFileSync(host, standIn);
    const result = commandRun(home, ["--hosts", "codex", "--source", "other/fork"]);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("fixture move failed");
    const row = result.stdout.split("\n").find((line) => line.startsWith("Codex "));
    const binary = `'${join(home, "bin/codex")}'`;
    const recovery = failingCommand.startsWith("plugin marketplace")
      ? `${binary} plugin marketplace add other/fork && ${binary} plugin add cstack@cstack`
      : `${binary} plugin add cstack@cstack`;
    expect(row).toContain(`Retry with ${recovery}.`);
    const state = JSON.parse(readFileSync(join(home, "state.json"), "utf8"));
    expect(state.codex.length).toBe(dropsPlugin ? 0 : 1);
    expect(state.markets.length).toBe(failingCommand.startsWith("plugin marketplace") ? 0 : 1);
    const retry = row?.split("Retry with ").at(-1)?.replace(/\.\s*$/, "");
    if (!retry) throw new Error("The failed move did not give a retry command.");
    const restored = spawnSync("sh", ["-c", retry], { env: { PATH: join(home, "bin"), HOME: home }, encoding: "utf8" });
    expect(restored.status).toBe(0);
    const after = JSON.parse(readFileSync(join(home, "state.json"), "utf8"));
    expect(after.codex).toEqual([{ name: "cstack", pluginId: "cstack@cstack", marketplaceName: "cstack", version: "9.0.0", marketplaceSource: { sourceType: "git", source: "configured" } }]);
    expect(after.markets).toEqual([{ name: "cstack", marketplaceSource: { sourceType: "git", source: "other/fork" } }]);
  });
});
