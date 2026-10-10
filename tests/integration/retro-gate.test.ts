import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const filter = resolve(import.meta.dir, "../../skills/reflect/gate/retro-gate.jq");

function gate(pullRequest: { body: string | null; comments: string[] }) {
  const run = spawnSync("jq", ["-c", "-f", filter], { input: JSON.stringify(pullRequest), encoding: "utf8" });
  expect(run.stderr).toBe("");
  return JSON.parse(run.stdout);
}

test("a PR without a retro record never blocks readiness or merging", () => {
  expect(gate({ body: "## Why\n\nFix a typo.", comments: ["LGTM", "The retro found nothing. Retro: no lessons"] })).toEqual({
    state: "success",
    description: "Retro recap pending; readiness and merging do not wait",
  });
});

test("a no-lessons record passes", () => {
  expect(gate({ body: null, comments: ["Retro: no lessons\n\n- Backlog: version conflicts"] })).toEqual({
    state: "success",
    description: "Retro: no lessons",
  });
});

test("a record that links a lessons PR passes", () => {
  expect(gate({ body: "", comments: ["  Retro: lessons in https://github.com/o/r/pull/7"] })).toEqual({
    state: "success",
    description: "Retro: lessons in https://github.com/o/r/pull/7",
  });
});

test("a lessons PR needs no retro of its own", () => {
  expect(gate({ body: "Lessons from https://github.com/o/r/pull/6\n\n## Accepted", comments: [] })).toEqual({
    state: "success",
    description: "Lessons PR, which gets no retro",
  });
});

test("a lessons PR under a host's attribution comment and byline needs no retro", () => {
  const body = '<!-- host: {"login":"someone"} -->\n_Requested by someone_\n\nLessons from https://github.com/o/r/pull/6\n\n## Accepted';
  expect(gate({ body, comments: [] })).toEqual({
    state: "success",
    description: "Lessons PR, which gets no retro",
  });
});

test("a hidden or code lessons line reports a pending recap without gating", () => {
  for (const body of ["<!--\nLessons from https://github.com/o/r/pull/6", "    Lessons from https://github.com/o/r/pull/6"]) {
    expect(gate({ body, comments: [] })).toEqual({
      state: "success",
      description: "Retro recap pending; readiness and merging do not wait",
    });
  }
});

test("a lessons line below the opening lines reports a pending recap without gating", () => {
  const body = "## Why\n\nOne\n\nTwo\n\nLessons from https://github.com/o/r/pull/6";
  expect(gate({ body, comments: [] })).toEqual({
    state: "success",
    description: "Retro recap pending; readiness and merging do not wait",
  });
});

test("a mention of a lessons PR reports a pending recap without gating", () => {
  expect(gate({ body: "Follows the Lessons from https://github.com/o/r/pull/6 review.", comments: [] })).toEqual({
    state: "success",
    description: "Retro recap pending; readiness and merging do not wait",
  });
});

test("this repository runs the reporter the plugin ships", () => {
  const root = resolve(import.meta.dir, "../..");
  for (const [installed, shipped] of [
    [".github/workflows/retro.yml", "skills/reflect/gate/retro.yml"],
    [".github/retro-gate.jq", "skills/reflect/gate/retro-gate.jq"],
  ]) {
    expect(readFileSync(resolve(root, installed!), "utf8")).toBe(readFileSync(resolve(root, shipped!), "utf8"));
  }
});
