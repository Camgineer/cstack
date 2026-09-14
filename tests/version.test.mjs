import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relative) => JSON.parse(await fs.readFile(path.join(root, relative), "utf8"));

test("plugin and package versions match and use semver", async () => {
  const [plugin, pkg] = await Promise.all([
    readJson(".codex-plugin/plugin.json"),
    readJson("package.json"),
  ]);
  assert.match(plugin.version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  assert.equal(plugin.version, pkg.version);
});

test("a pull request against main bumps the plugin version", async () => {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const base = process.env.CSTACK_VERSION_BASE || (eventPath ? JSON.parse(await fs.readFile(eventPath, "utf8")).pull_request?.base?.sha : null);
  if (!base) {
    const plugin = await readJson(".codex-plugin/plugin.json");
    assert.match(plugin.version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
    return;
  }
  const head = JSON.parse(await fs.readFile(path.join(root, ".codex-plugin/plugin.json"), "utf8")).version;
  const old = execFileSync("git", ["show", `${base}:.codex-plugin/plugin.json`], { cwd: root, encoding: "utf8" });
  const previous = JSON.parse(old).version;
  assert.notEqual(head, previous, `plugin version must change from ${previous}`);
});
