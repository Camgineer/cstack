import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";

const root = resolve(import.meta.dir, "../..");

function inTemporaryDirectory(run: (directory: string) => void): void {
  const directory = mkdtempSync(join(tmpdir(), "plugin consumer "));
  try {
    run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("bundled Markdown links point to shipped resources", () => {
  const skills = join(root, "skills");
  const missing: string[] = [];
  for (const relative of readdirSync(skills, { recursive: true, encoding: "utf8" })) {
    if (!relative.endsWith(".md") || relative.split(sep).includes("node_modules")) continue;
    const source = join(skills, relative);
    const prose = readFileSync(source, "utf8").replace(/^(`{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, "");
    for (const match of prose.matchAll(/\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (target === undefined || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#") || target === "url") continue;
      const path = target.split("#")[0];
      if (path && !existsSync(resolve(dirname(source), path))) missing.push(`${relative} -> ${target}`);
    }
  }
  expect(missing).toEqual([]);
});

test("the agent's skill list shows the toolkit and hides user-invoked guides", () => {
  const skills = join(root, "skills");
  const mismatched: string[] = [];
  const taskGuides = new Set(["investigation", "bug-fix", "perf-issue", "hillclimb", "runtime-forensics", "trace-forensics", "feature", "refactoring", "prototype", "visual-parity", "authoring-a-skill", "eval"]);
  for (const directory of readdirSync(skills)) {
    const source = join(skills, directory, "SKILL.md");
    if (!existsSync(source)) continue;
    const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(readFileSync(source, "utf8"))?.[1];
    expect(frontmatter).toBeDefined();
    const fields = Bun.YAML.parse(frontmatter ?? "") as Record<string, unknown>;
    if ((fields["disable-model-invocation"] === true) !== (taskGuides.has(directory))) mismatched.push(directory);
  }
  expect(mismatched).toEqual([]);
});

test("host sync check catches frontmatter drift, stray metadata, and a skill without SKILL.md", () => {
  inTemporaryDirectory((directory) => {
    for (const entry of ["tools", "skills", ".claude-plugin", ".codex-plugin", ".cursor-plugin", ".agents"]) {
      cpSync(join(root, entry), join(directory, entry), { recursive: true, filter: (source) => basename(source) !== "node_modules" });
    }
    const sync = (...args: string[]) =>
      spawnSync(process.execPath, [join(directory, "tools/sync-hosts.ts"), ...args], { encoding: "utf8", timeout: 20_000 });
    expect(sync().status).toBe(0);
    expect(sync("--check").status).toBe(0);

    const skill = join(directory, "skills/how/SKILL.md");
    writeFileSync(skill, readFileSync(skill, "utf8").replace(/^description: .*$/m, "description: Changed for the drift fixture."));
    const drifted = sync("--check");
    expect(drifted.status).toBe(1);
    expect(drifted.stderr).toContain("out of date: skills/how/agents/openai.yaml");
    expect(sync().status).toBe(0);

    mkdirSync(join(directory, "skills/retired/agents"), { recursive: true });
    writeFileSync(join(directory, "skills/retired/agents/openai.yaml"), "interface: {}\n");
    const stray = sync("--check");
    expect(stray.status).toBe(1);
    expect(stray.stderr).toContain("stale: skills/retired/agents/openai.yaml");
    expect(sync().status).toBe(0);
    expect(sync("--check").status).toBe(0);

    writeFileSync(join(directory, "skills/retired/README.md"), "Notes left behind.\n");
    const missing = sync("--check");
    expect(missing.status).not.toBe(0);
    expect(missing.stderr).toContain("skills/retired has no SKILL.md");
  });
});

test("the Cursor marketplace lists one plugin at the repository root", () => {
  const metadata = JSON.parse(readFileSync(join(root, "tools/metadata.json"), "utf8"));
  const marketplace = JSON.parse(readFileSync(join(root, ".cursor-plugin/marketplace.json"), "utf8"));
  expect(marketplace.plugins).toEqual([
    expect.objectContaining({ name: metadata.name, source: "./" }),
  ]);
});

test("native manifests expose skills without automatic session behavior", () => {
  for (const host of ["claude", "codex", "cursor"]) {
    const manifest = JSON.parse(readFileSync(join(root, `.${host}-plugin/plugin.json`), "utf8"));
    expect(manifest).not.toHaveProperty("hooks");
    expect(manifest).not.toHaveProperty("agents");
  }
  for (const directory of readdirSync(join(root, "skills"))) {
    const source = readFileSync(join(root, "skills", directory, "SKILL.md"), "utf8");
    const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(source)?.[1];
    const fields = Bun.YAML.parse(frontmatter ?? "") as Record<string, unknown>;
    const metadata = Bun.YAML.parse(readFileSync(join(root, "skills", directory, "agents/openai.yaml"), "utf8"));
    expect(metadata).toMatchObject({ policy: { allow_implicit_invocation: fields["disable-model-invocation"] !== true } });
  }
});
