#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

type Term = { name: string; aliases: string[]; glossary: string; line: number };
type Finding = { file: string; line: number; column: number; alias: string; term: Term };
type Options = { base?: string; glossaries: string[]; paths: string[] };

const usage = `Usage: check-glossary.ts [--base <ref>] [--glossary <file>]... [file...]

Flags every alias a glossary lists under _Avoid_ in Markdown prose.
Reads GLOSSARY-MAP.md, GLOSSARY.md, CONTEXT-MAP.md, or CONTEXT.md at the repository root unless --glossary names files.
Checks the given files, or every tracked Markdown file. With --base, checks only lines added since the merge base with <ref>.
Skips code blocks, inline code, and link targets. Exits 1 when it finds an alias.`;

function fail(message: string): never {
  console.error(`${message}\n\n${usage}`);
  process.exit(2);
}

function parseArgs(argv: string[]): Options {
  const options: Options = { glossaries: [], paths: [] };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      console.log(usage);
      process.exit(0);
    }
    if (arg === "--base" || arg === "--glossary") {
      const value = argv[++index];
      if (value === undefined) fail(`${arg} needs a value.`);
      if (arg === "--base") options.base = value;
      else options.glossaries.push(value);
    } else if (arg?.startsWith("-")) fail(`Unknown option ${arg}.`);
    else if (arg !== undefined) options.paths.push(arg);
  }
  return options;
}

function git(root: string, args: string[]): string {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) fail(`git ${args.join(" ")} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

function findGlossaries(root: string): string[] {
  for (const map of ["GLOSSARY-MAP.md", "CONTEXT-MAP.md"]) {
    const path = join(root, map);
    if (!existsSync(path)) continue;
    const links = [...readFileSync(path, "utf8").matchAll(/\]\(([^)]+\.md)\)/g)].map((match) => resolve(root, match[1] ?? ""));
    return links.filter((link) => existsSync(link));
  }
  return ["GLOSSARY.md", "CONTEXT.md"].map((name) => join(root, name)).filter((path) => existsSync(path)).slice(0, 1);
}

function parseGlossary(path: string, root: string): Term[] {
  const terms: Term[] = [];
  const glossary = relative(root, path);
  let current: Term | undefined;
  readFileSync(path, "utf8").split("\n").forEach((text, index) => {
    const heading = /^\*\*(.+?)\*\*:?\s*$/.exec(text.trim());
    if (heading?.[1]) {
      current = { name: heading[1], aliases: [], glossary, line: index + 1 };
      terms.push(current);
      return;
    }
    const avoid = /^_Avoid_:\s*(.+)$/.exec(text.trim());
    if (avoid?.[1] && current) {
      const notesRemoved = avoid[1].replace(/\([^)]*\)/g, "");
      current.aliases.push(...notesRemoved.split(",").map((alias) => alias.trim().replace(/\.$/, "")).filter(Boolean));
    }
  });
  return terms;
}

function aliasPattern(alias: string): RegExp {
  const words = alias.split(/\s+/).map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`(?<![\\w-])${words.join("\\s+")}(?:s|es)?(?![\\w-])`, "gi");
}

function proseLines(text: string, keep: (line: number) => boolean): Array<{ line: number; text: string }> {
  const lines: Array<{ line: number; text: string }> = [];
  let fence: string | undefined;
  text.split("\n").forEach((raw, index) => {
    const marker = /^\s*(`{3,}|~{3,})/.exec(raw)?.[1];
    if (marker && (fence === undefined || marker.startsWith(fence))) {
      fence = fence === undefined ? marker : undefined;
      return;
    }
    if (fence !== undefined || !keep(index + 1)) return;
    const masked = raw.replace(/`[^`]*`/g, (span) => " ".repeat(span.length)).replace(/\]\([^)]*\)/g, (link) => " ".repeat(link.length));
    lines.push({ line: index + 1, text: masked });
  });
  return lines;
}

function addedLines(root: string, mergeBase: string, file: string): Set<number> {
  const added = new Set<number>();
  for (const hunk of git(root, ["diff", "-U0", mergeBase, "--", file]).matchAll(/^@@ -\S+ \+(\d+)(?:,(\d+))? @@/gm)) {
    const start = Number(hunk[1]);
    const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
    for (let line = start; line < start + count; line++) added.add(line);
  }
  return added;
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const root = git(process.cwd(), ["rev-parse", "--show-toplevel"]).trim();
  const glossaryPaths = options.glossaries.length > 0 ? options.glossaries.map((path) => resolve(path)) : findGlossaries(root);
  const allTerms = glossaryPaths.flatMap((path) => parseGlossary(path, root));
  const terms = allTerms.filter((term) => term.aliases.length > 0);
  if (terms.length === 0) {
    console.log("No glossary with _Avoid_ aliases found. Nothing to check.");
    return;
  }

  const termNames = allTerms.map((term) => aliasPattern(term.name));
  const mergeBase = options.base === undefined ? undefined : git(root, ["merge-base", options.base, "HEAD"]).trim();
  const candidates =
    options.paths.length > 0
      ? options.paths.map((path) => relative(root, resolve(path)))
      : mergeBase === undefined
        ? git(root, ["ls-files", "--", "*.md", "*.mdx"]).split("\n")
        : git(root, ["diff", "--name-only", "--diff-filter=AM", mergeBase, "--", "*.md", "*.mdx"]).split("\n");
  const skipped = new Set(glossaryPaths.map((path) => relative(root, path)));
  const files = candidates.filter((file) => file && !skipped.has(file) && existsSync(join(root, file)));

  const findings: Finding[] = [];
  for (const file of files) {
    const added = mergeBase === undefined ? undefined : addedLines(root, mergeBase, file);
    for (const { line, text: prose } of proseLines(readFileSync(join(root, file), "utf8"), (number) => added?.has(number) ?? true)) {
      const text = termNames.reduce((masked, name) => masked.replace(name, (found) => " ".repeat(found.length)), prose);
      for (const term of terms) {
        for (const alias of term.aliases) {
          for (const match of text.matchAll(aliasPattern(alias))) {
            findings.push({ file, line, column: (match.index ?? 0) + 1, alias: match[0], term });
          }
        }
      }
    }
  }

  for (const { file, line, column, alias, term } of findings) {
    console.log(`${file}:${line}:${column}: "${alias}" is an avoided alias. Use "${term.name}" (${term.glossary}:${term.line}).`);
  }
  if (findings.length > 0) process.exit(1);
  console.log(`No avoided glossary aliases in ${files.length} file${files.length === 1 ? "" : "s"}.`);
}

main();
