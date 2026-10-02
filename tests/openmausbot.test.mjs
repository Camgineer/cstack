import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { bundle, render, ROOT } from "../scripts/build_openmausbot.mjs";

test("package carries complete instructions, references, and license notices", () => {
  const outputs = render();
  const pkg = JSON.parse(outputs.get("cstack-pilot-0.1.0.openmaus.json")).package;
  assert.deepEqual(pkg.presets[0].skills, ["simple-as-prose", "writing-for-agents", "cstack-how"]);
  assert.deepEqual(Object.keys(pkg.presets[0].bot), ["soul"]);
  assert.deepEqual(pkg.agents, []);
  for (const key of ["team", "connections", "routines", "playbooks", "publisher"]) assert.equal(pkg[key], undefined);
  const [prose, agents, how] = pkg.skills.entries.map(entry => entry.instructions);
  assert.match(prose, /# AI tells/);
  assert.match(prose, /Copyright \(c\) 2026 Camgineer/);
  assert.match(prose, /Copyright \(c\) 2026 Lauren Tan/);
  assert.match(agents, /# Skill mechanics for OpenMausBot/);
  assert.match(agents, /Copyright \(c\) 2026 Matt Pocock/);
  assert.match(how, /# Exploration reference/);
  assert.match(how, /# Explanation reference/);
  assert.match(how, /Copyright \(c\) 2026 Lauren Tan/);
  for (const entry of pkg.skills.entries) {
    assert.equal(outputs.get(`skills/${entry.name}/SKILL.md`).toString(), entry.instructions);
    assert.doesNotMatch(entry.instructions, /\]\((?!#|https?:|mailto:)[^)]+\)/);
  }
});

test("checked-in artifacts reproduce byte for byte", () => {
  for (const [path, data] of render()) assert.deepEqual(readFileSync(join(ROOT, "dist/openmausbot", path)), data);
});

function fixture(run) {
  const dir = mkdtempSync(join(tmpdir(), "cstack-bundle-"));
  try {
    writeFileSync(join(dir, "SKILL.md"), "---\nname: example\ndescription: Example skill\n---\nRead [reference](reference.md).\n");
    writeFileSync(join(dir, "reference.md"), "# Reference\nThe required instruction.\n");
    writeFileSync(join(dir, "LICENSE"), "An example license.\n");
    run(dir, { entry: "SKILL.md", references: ["reference.md"], licenses: ["LICENSE"], source: "https://example.org/source", adaptation: "Fixture" });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("a forgotten reference fails the build instead of creating an incomplete skill", () => fixture((dir, spec) => {
  spec.references = [];
  assert.throws(() => bundle(dir, spec), /Unbundled reference/);
}));

test("a missing license fails the build", () => fixture((dir, spec) => {
  rmSync(join(dir, "LICENSE"));
  assert.throws(() => bundle(dir, spec), /ENOENT/);
}));

test("repository escape in a reference is rejected", () => fixture((dir, spec) => {
  writeFileSync(join(dir, "reference.md"), "Read [external](../private.md).\n");
  assert.throws(() => bundle(dir, spec), /outside repository/);
}));

test("an oversized self-contained skill fails before import", () => fixture((dir, spec) => {
  writeFileSync(join(dir, "reference.md"), "x".repeat(256 * 1024));
  assert.throws(() => bundle(dir, spec), /byte limit/);
}));
