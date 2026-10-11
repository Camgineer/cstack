#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { ensureDependenciesInstalled } from "./bootstrap.ts";

ensureDependenciesInstalled();
const { Command } = await import("commander");

type Receipt = {
  name: string;
  command: string;
  cwd: string;
  treeHash: string;
  startedAt: string;
} & (
  | { status: "running" }
  | { status: "finished"; exitCode: number; finishedAt: string; endTreeHash: string }
);

function git(cwd: string, ...args: string[]): string {
  const result = spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr.trim() || "Cannot read the Git working tree.");
  return result.stdout;
}

function treeHash(root: string): string {
  const entries = git(root, "ls-files", "--stage", "-z").split("\0");
  if (entries.some((entry) => entry.startsWith("160000 "))) {
    throw new Error("Check receipts do not support submodules. Run checks in each repository separately.");
  }
  const paths = new Set(git(root, "ls-files", "--cached", "--others", "--exclude-standard", "-z").split("\0").filter(Boolean));
  const hash = createHash("sha256");
  for (const path of [...paths].sort()) {
    const absolute = join(root, path);
    let stat;
    try {
      stat = lstatSync(absolute);
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") continue;
      throw error;
    }
    if (!stat.isFile() && !stat.isSymbolicLink()) throw new Error(`Cannot fingerprint ${path}. Expected a file or a symlink.`);
    const content = stat.isSymbolicLink() ? Buffer.from(readlinkSync(absolute)) : readFileSync(absolute);
    hash.update(JSON.stringify([path, stat.isSymbolicLink() ? "symlink" : "file", stat.mode & 0o111, createHash("sha256").update(content).digest("hex")]));
    hash.update("\n");
  }
  return hash.digest("hex");
}

function receiptDirectory(root: string, value: string): string {
  const directory = resolve(root, value);
  const inside = relative(join(root, "tmp"), directory);
  if (!inside || inside === ".." || inside.startsWith(`..${sep}`) || isAbsolute(inside)) {
    throw new Error("Keep receipts in a task directory under the project's tmp directory.");
  }
  let current = root;
  for (const part of relative(root, directory).split(sep)) {
    current = join(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error("The receipt directory must not contain symlinks.");
  }
  if (git(root, "ls-files", "-z", "--", relative(root, directory)).length) {
    throw new Error("The receipt directory contains tracked files. Use an untracked scratch directory.");
  }
  mkdirSync(directory, { recursive: true });
  const probe = relative(root, join(directory, "probe.json"));
  const ignored = () => spawnSync("git", ["-C", root, "check-ignore", "-q", "--", probe]).status === 0;
  if (!ignored()) {
    const ignoreFile = join(directory, ".gitignore");
    if (existsSync(ignoreFile) && lstatSync(ignoreFile).isSymbolicLink()) throw new Error("The scratch ignore file must not be a symlink.");
    const existing = existsSync(ignoreFile) ? readFileSync(ignoreFile, "utf8") : "";
    writeFileSync(ignoreFile, `${existing}${existing && !existing.endsWith("\n") ? "\n" : ""}*\n`);
  }
  if (!ignored()) throw new Error("The receipt directory must be ignored by Git.");
  return directory;
}

function save(directory: string, receipt: Receipt): void {
  const path = join(directory, `${receipt.name}.json`);
  const temporary = `${path}.${process.pid}.pending`;
  writeFileSync(temporary, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx" });
  renameSync(temporary, path);
}

function parseReceipt(path: string): Receipt {
  const value: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (typeof value !== "object" || value === null ||
    !("name" in value) || typeof value.name !== "string" ||
    !("command" in value) || typeof value.command !== "string" ||
    !("cwd" in value) || typeof value.cwd !== "string" ||
    !("treeHash" in value) || typeof value.treeHash !== "string" ||
    !("startedAt" in value) || typeof value.startedAt !== "string" ||
    !("status" in value)) throw new Error("Invalid receipt.");
  const base = { name: value.name, command: value.command, cwd: value.cwd, treeHash: value.treeHash, startedAt: value.startedAt };
  if (value.status === "running") return { ...base, status: "running" };
  if (value.status === "finished" &&
    "exitCode" in value && typeof value.exitCode === "number" && Number.isInteger(value.exitCode) &&
    "finishedAt" in value && typeof value.finishedAt === "string" &&
    "endTreeHash" in value && typeof value.endTreeHash === "string") {
    return { ...base, status: "finished", exitCode: value.exitCode, finishedAt: value.finishedAt, endTreeHash: value.endTreeHash };
  }
  throw new Error("Invalid receipt.");
}

const program = new Command()
  .name("check-receipt")
  .description("Run checks and bind their results to the working files.")
  .option("--receipts <directory>", "receipt directory relative to the project root", "tmp/check-receipt");

function context(): { root: string; directory: string } {
  const root = realpathSync(git(process.cwd(), "rev-parse", "--show-toplevel").trim());
  const options: { receipts: string } = program.opts();
  return { root, directory: receiptDirectory(root, options.receipts) };
}

program.command("record")
  .description("Run a named shell command in the current directory and save its result.")
  .argument("<name>", "check name, using letters, digits, dots, underscores, or hyphens")
  .argument("<command>", "shell command as one quoted argument")
  .action((name: string, command: string) => {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name) || !command.trim()) throw new Error("Provide a check name and a nonempty command.");
    const { root, directory } = context();
    const running: Receipt = { name, command, cwd: process.cwd(), treeHash: treeHash(root), startedAt: new Date().toISOString(), status: "running" };
    save(directory, running);
    const result = spawnSync("sh", ["-c", command], { stdio: "inherit" });
    const receipt: Receipt = { ...running, status: "finished", exitCode: result.status ?? 1, finishedAt: new Date().toISOString(), endTreeHash: treeHash(root) };
    save(directory, receipt);
    if (result.error) console.error(result.error.message);
    const changed = receipt.treeHash !== receipt.endTreeHash;
    console.log(`${name} recorded. Exit code ${receipt.exitCode}.${changed ? " The working tree changed during the check." : ""}`);
    process.exitCode = receipt.exitCode || (changed ? 1 : 0);
  });

program.command("check")
  .description("Refuse failed, unfinished, or stale receipts before a push or a verified-head report.")
  .action(() => {
    const { root, directory } = context();
    const current = treeHash(root);
    const files = readdirSync(directory).filter((file) => file.endsWith(".json")).sort();
    if (!files.length) throw new Error("No check receipts found. Record the required checks first.");
    const problems: string[] = [];
    for (const file of files) {
      try {
        const receipt = parseReceipt(join(directory, file));
        if (`${receipt.name}.json` !== file) throw new Error("Receipt name does not match its file.");
        if (receipt.status === "running") problems.push(`${receipt.name} is unfinished. Run it again.`);
        else {
          if (receipt.exitCode !== 0) problems.push(`${receipt.name} failed with exit code ${receipt.exitCode}. Run it again.`);
          if (receipt.treeHash !== current || receipt.endTreeHash !== current) problems.push(`${receipt.name} is stale. Run it again on the current tree.`);
        }
      } catch (error) {
        problems.push(`${file} cannot be read. ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (problems.length) {
      for (const problem of problems) console.error(problem);
      process.exitCode = 1;
    } else {
      console.log(`All ${files.length} check receipts passed on tree ${current}.`);
    }
  });
program.action(() => { program.help({ error: true }); });
try {
  await program.parseAsync();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
