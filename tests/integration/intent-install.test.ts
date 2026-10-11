import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, linkSync, cpSync, lstatSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, readlinkSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const script = join(root, "hooks/intent-deliver.sh");

test.each(["live copy", "missing copy"])("delivery preserves an unrecorded sibling backup with %s", (state) => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const shell = join(dirname(from), "intent-deliver.sh");
    if (state === "live copy") expect(install(home, shell).status).toBe(0);
    const staging = join(home, ".local/share/.cstack-install-personal-backup");
    const previous = join(staging, "previous");
    copyPlugin(previous);
    writeFileSync(join(previous, "personal-notes.txt"), "My saved notes.\n");
    const before = homeSnapshot(staging);
    const result = install(home, shell);
    expect(result.status).toBe(0);
    expect(homeSnapshot(staging)).toEqual(before);
    expect(readFileSync(join(previous, "personal-notes.txt"), "utf8")).toBe("My saved notes.\n");
    expect(readFileSync(join(home, ".local/share/cstack/skills/how/SKILL.md"), "utf8")).toBe(readFileSync(join(dirname(dirname(from)), "skills/how/SKILL.md"), "utf8"));
  });
});

test("delivery ignores a planted swap journal that names a personal folder", () => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const parent = join(home, ".local/share");
    const staging = join(parent, ".cstack-install-personal");
    mkdirSync(join(staging, "copy"), { recursive: true });
    writeFileSync(join(staging, "copy/notes.txt"), "Private notes.\n");
    const journal = join(parent, ".cstack-swap.json");
    const content = JSON.stringify({ schemaVersion: 1, name: "cstack", data: join(parent, "cstack"), staging });
    writeFileSync(journal, content);
    const before = homeSnapshot(staging);
    const result = install(home, join(dirname(from), "intent-deliver.sh"));
    expect(result.status).toBe(0);
    expect(homeSnapshot(staging)).toEqual(before);
    expect(readFileSync(journal, "utf8")).toBe(content);
    expect(readFileSync(join(staging, "copy/notes.txt"), "utf8")).toBe("Private notes.\n");
  });
});

test("a sibling backup cannot supply ownership for an unrecorded host file", () => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const shell = join(dirname(from), "intent-deliver.sh");
    expect(install(home, shell).status).toBe(0);
    const parent = join(home, ".local/share");
    rmSync(join(parent, "cstack-install-record.json"));
    const staging = join(parent, ".cstack-install-backup");
    const previous = join(staging, "previous");
    mkdirSync(join(previous, "tools"), { recursive: true });
    cpSync(join(root, "tools/metadata.json"), join(previous, "tools/metadata.json"));
    const personal = join(home, ".intent/skills/personal-notes");
    writeFileSync(personal, "Personal host contents.\n", { mode: 0o644 });
    writeFileSync(join(previous, "install-record.json"), JSON.stringify({ schemaVersion: 1, modeRule: { location: "Intent's Settings, under Agent Behavior", status: "unchanged" }, entries: [{ path: personal, kind: "file", sha256: new Bun.CryptoHasher("sha256").update("Personal host contents.\n").digest("hex"), mode: 0o644 }] }));
    const before = homeSnapshot(staging);
    expect(install(home, shell).status).toBe(0);
    expect(readFileSync(personal, "utf8")).toBe("Personal host contents.\n");
    expect(homeSnapshot(staging)).toEqual(before);
    expect(installRecord(home).entries.some((entry: { path: string }) => entry.path === personal)).toBe(false);
  });
});

test("an unreadable record leaves a dropped skill link and reports its missing target on later runs", () => {
  withHome((home) => {
    const from = fetchedPackage(home);
    expect(commandRun(home, ["--hosts", "intent"], from).status).toBe(0);
    writeFileSync(join(home, ".local/share/cstack-install-record.json"), "broken json");
    rmSync(join(dirname(dirname(from)), "skills/how"), { recursive: true });
    const link = join(home, ".intent/skills/how");
    for (let run = 0; run < 2; run++) {
      const result = commandRun(home, ["--hosts", "intent"], from);
      expect(result.status).toBe(0);
      expect(readlinkSync(link)).toBe(join(home, ".local/share/cstack/skills/how"));
      expect(existsSync(link)).toBe(false);
      const row = result.stdout.split("\n").find((line) => line.startsWith("Intent ")) ?? "";
      expect(row).toContain(`kept ${link}: its link target is gone`);
      expect(row).not.toContain("left your own how");
    }
  });
});

function withHome(run: (home: string) => void): void {
  const home = realpathSync(mkdtempSync(join(tmpdir(), "intent home ")));
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
    expect(rerun.stdout).toContain("Left the cstack-mode rule unchanged in Intent's Settings");
  });
});

test("a missing record preserves unrecorded retired links and the person's own entries", () => {
  withHome((home) => {
    const skills = join(home, ".intent/skills");
    mkdirSync(join(skills, "align"), { recursive: true });
    symlinkSync(join(root, "skills/retired"), join(skills, "retired"));
    symlinkSync(join(root, "skills/principle-laziness-protocol"), join(skills, "principle-laziness-protocol"));
    mkdirSync(join(home, "elsewhere/how"), { recursive: true });
    symlinkSync(join(home, "elsewhere/how"), join(skills, "how"));

    const result = install(home);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Installation record missing. No host entries were removed.");
    expect(readlinkSync(join(skills, "principle-laziness-protocol"))).toBe(join(root, "skills/principle-laziness-protocol"));
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("left your own align as it is\n");
    expect(result.stdout).toContain("left your own how as it is\n");

    const linked = readdirSync(skills);
    expect(linked).toContain("retired");
    expect(linked).toContain("principle-laziness-protocol");
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
  if (!existsSync(join(bin, "cstack-intent"))) symlinkSync("../cstack/hooks/intent-deliver.sh", join(bin, "cstack-intent"));
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
    expect(result.stdout).toContain(`copied the plugin to ${copy}`);
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
    expect(again.stdout).toContain("Left the cstack-mode rule unchanged in Intent's Settings");

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

    expect(run().stdout).toContain("added the cstack-mode rule in Intent's Settings, under Agent Behavior, at the top of your personal rule text.");
    const update = JSON.parse(readFileSync(join(home, "updates"), "utf8"));
    expect(update).toEqual({
      workspaceId: "global",
      ruleType: "workspace",
      enabled: true,
      content: "Before any other step, read the `cstack-mode` skill's SKILL.md from your skills list and follow it for the rest of the session.",
    });

    expect(run().stdout).toContain("Left the cstack-mode rule unchanged in Intent's Settings");
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
    expect(result.stdout).toContain("left your own cstack-agent.md as it is");
    expect(result.stdout).toContain("Nothing is needed for your own files.");
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
    expect(second.stdout).toContain("left your own cstack-agent.md as it is");
    expect(second.stdout).toContain("Nothing is needed for your own files.");
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

function installRecord(home: string) {
  return JSON.parse(readFileSync(join(home, ".local/share/cstack-install-record.json"), "utf8"));
}

test("delivery records host links and keeps copied files outside the ownership record", () => {
  withHome((home) => {
    const from = fetchedPackage(home);
    expect(commandRun(home, ["--hosts", "intent"], from).status).toBe(0);
    const record = installRecord(home);
    const data = join(home, ".local/share/cstack");
    expect(record.schemaVersion).toBe(1);
    expect(record.entries).toContainEqual({ path: join(home, ".intent/skills/how"), kind: "link", target: join(data, "skills/how") });
    expect(record.entries.every((entry: { path: string }) => !entry.path.startsWith(data + "/"))).toBe(true);
    expect(lstatSync(join(data, "hooks/intent-deliver.sh")).mode & 0o777).toBe(0o755);
    expect(record.modeRule).toEqual({ location: "Intent's Settings, under Agent Behavior", status: "existing" });
    expect(record.entries.some((entry: { path: string }) => entry.path.includes("node_modules") || entry.path.endsWith("install-record.json"))).toBe(false);
  });
});

test("a valid record never claims an unrecorded link even when it points at the plugin", () => {
  withHome((home) => {
    expect(install(home).status).toBe(0);
    const record = installRecord(home);
    const path = join(home, ".intent/skills/how");
    record.entries = record.entries.filter((entry: { path: string }) => entry.path !== path);
    writeFileSync(join(home, ".local/share/cstack-install-record.json"), JSON.stringify(record));
    const result = install(home);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("left your own how as it is");
    expect(readlinkSync(path)).toBe(join(root, "skills/how"));
    expect(installRecord(home).entries.some((entry: { path: string }) => entry.path === path)).toBe(false);
  });
});

test("the first recorded run adopts exact legacy skill links and keeps unrelated and broken links", () => {
  withHome((home) => {
    const skills = join(home, ".intent/skills");
    mkdirSync(skills, { recursive: true });
    symlinkSync(join(root, "skills/cstack-mode"), join(skills, "cstack-mode"));
    symlinkSync(join(root, "skills/align"), join(skills, "align"));
    const own = join(home, "my how");
    mkdirSync(own);
    symlinkSync(own, join(skills, "how"));
    symlinkSync(join(home, "missing"), join(skills, "why"));
    const first = install(home);
    expect(first.status).toBe(0);
    expect(installRecord(home).entries).toContainEqual({ path: join(skills, "align"), kind: "link", target: join(root, "skills/align") });
    expect(first.stdout).toContain("left your own how as it is");
    expect(first.stdout).toContain(`kept ${join(skills, "why")}: its link target is gone`);
    expect(readlinkSync(join(skills, "how"))).toBe(own);
    expect(readlinkSync(join(skills, "why"))).toBe(join(home, "missing"));
    expect(install(home).status).toBe(0);
    expect(readlinkSync(join(skills, "why"))).toBe(join(home, "missing"));
  });
});

test("updates replace the whole copy and remove recorded retired host links while preserving personal host files", () => {
  withHome((home) => {
    const cache = join(home, "npx/first");
    const plugin = join(cache, "node_modules/cstack");
    copyPlugin(plugin);
    expect(npxInstall(home, cache).status).toBe(0);
    const data = join(home, ".local/share/cstack");
    const own = join(home, ".intent/skills/personal.txt");
    writeFileSync(own, "My notes.\n");
    writeFileSync(join(data, "skills/how/SKILL.md"), "My edited skill.\n");
    rmSync(join(plugin, "skills/how"), { recursive: true });
    rmSync(join(plugin, "skills/why"), { recursive: true });
    const hidden = join(plugin, "skills/align/SKILL.md");
    writeFileSync(hidden, readFileSync(hidden, "utf8").replace("---\n", "---\ndisable-model-invocation: true\n"));
    const result = npxInstall(home, cache);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`removed ${join(home, ".intent/skills/how")}`);
    expect(result.stdout).toContain(`removed ${join(home, ".intent/skills/why")}`);
    expect(result.stdout).toContain(`removed ${join(home, ".intent/skills/align")}`);
    expect(existsSync(join(home, ".intent/skills/how"))).toBe(false);
    expect(existsSync(join(data, "skills/why/SKILL.md"))).toBe(false);
    expect(existsSync(join(data, "skills/how/SKILL.md"))).toBe(false);
    expect(readFileSync(own, "utf8")).toBe("My notes.\n");
    expect(result.stdout).not.toContain("left your own SKILL.md as it is");
    expect(installRecord(home).entries.some((entry: { path: string }) => entry.path === join(data, "skills/how/SKILL.md"))).toBe(false);
  });
});

test("a changed recorded link and a personal file replacing a recorded link survive every update", () => {
  withHome((home) => {
    expect(install(home).status).toBe(0);
    const skills = join(home, ".intent/skills");
    rmSync(join(skills, "how"));
    symlinkSync(join(home, "my missing how"), join(skills, "how"));
    rmSync(join(skills, "why"));
    writeFileSync(join(skills, "why"), "My own file.\n");
    for (let index = 0; index < 2; index++) {
      const result = install(home);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain(`kept ${join(skills, "how")}: its link target is gone`);
      expect(result.stdout).toContain("left your own why as it is");
      expect(readlinkSync(join(skills, "how"))).toBe(join(home, "my missing how"));
      expect(readFileSync(join(skills, "why"), "utf8")).toBe("My own file.\n");
    }
  });
});

test.each(["missing", "unreadable", "unreadable permissions", "outside path"])("a %s record removes no unproven host entries from an earlier install", (state) => {
  withHome((home) => {
    const cache = join(home, "npx/first");
    const plugin = join(cache, "node_modules/cstack");
    copyPlugin(plugin);
    expect(npxInstall(home, cache).status).toBe(0);
    const path = join(home, ".local/share/cstack-install-record.json");
    const protectedFile = join(home, "keep.txt");
    writeFileSync(protectedFile, "Keep me.\n");
    if (state === "missing") rmSync(path);
    else if (state === "unreadable") writeFileSync(path, "broken json");
    else if (state === "unreadable permissions") chmodSync(path, 0o000);
    else {
      const record = installRecord(home);
      record.entries.push({ path: protectedFile, kind: "file", sha256: new Bun.CryptoHasher("sha256").update("Keep me.\n").digest("hex"), mode: 0o644 });
      writeFileSync(path, JSON.stringify(record));
    }
    rmSync(join(plugin, "skills/how"), { recursive: true });
    const result = npxInstall(home, cache);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`Installation record ${state === "missing" ? "missing" : "unreadable"}. No host entries were removed.`);
    expect(readlinkSync(join(home, ".intent/skills/how"))).toBe(join(home, ".local/share/cstack/skills/how"));
    expect(existsSync(join(home, ".local/share/cstack/skills/how/SKILL.md"))).toBe(false);
    expect(readFileSync(protectedFile, "utf8")).toBe("Keep me.\n");
    expect(result.stdout).not.toContain("removed ");
  });
});

test("delivery replaces a directory link inside the copy without writing through its personal target", () => {
  withHome((home) => {
    const cache = join(home, "npx/first");
    copyPlugin(join(cache, "node_modules/cstack"));
    expect(npxInstall(home, cache).status).toBe(0);
    const data = join(home, ".local/share/cstack");
    const own = join(home, "own how");
    mkdirSync(own);
    writeFileSync(join(own, "SKILL.md"), "My skill.\n");
    rmSync(join(data, "skills/how"), { recursive: true });
    symlinkSync(own, join(data, "skills/how"));
    const result = npxInstall(home, cache);
    expect(result.status).toBe(0);
    expect(readFileSync(join(own, "SKILL.md"), "utf8")).toBe("My skill.\n");
    expect(lstatSync(join(data, "skills/how")).isDirectory()).toBe(true);
    expect(readFileSync(join(data, "skills/how/SKILL.md"), "utf8")).toBe(readFileSync(join(root, "skills/how/SKILL.md"), "utf8"));
  });
});

test.each(["shell", "node"])("direct %s delivery honors report-only without creating files or writing a rule", (route) => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const binary = route === "shell" ? "sh" : join(home, "bin/node");
    const target = join(dirname(from), route === "shell" ? "intent-deliver.sh" : "intent-deliver.mjs");
    const result = spawnSync(binary, [target, "--report-only"], { env: { HOME: home, PATH: join(home, "bin") }, encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Report only. No install, update, move, delivery, or rule write was run.");
    expect(result.stdout).toContain("Installation record");
    expect(existsSync(join(home, ".intent"))).toBe(false);
    expect(existsSync(join(home, ".local"))).toBe(false);
    expect(install(home, join(dirname(from), "intent-deliver.sh")).status).toBe(0);
    expect(readlinkSync(join(home, ".intent/skills/how"))).toBe(join(home, ".local/share/cstack/skills/how"));
  });
});

test("the final table identifies the first rule's position and updates leave personal rule edits alone", () => {
  withHome((home) => {
    const from = fetchedPackage(home);
    writeFileSync(join(home, "bin/intentd"), `#!/bin/sh
case "$2" in
rules.get) printf '{"enabled":true,"content":"My other rule."}' ;;
rules.update) printf '%s\\n' "$4" > "${join(home, "rule-update")}"; printf '{}' ;;
esac
`, { mode: 0o755 });
    const result = commandRun(home, ["--hosts", "intent"], from);
    expect(result.status).toBe(0);
    const row = result.stdout.split("\n").find((line) => /^Intent\s/.test(line));
    expect(row).toContain("added the cstack-mode rule in Intent's Settings, under Agent Behavior, at the top of your personal rule text");
    expect(JSON.parse(readFileSync(join(home, "rule-update"), "utf8")).content).toEndWith("\n\nMy other rule.");
    expect(installRecord(home).modeRule.status).toBe("added");
    writeFileSync(join(home, "rule-update"), "My replacement rule.");
    const again = commandRun(home, ["--hosts", "intent"], from);
    expect(again.status).toBe(0);
    expect(again.stdout).toContain("Already current");
    expect(again.stdout).toContain("Left the cstack-mode rule unchanged in Intent's Settings, under Agent Behavior");
    expect(readFileSync(join(home, "rule-update"), "utf8")).toBe("My replacement rule.");
  });
});

test("the record follows XDG_DATA_HOME and leaves no default data folder", () => {
  withHome((home) => {
    const data = join(home, "custom data");
    const result = spawnSync("sh", [script], { env: { HOME: home, PATH: join(home, "bin"), XDG_DATA_HOME: data }, encoding: "utf8" });
    expect(result.status).toBe(0);
    const record = JSON.parse(readFileSync(join(data, "cstack-install-record.json"), "utf8"));
    expect(record.entries).toContainEqual({ path: join(home, ".intent/skills/how"), kind: "link", target: join(root, "skills/how") });
    expect(existsSync(join(home, ".local/share/cstack"))).toBe(false);
    expect(readlinkSync(join(home, ".intent/skills/how"))).toBe(join(root, "skills/how"));
  });
});

test("a copied file can become a link and return to a file when the whole copy is replaced", () => {
  withHome((home) => {
    const cache = join(home, "npx/first");
    const plugin = join(cache, "node_modules/cstack");
    copyPlugin(plugin);
    const sourceFile = join(plugin, "hooks/example.txt");
    writeFileSync(sourceFile, "Original.\n");
    expect(npxInstall(home, cache).status).toBe(0);
    const installed = join(home, ".local/share/cstack/hooks/example.txt");
    expect(readFileSync(installed, "utf8")).toBe("Original.\n");
    rmSync(sourceFile);
    symlinkSync("install.mjs", sourceFile);
    expect(npxInstall(home, cache).status).toBe(0);
    expect(readlinkSync(installed)).toBe("install.mjs");
    rmSync(sourceFile);
    writeFileSync(sourceFile, "Replacement.\n");
    expect(npxInstall(home, cache).status).toBe(0);
    expect(readFileSync(installed, "utf8")).toBe("Replacement.\n");
  });
});

test("a legacy link to a prior checkout is recorded before its target can be replaced", () => {
  withHome((home) => {
    const old = join(home, "old checkout");
    const next = join(home, "next checkout");
    copyPlugin(old);
    copyPlugin(next);
    mkdirSync(join(next, ".git"));
    const skills = join(home, ".intent/skills");
    mkdirSync(skills, { recursive: true });
    symlinkSync(join(old, "skills/cstack-mode"), join(skills, "cstack-mode"));
    symlinkSync(join(old, "skills/how"), join(skills, "how"));
    const from = join(next, "hooks/intent-deliver.sh");
    const first = install(home, from);
    expect(first.status).toBe(0);
    expect(first.stdout).toContain("Recorded the earlier how link. Run the installer again to update its target.");
    expect(first.stdout).not.toContain("left your own how");
    expect(readlinkSync(join(skills, "how"))).toBe(join(old, "skills/how"));
    expect(installRecord(home).entries).toContainEqual({ path: join(skills, "how"), kind: "link", target: join(old, "skills/how") });
    expect(install(home, from).status).toBe(0);
    expect(readlinkSync(join(skills, "how"))).toBe(join(next, "skills/how"));
  });
});

test("copy updates preserve hard-linked personal backups and the previous record", () => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const plugin = dirname(dirname(from));
    const sourceFile = join(plugin, "hooks/example.txt");
    writeFileSync(sourceFile, "Original.\n", { mode: 0o644 });
    expect(commandRun(home, ["--hosts", "intent"], from).status).toBe(0);
    const data = join(home, ".local/share/cstack");
    const installed = join(data, "hooks/example.txt");
    const backup = join(home, "personal-backup.txt");
    const recordBackup = join(home, "record-backup.json");
    const recordPath = join(dirname(data), "cstack-install-record.json");
    const recordBefore = readFileSync(recordPath, "utf8");
    linkSync(installed, backup);
    linkSync(recordPath, recordBackup);
    writeFileSync(sourceFile, "Replacement.\n");
    chmodSync(sourceFile, 0o600);
    expect(commandRun(home, ["--hosts", "intent"], from).status).toBe(0);
    expect(readFileSync(installed, "utf8")).toBe("Replacement.\n");
    expect(lstatSync(installed).mode & 0o777).toBe(0o600);
    expect(readFileSync(backup, "utf8")).toBe("Original.\n");
    expect(lstatSync(backup).mode & 0o777).toBe(0o644);
    expect(readFileSync(recordBackup, "utf8")).toBe(recordBefore);
    expect(installRecord(home).schemaVersion).toBe(1);
  });
});

function packageContents(base: string): string[] {
  const result: string[] = [];
  const visit = (path: string) => {
    const full = join(base, path);
    const stat = lstatSync(full);
    if (stat.isDirectory()) {
      for (const child of readdirSync(full).sort()) if (child !== "node_modules") visit(join(path, child));
    } else if (stat.isSymbolicLink()) result.push(JSON.stringify([path, "link", readlinkSync(full)]));
    else result.push(JSON.stringify([path, "file", stat.mode & 0o777, readFileSync(full).toString("base64")]));
  };
  for (const path of ["agents", "hooks", "skills", "tools/metadata.json", "LICENSE"]) if (existsSync(join(base, path))) visit(path);
  return result;
}

function homeSnapshot(base: string): string[] {
  const rows: string[] = [];
  const visit = (path: string) => {
    const full = join(base, path);
    const stat = lstatSync(full);
    if (stat.isSymbolicLink()) rows.push(JSON.stringify([path, "link", readlinkSync(full)]));
    else if (stat.isDirectory()) {
      rows.push(JSON.stringify([path, "directory"]));
      for (const child of readdirSync(full).sort()) visit(join(path, child));
    } else rows.push(JSON.stringify([path, "file", stat.mode & 0o777, readFileSync(full).toString("base64")]));
  };
  for (const child of readdirSync(base).sort()) visit(child);
  return rows;
}

test.each(["empty object", "wrong name", "directory", "linked metadata", "valid record without metadata", "malformed", "null", "linked tools"])("copy identity refusal preserves unrelated folders with %s", (kind) => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const data = join(home, ".local/share/cstack");
    mkdirSync(join(data, "tools"), { recursive: true });
    writeFileSync(join(data, "personal.txt"), "My personal file.\n");
    const metadata = join(data, "tools/metadata.json");
    if (kind === "empty object") writeFileSync(metadata, "{}");
    else if (kind === "wrong name") writeFileSync(metadata, '{"name":"other-plugin"}');
    else if (kind === "directory") mkdirSync(metadata);
    else if (kind === "linked metadata") symlinkSync(join(root, "tools/metadata.json"), metadata);
    else if (kind === "malformed") writeFileSync(metadata, "broken json");
    else if (kind === "null") writeFileSync(metadata, "null");
    else if (kind === "linked tools") {
      rmSync(join(data, "tools"), { recursive: true });
      symlinkSync(join(root, "tools"), join(data, "tools"));
    } else {
      const owned = join(home, ".intent/skills/how");
      mkdirSync(dirname(owned), { recursive: true });
      symlinkSync(join(data, "skills/how"), owned);
      writeFileSync(join(data, "install-record.json"), JSON.stringify({ schemaVersion: 1, entries: [{ path: owned, kind: "link", target: join(data, "skills/how") }], modeRule: { location: "Intent's Settings, under Agent Behavior", status: "unchanged" } }));
    }
    const before = homeSnapshot(home);
    const result = install(home, join(dirname(from), "intent-deliver.sh"));
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("it is not a copy of this plugin");
    expect(readFileSync(join(data, "personal.txt"), "utf8")).toBe("My personal file.\n");
    expect(homeSnapshot(home)).toEqual(before);
  });
});

test.each(["home", "ancestor", "linked parent", "intent skills", "intent specialists", "codex folder", "codex skills", "claude cache", "record target"])("copy path refusal preserves protected folders at %s", (kind) => {
  withHome((outer) => {
    const from = fetchedPackage(outer);
    let home = join(outer, "home");
    let data = join(outer, "data/cstack");
    let xdg = dirname(data);
    if (kind === "home" || kind === "linked parent") {
      home = join(outer, "cstack");
      data = home;
      xdg = outer;
    } else if (kind === "ancestor") {
      data = join(outer, "cstack");
      home = join(data, "nested/home");
      xdg = outer;
    }
    mkdirSync(home, { recursive: true });
    copyPlugin(data);
    if (kind === "linked parent") {
      xdg = join(outer, "data alias");
      symlinkSync(outer, xdg);
    }
    const host = join(home, ".intent/skills");
    mkdirSync(host, { recursive: true });
    writeFileSync(join(home, "personal.txt"), "My home data.\n");
    writeFileSync(join(host, "personal"), "My host entry.\n");
    if (kind === "intent skills" || kind === "intent specialists") {
      const redirected = kind === "intent skills" ? host : join(home, ".intent/specialists");
      rmSync(redirected, { recursive: true, force: true });
      mkdirSync(join(data, "host"));
      writeFileSync(join(data, "host/personal"), "My redirected host entry.\n");
      symlinkSync(join(data, "host"), redirected);
    } else if (["codex folder", "codex skills", "claude cache"].includes(kind)) {
      mkdirSync(join(data, "host"));
      writeFileSync(join(data, "host/personal"), "My redirected host entry.\n");
      const hostPath = join(home, kind === "codex folder" ? ".codex" : kind === "codex skills" ? ".codex/skills" : ".claude/plugins/cache");
      mkdirSync(dirname(hostPath), { recursive: true });
      symlinkSync(join(data, "host"), hostPath);
    } else if (kind === "record target") {
      writeFileSync(join(data, "personal-record.json"), "My personal record.\n");
      symlinkSync(join(data, "personal-record.json"), join(dirname(data), "cstack-install-record.json"));
    }
    const before = homeSnapshot(outer);
    const result = spawnSync("sh", [join(dirname(from), "intent-deliver.sh")], { env: { HOME: home, PATH: join(outer, "bin"), XDG_DATA_HOME: xdg }, encoding: "utf8" });
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("protected");
    expect(homeSnapshot(outer)).toEqual(before);
  });
});

test.each(["after staging creation", "before old rename", "after old rename", "after new rename", "before old cleanup", "after old cleanup"])("an interrupted swap installs afresh and preserves every leftover %s", (phase) => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const shell = join(dirname(from), "intent-deliver.sh");
    const plugin = dirname(dirname(from));
    const retired = join(plugin, "skills/retired-review");
    mkdirSync(retired);
    writeFileSync(join(retired, "SKILL.md"), "---\nname: retired-review\n---\nRetired skill.\n");
    expect(install(home, shell).status).toBe(0);
    const data = join(home, ".local/share/cstack");
    const parent = dirname(data);
    const recordPath = join(parent, "cstack-install-record.json");
    const recordBefore = readFileSync(recordPath, "utf8");
    const link = join(home, ".intent/skills/retired-review");
    expect(readlinkSync(link)).toBe(join(data, "skills/retired-review"));
    const personal = join(parent, ".cstack-install-personal-backup");
    copyPlugin(join(personal, "previous"));
    writeFileSync(join(personal, "previous/notes.txt"), "Keep my backup.\n");
    rmSync(retired, { recursive: true });
    const nextSkill = "---\nname: how\n---\nReplacement release.\n";
    writeFileSync(join(plugin, "skills/how/SKILL.md"), nextSkill);
    const preload = join(home, "crash.cjs");
    writeFileSync(preload, `const fs = require('node:fs');
const path = require('node:path');
const phase = ${JSON.stringify(phase)};
const data = ${JSON.stringify(data)};
const temporary = fs.mkdtempSync;
fs.mkdtempSync = function(a) {
  const result = temporary.apply(this, arguments);
  if (phase === 'after staging creation' && path.basename(a).startsWith('.cstack-install-')) process.kill(process.pid, 'SIGKILL');
  return result;
};
const rename = fs.renameSync;
fs.renameSync = function(a, b) {
  if (phase === 'before old rename' && a === data && path.basename(b) === 'previous') process.kill(process.pid, 'SIGKILL');
  const result = rename.apply(this, arguments);
  if (phase === 'after old rename' && a === data && path.basename(b) === 'previous' || phase === 'after new rename' && b === data && path.basename(a) === 'copy') process.kill(process.pid, 'SIGKILL');
  return result;
};
const remove = fs.rmSync;
fs.rmSync = function(a) {
  if (phase === 'before old cleanup' && path.basename(a).startsWith('.cstack-install-')) process.kill(process.pid, 'SIGKILL');
  const result = remove.apply(this, arguments);
  if (phase === 'after old cleanup' && path.basename(a).startsWith('.cstack-install-')) process.kill(process.pid, 'SIGKILL');
  return result;
};
require('node:module').syncBuiltinESMExports();`);
    const crash = spawnSync("sh", [shell], { env: { HOME: home, PATH: join(home, "bin"), NODE_OPTIONS: "--require " + JSON.stringify(preload) }, encoding: "utf8" });
    expect(crash.signal).toBe("SIGKILL");
    expect(readFileSync(recordPath, "utf8")).toBe(recordBefore);
    const leftovers = readdirSync(parent).filter((entry) => entry.startsWith(".cstack-install-")).sort();
    const snapshots = leftovers.map((entry) => homeSnapshot(join(parent, entry)));
    for (let run = 0; run < 2; run++) {
      const retry = install(home, shell);
      expect(retry.status).toBe(0);
      expect(readFileSync(join(data, "skills/how/SKILL.md"), "utf8")).toBe(nextSkill);
      expect(packageContents(data)).toEqual(packageContents(plugin));
      expect(readdirSync(join(home, ".intent/skills"))).not.toContain("retired-review");
      const record = JSON.parse(readFileSync(recordPath, "utf8"));
      expect(record.entries).toContainEqual({ path: join(home, ".intent/skills/how"), kind: "link", target: join(data, "skills/how") });
      expect(readdirSync(parent).filter((entry) => entry.startsWith(".cstack-install-")).sort()).toEqual(leftovers);
      expect(leftovers.map((entry) => homeSnapshot(join(parent, entry)))).toEqual(snapshots);
      expect(readFileSync(join(personal, "previous/notes.txt"), "utf8")).toBe("Keep my backup.\n");
    }
  });
});

function beforeRecordInstall(home: string) {
  const from = fetchedPackage(home);
  const plugin = dirname(dirname(from));
  cpSync(join(root, "tests/fixtures/intent-deliver-before-record.sh"), join(plugin, "hooks/intent-deliver.sh"));
  writeFileSync(join(plugin, "skills/how/SKILL.md"), "---\nname: how\n---\nOlder release.\n");
  expect(install(home, join(plugin, "hooks/intent-deliver.sh")).status).toBe(0);
  return from;
}

test.each(["missing", "unreadable", "empty"])("a pre-record package upgrade with a %s record replaces the whole copy and protects host files", (state) => {
  withHome((home) => {
    const from = beforeRecordInstall(home);
    const plugin = dirname(dirname(from));
    const data = join(home, ".local/share/cstack");
    const own = join(home, ".intent/skills/why");
    rmSync(own);
    writeFileSync(own, "My own host skill.\n");
    if (state === "unreadable") writeFileSync(join(data, "install-record.json"), "broken json");
    if (state === "empty") writeFileSync(join(data, "install-record.json"), JSON.stringify({ schemaVersion: 1, entries: [], modeRule: { location: "Intent's Settings, under Agent Behavior", status: "unchanged" } }));
    writeFileSync(join(data, "hooks/retired.txt"), "Earlier release.\n");
    copyPlugin(plugin);
    const nextSkill = "---\nname: how\n---\nNew release.\n";
    writeFileSync(join(plugin, "skills/how/SKILL.md"), nextSkill);
    const result = commandRun(home, ["--hosts", "intent"], from);
    expect(result.status).toBe(0);
    expect(readFileSync(join(data, "skills/how/SKILL.md"), "utf8")).toBe(nextSkill);
    expect(packageContents(data)).toEqual(packageContents(plugin));
    expect(readFileSync(join(data, "hooks/intent-deliver.sh"), "utf8")).toBe(readFileSync(join(root, "hooks/intent-deliver.sh"), "utf8"));
    expect(existsSync(join(data, "hooks/retired.txt"))).toBe(false);
    expect(readFileSync(own, "utf8")).toBe("My own host skill.\n");
    expect(installRecord(home).entries).toContainEqual({ path: join(home, ".intent/skills/how"), kind: "link", target: join(data, "skills/how") });
    expect(installRecord(home).entries.every((entry: { path: string }) => !entry.path.startsWith(data + "/"))).toBe(true);
    expect(result.stdout).not.toContain("left your own SKILL.md");
    expect(commandRun(home, ["--hosts", "intent"], from).status).toBe(0);
    writeFileSync(join(plugin, "skills/how/SKILL.md"), "---\nname: how\n---\nLater release.\n");
    expect(commandRun(home, ["--hosts", "intent"], from).status).toBe(0);
    expect(readFileSync(join(data, "skills/how/SKILL.md"), "utf8")).toBe("---\nname: how\n---\nLater release.\n");
    expect(readFileSync(own, "utf8")).toBe("My own host skill.\n");
  });
});

test("delivery refuses a data-folder link without touching its personal target", () => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const personal = join(home, "personal folder");
    copyPlugin(personal);
    writeFileSync(join(personal, "notes.txt"), "My notes.\n");
    const data = join(home, ".local/share/cstack");
    mkdirSync(dirname(data), { recursive: true });
    symlinkSync(personal, data);
    const result = commandRun(home, ["--hosts", "intent"], from);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("the plugin data folder is a link");
    expect(readlinkSync(data)).toBe(personal);
    expect(readFileSync(join(personal, "notes.txt"), "utf8")).toBe("My notes.\n");
    expect(existsSync(join(personal, "install-record.json"))).toBe(false);
    expect(existsSync(join(home, ".intent/skills"))).toBe(false);
  });
});

test("the final table summarizes many preserved host entries with a count and one example", () => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const skills = join(home, ".intent/skills");
    mkdirSync(skills, { recursive: true });
    for (const skill of ["how", "why", "align"]) writeFileSync(join(skills, skill), "My host skill.\n");
    const result = commandRun(home, ["--hosts", "intent"], from);
    expect(result.status).toBe(0);
    const row = result.stdout.split("\n").find((line) => line.startsWith("Intent ")) ?? "";
    expect(row).toContain("3 personal entries untouched. For example, left your own align as it is");
    expect(row).not.toContain("left your own how");
    expect(row).not.toContain("left your own why");
    for (const skill of ["how", "why", "align"]) expect(readFileSync(join(skills, skill), "utf8")).toBe("My host skill.\n");
  });
});


test.each(["parent link", "dot dot", "home"])("safe custom data location still installs through %s", (kind) => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const target = join(home, "custom");
    mkdirSync(target);
    writeFileSync(join(target, "sibling.txt"), "Keep sibling.\n");
    let xdg = target;
    if (kind === "parent link") {
      xdg = join(home, "alias");
      symlinkSync(target, xdg);
    }
    if (kind === "dot dot") xdg = join(home, "unused") + "/../custom";
    if (kind === "home") xdg = home;
    const result = spawnSync("sh", [join(dirname(from), "intent-deliver.sh")], { env: { HOME: home, PATH: join(home, "bin"), XDG_DATA_HOME: xdg }, encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(readFileSync(join(target, "sibling.txt"), "utf8")).toBe("Keep sibling.\n");
    const parent = kind === "home" ? home : target;
    expect(readFileSync(join(parent, "cstack/tools/metadata.json"), "utf8")).toBe(readFileSync(join(root, "tools/metadata.json"), "utf8"));
    const record = JSON.parse(readFileSync(join(parent, "cstack-install-record.json"), "utf8"));
    expect(record.entries).toContainEqual({ path: join(home, ".intent/skills/how"), kind: "link", target: join(parent, "cstack/skills/how") });
  });
});

test("an internal copy record cannot supply ownership for an unrecorded host file", () => {
  withHome((home) => {
    const from = fetchedPackage(home);
    const shell = join(dirname(from), "intent-deliver.sh");
    expect(install(home, shell).status).toBe(0);
    const data = join(home, ".local/share/cstack");
    const record = installRecord(home);
    const personal = join(home, ".intent/skills/personal-notes");
    writeFileSync(personal, "My host notes.\n", { mode: 0o644 });
    record.entries.push({ path: personal, kind: "file", sha256: new Bun.CryptoHasher("sha256").update("My host notes.\n").digest("hex"), mode: 0o644 });
    writeFileSync(join(data, "install-record.json"), JSON.stringify(record));
    rmSync(join(dirname(data), "cstack-install-record.json"));
    const result = install(home, shell);
    expect(result.status).toBe(0);
    expect(readFileSync(personal, "utf8")).toBe("My host notes.\n");
    expect(installRecord(home).entries.some((entry: { path: string }) => entry.path === personal)).toBe(false);
    expect(existsSync(join(data, "install-record.json"))).toBe(false);
  });
});
