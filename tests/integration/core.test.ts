import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";

const root = resolve(import.meta.dir, "../..");
const pluginName: string = JSON.parse(readFileSync(join(root, "tools/metadata.json"), "utf8")).name;
const checker = join(root, "skills/poteto-mode/scripts/check-plan.ts");

function inTemporaryDirectory(run: (directory: string) => void): void {
  const directory = mkdtempSync(join(tmpdir(), "plugin consumer "));
  try {
    run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

const plan = `# Invoice export plan

Give billing staff a CSV download of paid invoices. PR10 adds the download and its verification. The maintainer owns the merge.

## How to read this

One box is one unit of work. Each box names the evidence that checks it. Check a box only when its evidence exists.
Run the installed playbooks/autopilot-full.md from the resolved plugin root. The maintainer reviews the download and merges PR10.
Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.

## Program checklist

### Arm the program

- [ ] Program objective. Ship a CSV download that preserves invoice amounts. Complete when PR10 is verified and the maintainer merges it.
- [ ] Continuation. Iterate in this task until the PR is ready for the maintainer.
- [ ] Cadence. Audit each completed verification checkpoint.
- [ ] Resources. Read the installed execution playbook and the consumer project's source separately.
- [ ] Runtime isolation. Give each live lane its own application port and browser profile.
- [ ] Post a status message when the verified head or a blocker changes.

### Spawn owners

- [ ] Assign the invoice export owner to PR10 with an isolated worktree.

### PR mechanics

- [ ] Open PR10 against main and record its verified SHA.

### Verdict and merge

- [ ] Send the evidence to the maintainer and wait for their merge decision.

### Boot recipe

- [ ] Start the fixture application on the lane's assigned port.

## PR10 invoice export

**Depends on.** None. This PR branches from main.

**Files.**
- [ ] Update \`src/goals.ts\` and \`src/invoices/export.ts\`.

**Build.**
- [ ] Add the CSV download using the invoice totals already shown in the billing table.

**You see.**
- [ ] The download contains each paid invoice and its displayed amount.

**Verify, unit.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.
- [ ] Run the amount and CSV escaping tests. Save \`invoice-unit.log\`.

**Verify, live.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked. Ten lanes on \`GPT-6\` at the PR head.
- [ ] Lane 1. Compare the billing amounts on trunk and head. Save \`amounts.png\`. Pass when every exported amount matches the billing table.
- [ ] Lane 2. Download an empty account. Save \`empty.png\`. Pass when the CSV contains only its header.
- [ ] Lane 3. Download one paid invoice. Save \`one.png\`. Pass when its identifier and amount are preserved.
- [ ] Lane 4. Exclude unpaid invoices. Save \`unpaid.png\`. Pass when no unpaid row appears.
- [ ] Lane 5. Export a customer name with a comma. Save \`comma.png\`. Pass when the CSV parses into the expected columns.
- [ ] Lane 6. Export a customer name with quotes. Save \`quotes.png\`. Pass when the CSV preserves the name.
- [ ] Lane 7. Export a refunded invoice. Save \`refund.png\`. Pass when the signed amount matches the billing table.
- [ ] Lane 8. Download a large account. Save \`large.png\`. Pass when every paid invoice appears once.
- [ ] Lane 9. Check the keyboard download action. Save \`keyboard.png\`. Pass when focus reaches the button and Enter downloads the CSV.
- [ ] Lane 10. Check denied billing access. Save \`denied.png\`. Pass when no invoice data is downloaded.

**Verify, perf.** Tests alone are not sufficient verification. A PR is verified only when its unit, live, and perf boxes are all checked.
- [ ] Metric. Measure time from the download click to receipt of a 1000-row CSV.
- [ ] Probe. Alternate five trunk and head billing-table loads and five head downloads. Save \`invoice-perf.json\`.
- [ ] Baseline. Record the trunk billing-table load before running the head probe. Trunk has no download action.
- [ ] Rule. Fail if the head billing-table median exceeds trunk by 10 percent or the head download takes more than 500 ms.

**Review gate.** The maintainer reviews before merge.
- [ ] Give the operator a screenshot and a video of the download. Record the maintainer's decision.

**Merge.**
- [ ] The maintainer merges the reviewed and verified PR head.

## Close the program

- [ ] Confirm the merged export works and save the final SHA.

## Appendix A Prototype evidence

The prototype preserves decimal amounts and CSV quoting. Its commit and recordings are attached to PR10.
Read the installed helper at \`/opt/installed plugin/skills/how/SKILL.md\`.
`;

function runPlan(text: string) {
  const directory = mkdtempSync(join(tmpdir(), "plugin consumer "));
  try {
    const path = join(directory, "reviewable invoice plan.md");
    writeFileSync(path, text);
    return spawnSync(process.execPath, [checker, path], {
      cwd: directory,
      encoding: "utf8",
      timeout: 10_000,
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe("plan validation", () => {
  test("accepts a reviewable plan from a consumer directory with spaces", () => {
    const result = runPlan(plan);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("1 PR sections, 0 problems");
  });

  test("accepts a consumer project's own skills directory", () => {
    const result = runPlan(`${plan}\nSee [swarm](../skills/swarm/SKILL.md) and \`app/skills/billing/rules.md\`.\n`);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  test.each([
    {
      name: "live verification is missing",
      text: plan.replace(/^- \[ \] Lane \d+\..*\n/gm, ""),
      diagnostic: "expected 1 to 10",
    },
    {
      name: "performance has no failure budget",
      text: plan.replace(/^- \[ \] Rule\..*\n/gm, ""),
      diagnostic: "perf boxes",
    },
    {
      name: "runtime isolation is not planned",
      text: plan.replace(/^- \[ \] Runtime isolation\..*\n/gm, ""),
      diagnostic: "Runtime isolation.",
    },
    {
      name: "a host-specific command remains",
      text: `${plan}\nRun \`/goal\`.\n`,
      diagnostic: "unresolved host command or bundled resource path",
    },
    {
      name: "a consumer-relative plugin path remains",
      text: `${plan}\nRead \`./pstack/skills/swarm/SKILL.md\`.\n`,
      diagnostic: "unresolved host command or bundled resource path",
    },
    {
      name: "the plugin's own consumer-relative path remains",
      text: `${plan}\nSee (${pluginName}/skills/review/references/gate.md).\n`,
      diagnostic: "unresolved host command or bundled resource path",
    },
  ])("rejects a plan when $name", ({ text, diagnostic }) => {
    const result = runPlan(text);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(diagnostic);
  });
});

test("bundled Markdown links point to shipped resources", () => {
  const skills = join(root, "skills");
  const missing: string[] = [];
  for (const relative of readdirSync(skills, { recursive: true, encoding: "utf8" })) {
    if (!relative.endsWith(".md") || relative.split(sep).includes("node_modules")) continue;
    const source = join(skills, relative);
    for (const match of readFileSync(source, "utf8").matchAll(/\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (target === undefined || /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#") || target === "url") continue;
      const path = target.split("#")[0];
      if (path && !existsSync(resolve(dirname(source), path))) missing.push(`${relative} -> ${target}`);
    }
  }
  expect(missing).toEqual([]);
});

test("the agent's skill list shows every workflow and hides only the principles", () => {
  const skills = join(root, "skills");
  const mismatched: string[] = [];
  for (const directory of readdirSync(skills)) {
    const source = join(skills, directory, "SKILL.md");
    if (!existsSync(source)) continue;
    const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(readFileSync(source, "utf8"))?.[1];
    expect(frontmatter).toBeDefined();
    const fields = Bun.YAML.parse(frontmatter ?? "") as Record<string, unknown>;
    if ((fields["disable-model-invocation"] === true) !== directory.startsWith("principle-")) mismatched.push(directory);
  }
  expect(mismatched).toEqual([]);
});

test("discovery refuses an unauthorized install before launching Codex or creating its home", () => {
  inTemporaryDirectory((directory) => {
    const codexHome = join(directory, "codex home");
    const runtimeHome = join(directory, "runtime home");
    const temporary = join(directory, "temporary files");
    const codex = join(directory, "codex");
    const launched = join(directory, "codex was launched");
    mkdirSync(runtimeHome);
    mkdirSync(temporary);
    writeFileSync(codex, '#!/bin/sh\nprintf launched > "$FAKE_CODEX_LAUNCH"\nexit 91\n');
    chmodSync(codex, 0o755);
    const result = spawnSync(process.execPath, [join(root, "tests/e2e/plugin-discovery.ts"), "--codex", codex], {
      env: { ...process.env, HOME: runtimeHome, CODEX_HOME: codexHome, TMPDIR: temporary, FAKE_CODEX_LAUNCH: launched },
      encoding: "utf8",
      timeout: 10_000,
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("requires explicit user authorization and --allow-isolated-install");
    expect(result.stderr).not.toContain("ENOENT");
    expect(existsSync(codexHome)).toBe(false);
    expect(existsSync(join(runtimeHome, ".codex"))).toBe(false);
    expect(existsSync(launched)).toBe(false);
    expect(readdirSync(temporary)).toEqual([]);
  });
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

    const skill = join(directory, "skills/poteto-mode/SKILL.md");
    writeFileSync(skill, readFileSync(skill, "utf8").replace(/^description: .*$/m, "description: Changed for the drift fixture."));
    const drifted = sync("--check");
    expect(drifted.status).toBe(1);
    expect(drifted.stderr).toContain("out of date: skills/poteto-mode/agents/openai.yaml");
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
