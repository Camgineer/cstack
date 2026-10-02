// Run with Node 24 and a checkout of the pinned OpenMausBot parser and dependencies.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [checkout, artifact] = process.argv.slice(2);
if (!checkout || !artifact) {
  throw new Error("Usage: node scripts/validate_openmausbot.mjs <OpenMausBot checkout> <package.openmaus.json>");
}
const lock = JSON.parse(readFileSync(new URL("../openmausbot/platform-lock.json", import.meta.url), "utf8"));
for (const [path, expected] of Object.entries(lock.files)) {
  const actual = createHash("sha256").update(readFileSync(resolve(checkout, path))).digest("hex");
  assert.equal(actual, expected, `Parser source differs from pinned commit: ${path}`);
}
const { parsePackageDocument } = await import(pathToFileURL(resolve(checkout, "shared/package-format.ts")));
const { scanSkillText } = await import(pathToFileURL(resolve(checkout, "shared/skill-md.ts")));
const input = JSON.parse(readFileSync(artifact, "utf8"));
const parsed = parsePackageDocument(input, { trust: "file" });
assert.deepEqual(parsed, input, "Native parsing must preserve the complete package");
assert.equal(parsed.package.presets.length, 1);
assert.equal(parsed.package.skills.entries.length, 3);
assert.equal(parsed.package.agents.length, 0);
for (const entry of parsed.package.skills.entries) {
  assert.deepEqual(scanSkillText(entry.instructions), [], `${entry.name}: native review warnings`);
}
const missing = structuredClone(input);
missing.package.skills.entries.pop();
assert.throws(() => parsePackageDocument(missing, { trust: "file" }), /unknown skill/i);
const mismatch = structuredClone(input);
mismatch.package.skills.entries[0].description = "Does not match the skill text";
assert.throws(() => parsePackageDocument(mismatch, { trust: "file" }), /description/i);
console.log(JSON.stringify({ result: "PASS", platformCommit: lock.commit, packageSha256: createHash("sha256").update(readFileSync(artifact)).digest("hex"), skills: parsed.package.skills.entries.map(s => ({ name: s.name, bytes: Buffer.byteLength(s.instructions) })), checks: ["pinned parser source hashes", "native parse preserves package", "skill scans", "missing dependency rejected", "metadata mismatch rejected"] }, null, 2));
