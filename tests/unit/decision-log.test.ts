import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

function inTemporaryDirectory(run: (directory: string) => void): void {
  const directory = mkdtempSync(join(tmpdir(), "plugin helper "));
  try {
    run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("decision log keeps one header, one line per row, and guards formula cells", () => {
  inTemporaryDirectory((directory) => {
    const log = join(directory, "logs", "decisions.tsv");
    const append = (...cells: string[]) => {
      const result = spawnSync("bash", [resolve(import.meta.dir, "../../skills/show-me-your-work/scripts/log.sh"), log, ...cells], {
        encoding: "utf8",
        timeout: 10_000,
      });
      expect(result.stderr).toBe("");
      expect(result.status).toBe(0);
    };
    append("build", "=HYPERLINK(\"x\")", "tab\there", "line\nbreak", "ok");
    append("verify", "plain", "why", "evidence", "-1");

    const lines = readFileSync(log, "utf8").split("\n");
    expect(lines.pop()).toBe("");
    expect(lines[0]).toBe("ts\tphase\tdecision\twhy\tevidence\tresult");
    expect(lines).toHaveLength(3);
    const rows = lines.slice(1).map((line) => line.split("\t"));
    expect(rows.map((row) => row.length)).toEqual([6, 6]);
    expect(rows[0]?.slice(1)).toEqual(["build", "'=HYPERLINK(\"x\")", "tab here", "line break", "ok"]);
    expect(rows[1]?.slice(1)).toEqual(["verify", "plain", "why", "evidence", "'-1"]);
  });
});

