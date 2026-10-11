#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { copyFileSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";

type Receipt = {
  format: 2;
  repositoryRoot: string;
  name: string;
  command: string;
  cwd: string;
  treeHash: string;
  startedAt: string;
} & (
  | { status: "running" }
  | { status: "finished"; exitCode: number; finishedAt: string; endTreeHash: string }
);

const HELP = `Usage: bun check-receipt.ts [--receipts <directory>] record <name> '<command>'
       bun check-receipt.ts [--receipts <directory>] check [--head <commit>]

Run a named shell command in the current directory and save its result.
Receipts default to tmp/check-receipt under the project root.
Reuse a name only for the same command and working directory.
check refuses failed, unfinished, foreign, or stale receipts.
--head also requires the index and named commit to hold the checked tree.
Receipts are local bookkeeping that track the content Git puts in a commit after file conversions, can miss changes to raw file bytes, exclude ignored files, state outside the repository, and changes restored before exit, prove no authenticity, and leave loose Git objects in the repository.
`;

function git(root: string, args: string[], indexFile?: string): string {
  const result = spawnSync("git", ["-C", root, ...args], {
    encoding: "utf8",
    env: indexFile ? { ...process.env, GIT_INDEX_FILE: indexFile } : process.env,
  });
  if (result.status !== 0) throw new Error(result.stderr.trim() || "Cannot read the Git working tree.");
  return result.stdout.trim();
}

function statIfPresent(path: string) {
  try {
    return lstatSync(path);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
    throw error;
  }
}

function checkContainment(root: string, directory: string): void {
  const inside = relative(join(root, "tmp"), directory);
  if (!inside || inside === ".." || inside.startsWith(`..${sep}`) || isAbsolute(inside)) {
    throw new Error("Keep receipts in a task directory under the project's tmp directory.");
  }
  let current = root;
  for (const part of relative(root, directory).split(sep)) {
    current = join(current, part);
    if (statIfPresent(current)?.isSymbolicLink()) throw new Error("The receipt directory must not contain symlinks.");
  }
}

function writeAtomic(directory: string, name: string, content: string): void {
  const temporary = join(directory, `${name}.${randomUUID()}.pending`);
  writeFileSync(temporary, content, { flag: "wx" });
  renameSync(temporary, join(directory, name));
}

function receiptDirectory(root: string, value: string): string {
  const directory = resolve(root, value);
  checkContainment(root, directory);
  if (git(root, ["ls-files", "-z", "--", relative(root, directory)]).length) {
    throw new Error("The receipt directory contains tracked files. Use an untracked scratch directory.");
  }
  mkdirSync(directory, { recursive: true });
  const ignoreFile = join(directory, ".gitignore");
  const ignoreStat = statIfPresent(ignoreFile);
  if (ignoreStat?.isSymbolicLink()) throw new Error("The scratch ignore file must not be a symlink.");
  const probe = relative(root, join(directory, "probe.json"));
  const ignored = () => spawnSync("git", ["-C", root, "check-ignore", "-q", "--", probe]).status === 0;
  if (!ignored()) {
    const existing = ignoreStat ? readFileSync(ignoreFile, "utf8") : "";
    writeAtomic(directory, ".gitignore", `${existing}${existing && !existing.endsWith("\n") ? "\n" : ""}*\n`);
  }
  if (!ignored()) throw new Error("The receipt directory must be ignored by Git.");
  return directory;
}

function treeHash(root: string, directory: string, tree: "working" | "index" = "working"): string {
  const indexFile = join(directory, `index-${randomUUID()}`);
  try {
    const realIndex = resolve(root, git(root, ["rev-parse", "--git-path", "index"]));
    if (statIfPresent(realIndex)) copyFileSync(realIndex, indexFile);
    else git(root, ["read-tree", "--empty"], indexFile);
    if (git(root, ["ls-files", "--stage", "-z"], indexFile).split("\0").some((entry) => entry.startsWith("160000 "))) {
      throw new Error("Check receipts do not support submodules. Run checks in each repository separately.");
    }
    const stagedTree = git(root, ["write-tree"], indexFile);
    if (tree === "index") return stagedTree;
    git(root, ["-c", "core.filemode=true", "add", "-A", "--", "."], indexFile);
    return git(root, ["write-tree"], indexFile);
  } finally {
    rmSync(indexFile, { force: true });
    rmSync(`${indexFile}.lock`, { force: true });
  }
}

function save(directory: string, receipt: Receipt): void {
  writeAtomic(directory, `${receipt.name}.json`, `${JSON.stringify(receipt, null, 2)}\n`);
}

function parseReceipt(path: string): Receipt {
  const value: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (typeof value !== "object" || value === null ||
    !("format" in value) || value.format !== 2 ||
    !("repositoryRoot" in value) || typeof value.repositoryRoot !== "string" ||
    !("name" in value) || typeof value.name !== "string" ||
    !("command" in value) || typeof value.command !== "string" ||
    !("cwd" in value) || typeof value.cwd !== "string" ||
    !("treeHash" in value) || typeof value.treeHash !== "string" ||
    !("startedAt" in value) || typeof value.startedAt !== "string" ||
    !("status" in value)) throw new Error("Invalid receipt. Use a fresh receipt directory and rerun the checks.");
  const base = { format: 2, repositoryRoot: value.repositoryRoot, name: value.name, command: value.command, cwd: value.cwd, treeHash: value.treeHash, startedAt: value.startedAt } satisfies Omit<Receipt, "status">;
  if (value.status === "running") return { ...base, status: "running" };
  if (value.status === "finished" &&
    "exitCode" in value && typeof value.exitCode === "number" && Number.isInteger(value.exitCode) &&
    "finishedAt" in value && typeof value.finishedAt === "string" &&
    "endTreeHash" in value && typeof value.endTreeHash === "string") {
    return { ...base, status: "finished", exitCode: value.exitCode, finishedAt: value.finishedAt, endTreeHash: value.endTreeHash };
  }
  throw new Error("Invalid receipt.");
}

function record(root: string, directory: string, name: string, command: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name) || !command.trim()) throw new Error("Provide a check name and a nonempty command.");
  const cwd = realpathSync(process.cwd());
  const path = join(directory, `${name}.json`);
  if (statIfPresent(path)) {
    const previous = parseReceipt(path);
    if (previous.repositoryRoot !== root) throw new Error(`${name} belongs to another repository.`);
    if (previous.command !== command || previous.cwd !== cwd) {
      throw new Error(`${name} already records ${JSON.stringify(previous.command)} in ${previous.cwd}. Requested ${JSON.stringify(command)} in ${cwd}. Use another name.`);
    }
  }
  const originalDirectory = lstatSync(directory);
  const running: Receipt = { format: 2, repositoryRoot: root, name, command, cwd, treeHash: treeHash(root, directory), startedAt: new Date().toISOString(), status: "running" };
  save(directory, running);
  const result = spawnSync("sh", ["-c", command], { stdio: "inherit" });
  checkContainment(root, directory);
  const currentDirectory = lstatSync(directory);
  if (currentDirectory.dev !== originalDirectory.dev || currentDirectory.ino !== originalDirectory.ino) throw new Error("The receipt directory changed during the check. Run it again.");
  const receipt: Receipt = { ...running, status: "finished", exitCode: result.status ?? 1, finishedAt: new Date().toISOString(), endTreeHash: treeHash(root, directory) };
  save(directory, receipt);
  if (result.error) console.error(result.error.message);
  const changed = receipt.treeHash !== receipt.endTreeHash;
  console.log(`${name} recorded. Exit code ${receipt.exitCode}.${changed ? " The working tree changed during the check." : ""}`);
  process.exitCode = receipt.exitCode || (changed ? 1 : 0);
}

function check(root: string, directory: string, head: string | undefined): void {
  const current = treeHash(root, directory);
  const files = readdirSync(directory).filter((file) => file.endsWith(".json")).sort();
  if (!files.length) throw new Error("No check receipts found. Record the required checks first.");
  const problems: string[] = [];
  for (const file of files) {
    try {
      const receipt = parseReceipt(join(directory, file));
      if (`${receipt.name}.json` !== file) throw new Error("Receipt name does not match its file.");
      if (receipt.repositoryRoot !== root) problems.push(`${receipt.name} belongs to another repository. Run it again here.`);
      if (receipt.status === "running") problems.push(`${receipt.name} is unfinished. Run it again.`);
      else {
        if (receipt.exitCode !== 0) problems.push(`${receipt.name} failed with exit code ${receipt.exitCode}. Run it again.`);
        if (receipt.treeHash !== current || receipt.endTreeHash !== current) problems.push(`${receipt.name} is stale. Run it again on the current tree.`);
      }
    } catch (error) {
      problems.push(`${file} cannot be read. ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (head !== undefined) {
    if (treeHash(root, directory, "index") !== current) problems.push("The index tree differs from the checked working tree.");
    try {
      if (git(root, ["rev-parse", "--verify", "--end-of-options", `${head}^{tree}`]) !== current) problems.push(`${head} does not contain the checked working tree.`);
    } catch {
      problems.push(`The named commit ${JSON.stringify(head)} does not exist.`);
    }
  }
  if (problems.length) {
    for (const problem of problems) console.error(problem);
    process.exitCode = 1;
  } else console.log(`All ${files.length} check receipts passed on tree ${current}.${head === undefined ? "" : ` ${head} contains that tree.`}`);
}

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { receipts: { type: "string", default: "tmp/check-receipt" }, head: { type: "string" }, help: { type: "boolean", short: "h" } } });
  if (values.help) console.log(HELP);
  else {
    const [action, name, command] = positionals;
    if (!((action === "record" && positionals.length === 3 && values.head === undefined) || (action === "check" && positionals.length === 1))) throw new Error(HELP);
    const root = realpathSync(git(process.cwd(), ["rev-parse", "--show-toplevel"]));
    const directory = receiptDirectory(root, values.receipts);
    if (action === "record" && name !== undefined && command !== undefined) record(root, directory, name, command);
    else check(root, directory, values.head);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
