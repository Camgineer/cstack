import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const check = resolve(import.meta.dir, "../../tools/check-toolkit.ts");

function fixture(run: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "toolkit fixture "));
  try { run(root); }
  finally { rmSync(root, { recursive: true, force: true }); }
}

function skill(root: string, name: string, body: string, policy = "", description = "Use when examining a change."): void {
  const directory = join(root, "skills", name);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "SKILL.md"), `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\n${policy}---\n\n# ${name}\n\n${body}\n`);
}

function run(root: string) {
  return spawnSync(process.execPath, [check, "--root", root], { encoding: "utf8", timeout: 10_000 });
}

const cases = [
  ["writing-agent", "Use read-only helpers to trace callers.", "Start an agent to implement the change."],
  ["branch-create", "Read the branch diff against its base.", "Create a new feature branch."],
  ["worktree-create", "Inspect files in the current worktree.", "Create an isolated worktree."],
  ["pr-open", "Write the PR description from the evidence.", "Open a draft PR."],
  ["pr-review", "Read PR review comments for the original rationale.", "Review the pull request."],
  ["ci-watch", "Read a recorded CI failure to locate the defect.", "Watch the hosted CI checks."],
  ["pr-merge", "Combine independent results at the reporting boundary.", "Squash-merge the approved PR."],
  ["harness-tools", "Ask the person for the missing decision.", "Call AskUserQuestion to settle the scope."],
  ["harness-paths", "Discover the project's supported skill directory.", "Install in ~/.claude/skills."],
  ["harness-commands", "Run the available terminal command.", "Run codex exec to continue."],
  ["deleted-skills", "Read the principles reference for this decision.", "Invoke the swarm skill."],
  ["deleted-process", "Use the caller's authorized scope.", "Read the runtime contract first."],
] satisfies [string, string, string][];

for (const [rule, passing, failing] of cases) {
  test(`${rule}: accepts toolkit guidance and rejects the forbidden instruction`, () => fixture((root) => {
    skill(root, "sample", passing);
    const good = run(root);
    expect(good.status).toBe(0);
    expect(good.stdout).toContain("1 skills, 1 model-invocable, 5/500 description words");
    skill(root, "sample", failing);
    const bad = run(root);
    expect(bad.status).toBe(1);
    expect(bad.stderr).toContain(`skills/sample/SKILL.md: ${rule}:`);
  }));
}

test("forbidden instructions in references, code, and metadata also fail", () => fixture((root) => {
  skill(root, "sample", "Read [recipe](recipe.md).");
  writeFileSync(join(root, "skills/sample/recipe.md"), "Inspect the current branch.\n");
  expect(run(root).status).toBe(0);
  writeFileSync(join(root, "skills/sample/recipe.md"), "```sh\ngit worktree add ../copy\n```\n");
  const code = run(root);
  expect(code.status).toBe(1);
  expect(code.stderr).toContain("skills/sample/recipe.md: worktree-create:");
  writeFileSync(join(root, "skills/sample/recipe.md"), "Inspect the current branch.\n");
  writeFileSync(join(root, "skills/sample/origin.json"), '{"notes":"Use cstack-mode"}');
  const metadata = run(root);
  expect(metadata.status).toBe(1);
  expect(metadata.stderr).toContain("skills/sample/origin.json: deleted-skills:");
}));

test("writing delegation and harness syntax cannot hide behind alternate spellings", () => fixture((root) => {
  skill(root, "sample", "Use read-only helpers for distinct source searches. Run the project's browser harness.");
  expect(run(root).status).toBe(0);
  for (const [instruction, rule] of [
    ["Spawn a writing agent.", "writing-agent"],
    ["Delegate to a helper to fix the bug.", "writing-agent"],
    ["Call TodoWrite.", "harness-tools"],
    ["Use the Bash tool.", "harness-tools"],
    ["Call functions.exec_command.", "harness-tools"],
    ["Call mcp__server__search.", "harness-tools"],
    ["Read $CODEX_HOME/skills.", "harness-paths"],
    ["Read .cursor/rules.", "harness-paths"],
    ["Open plugin://browser/tab.", "harness-paths"],
    ["Run claude --plugin-dir ./plugin.", "harness-commands"],
    ["Run cursor-agent --print.", "harness-commands"],
    ["Read agents/comment-sicko.md.", "deleted-process"],
    ["Read the Autonomous run playbook.", "deleted-process"],
    ["Run scripts/check-receipt.ts.", "deleted-process"],
  ]) {
    skill(root, "sample", instruction);
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`: ${rule}:`);
  }
}));

test("process command forms fail while read-only Git and PR prose pass", () => fixture((root) => {
  skill(root, "sample", "Run git merge-base HEAD main. Read [open PR #2] status. Review the PR description.");
  expect(run(root).status).toBe(0);
  for (const [command, rule] of [
    ["git switch -c topic", "branch-create"],
    ["git checkout -b topic", "branch-create"],
    ["git branch topic", "branch-create"],
    ["git worktree add ../topic", "worktree-create"],
    ["gh pr create --draft", "pr-open"],
    ["gh pr review --approve", "pr-review"],
    ["gh pr checks --watch", "ci-watch"],
    ["gh run watch 123", "ci-watch"],
    ["gh pr merge --squash", "pr-merge"],
    ["git merge topic", "pr-merge"],
  ]) {
    skill(root, "sample", `Run ${command}.`);
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`: ${rule}:`);
  }
}));

test("counts folded descriptions at the budget boundary and excludes explicit descriptions and names", () => fixture((root) => {
  const description = `Use when ${"word ".repeat(498)}`.trim();
  skill(root, "long-name-with-many-words", "Read the diff.", "", description);
  skill(root, "guide", "Read the diff.", "disable-model-invocation: true\n", "word ".repeat(600));
  const good = run(root);
  expect(good.status).toBe(0);
  expect(good.stdout).toContain("2 skills, 1 model-invocable, 500/500 description words");
  writeFileSync(join(root, "skills/long-name-with-many-words/SKILL.md"), `---\nname: long-name-with-many-words\ndescription: >-\n  ${description}\n  extra\n---\n`);
  const bad = run(root);
  expect(bad.status).toBe(1);
  expect(bad.stderr).toContain("description-budget: 501 words exceeds 500");
}));

test("requires valid frontmatter and an observable trigger for model invocation", () => fixture((root) => {
  skill(root, "sample", "Read the diff.");
  expect(run(root).status).toBe(0);
  for (const [source, diagnostic] of [
    ["# sample", "frontmatter"],
    ['---\nname: sample\ndescription: 123\n---\n', "description must be non-empty text"],
    ['---\nname: sample\ndescription: Helpful advice.\n---\n', "description-trigger"],
    ['---\nname: sample\ndescription: Use when editing.\ndisable-model-invocation: "true"\n---\n', "disable-model-invocation must be a boolean"],
    ['---\nname: wrong\ndescription: Use when editing.\n---\n', "name must match"],
  ]) {
    writeFileSync(join(root, "skills/sample/SKILL.md"), source);
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(diagnostic);
  }
}));

test("resolves Markdown links, images, references, encoded paths, and fragments but ignores code examples", () => fixture((root) => {
  writeFileSync(join(root, "outside.md"), "# Outside\n");
  skill(root, "sample", '[inline](notes%20(one).md#the-part)\n\n[reference][notes]\n\n![image](image.svg)\n\n[notes]: <notes (one).md> "Title"\n\n[local](#sample)\n\n[external](https://example.com/missing)\n\n```md\n[template](not-generated.md)\n```');
  writeFileSync(join(root, "skills/sample/notes (one).md"), "# The part\n");
  writeFileSync(join(root, "skills/sample/image.svg"), "<svg/>\n");
  expect(run(root).status).toBe(0);
  for (const link of ["missing.md", "image-missing.svg", "notes%20(one).md#absent", "#absent", "../../../outside.md"]) {
    skill(root, "sample", `[broken](<${link}>)`);
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("markdown-link:");
    expect(result.stderr).toContain(link);
  }
}));

test("explicit skills invoke model-invocable skills and read references, but cannot invoke explicit skills", () => fixture((root) => {
  skill(root, "guide", "Invoke `helper`. Read [recipe](../recipe/SKILL.md).", "disable-model-invocation: true\n");
  skill(root, "helper", "Read the diff.");
  skill(root, "recipe", "Read the diff.", "disable-model-invocation: true\n");
  expect(run(root).status).toBe(0);
  for (const instruction of ["Invoke `recipe`.", "Run the **recipe** skill.", "Apply [recipe](../recipe/SKILL.md).", "Follow recipe.", "Use the recipe skill.", "Invoke [the workflow](../recipe/SKILL.md).", "Invoke ../recipe/SKILL.md."]) {
    skill(root, "guide", instruction, "disable-model-invocation: true\n");
    const result = run(root);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("invocation-policy: user-invoked guide invokes user-invoked recipe");
  }
  skill(root, "guide", "Read [details](details.md).", "disable-model-invocation: true\n");
  writeFileSync(join(root, "skills/guide/details.md"), "Invoke recipe.\n");
  const reference = run(root);
  expect(reference.status).toBe(1);
  expect(reference.stderr).toContain("skills/guide/details.md: invocation-policy:");
}));
