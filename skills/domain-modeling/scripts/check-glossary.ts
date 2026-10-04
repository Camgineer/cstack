#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

type Term = { name: string; aliases: string[]; glossary: string; line: number };
type Finding = { file: string; line: number; column: number; alias: string; term: Term };
type Options = { base?: string; glossaries: string[]; paths: string[] };
type Span = { start: number; end: number };

const glossaryNames = ["GLOSSARY-MAP.md", "GLOSSARY.md", "CONTEXT-MAP.md", "CONTEXT.md"];

const usage = `Usage: check-glossary.ts [--base <ref>] [--glossary <file>]... [file...]

Flags every alias a glossary lists under _Avoid_ in Markdown prose.
Finds GLOSSARY-MAP.md, GLOSSARY.md, CONTEXT-MAP.md, or CONTEXT.md in the current directory or the nearest parent inside the repository, unless --glossary names files.
Checks the given files, or every tracked Markdown file under the glossary's directory. With --base, checks only lines added since the merge base with <ref>.
Skips code blocks, inline code, links, URLs, front matter, and HTML comments. Exits 1 when it finds an alias.`;

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

function git(cwd: string, args: string[]): string {
  const result = spawnSync("git", ["-c", "core.quotePath=false", ...args], { cwd, encoding: "utf8" });
  if (result.status !== 0) fail(`git ${args.join(" ")} failed: ${result.stderr.trim()}`);
  return result.stdout;
}

function findGlossaries(start: string, root: string): { directory: string; paths: string[] } | undefined {
  for (let directory = start; ; directory = dirname(directory)) {
    const found = glossaryNames.find((name) => existsSync(join(directory, name)));
    if (found?.endsWith("-MAP.md")) {
      const map = join(directory, found);
      const links = [...readFileSync(map, "utf8").matchAll(/\]\(([^)#\s]+\.md)(?:#[^)]*)?\)/g)].map((match) => resolve(directory, match[1] ?? ""));
      const paths = links.filter((link) => existsSync(link));
      if (paths.length === 0) console.error(`${relative(start, map)} links no glossary file that exists.`);
      return { directory, paths };
    }
    if (found) return { directory, paths: [join(directory, found)] };
    if (directory === root || directory === dirname(directory)) return undefined;
  }
}

function parseGlossary(path: string, directory: string): Term[] {
  const terms: Term[] = [];
  const glossary = relative(directory, path);
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

function wordPattern(phrase: string): RegExp {
  const words = phrase.split(/\s+/).map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`(?<![\\w-])${words.join("\\s+")}(?:s|es)?(?![\\w-])`, "gi");
}

function spans(text: string, pattern: RegExp): Span[] {
  return [...text.matchAll(pattern)].map((match) => ({ start: match.index ?? 0, end: (match.index ?? 0) + match[0].length }));
}

function blank(text: string, pattern: RegExp): string {
  return text.replace(pattern, (found) => " ".repeat(found.length));
}

function proseLines(text: string, keep: (line: number) => boolean): Array<{ line: number; text: string }> {
  const lines: Array<{ line: number; text: string }> = [];
  const raw = text.split("\n");
  let fence: string | undefined;
  let comment = false;
  let frontMatter = raw[0]?.trim() === "---";
  raw.forEach((source, index) => {
    if (frontMatter) {
      if (index > 0 && source.trim() === "---") frontMatter = false;
      return;
    }
    const marker = /^\s*(`{3,}|~{3,})/.exec(source)?.[1];
    if (marker && (fence === undefined || marker.startsWith(fence))) {
      fence = fence === undefined ? marker : undefined;
      return;
    }
    if (fence !== undefined || /^\s*\[[^\]]+\]:\s/.test(source)) return;
    let prose = source;
    if (comment) {
      const close = prose.indexOf("-->");
      if (close === -1) return;
      comment = false;
      prose = " ".repeat(close + 3) + prose.slice(close + 3);
    }
    prose = blank(prose, /<!--.*?-->/g);
    const open = prose.indexOf("<!--");
    if (open !== -1) {
      comment = true;
      prose = prose.slice(0, open);
    }
    if (!keep(index + 1)) return;
    prose = blank(blank(blank(prose, /`[^`]*`/g), /\]\([^)]*\)/g), /\b[a-z][a-z0-9+.-]*:\/\/\S+/gi);
    lines.push({ line: index + 1, text: prose });
  });
  return lines;
}

function addedLines(directory: string, mergeBase: string, paths: string[]): Map<string, Set<number>> {
  const added = new Map<string, Set<number>>();
  const diff = git(directory, ["diff", "-U0", "-M", "--relative", "--diff-filter=AMR", mergeBase, "--", ...(paths.length > 0 ? paths : ["*.md", "*.mdx"])]);
  let lines: Set<number> | undefined;
  for (const line of diff.split("\n")) {
    const file = /^\+\+\+ b\/(.+)$/.exec(line)?.[1];
    if (file !== undefined) {
      lines = new Set();
      added.set(file, lines);
      continue;
    }
    const hunk = /^@@ -\S+ \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (hunk && lines) {
      const start = Number(hunk[1]);
      const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
      for (let number = start; number < start + count; number++) lines.add(number);
    }
  }
  return added;
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const root = git(cwd, ["rev-parse", "--show-toplevel"]).trim();
  const found = options.glossaries.length > 0 ? { directory: cwd, paths: options.glossaries.map((path) => resolve(path)) } : findGlossaries(cwd, root);
  const directory = found?.directory ?? cwd;
  const allTerms = (found?.paths ?? []).flatMap((path) => parseGlossary(path, directory));
  const terms = allTerms.filter((term) => term.aliases.length > 0);
  if (terms.length === 0) {
    console.log("No glossary with _Avoid_ aliases found. Nothing to check.");
    return;
  }

  const paths = options.paths.map((path) => relative(directory, resolve(path)));
  const mergeBase = options.base === undefined ? undefined : git(directory, ["merge-base", options.base, "HEAD"]).trim();
  const added = mergeBase === undefined ? undefined : addedLines(directory, mergeBase, paths);
  const candidates = added !== undefined ? [...added.keys()] : paths.length > 0 ? paths : git(directory, ["ls-files", "-z", "--", "*.md", "*.mdx"]).split("\0");
  const skipped = new Set((found?.paths ?? []).map((path) => relative(directory, path)));
  const files = candidates.filter((file) => file && !skipped.has(file) && existsSync(join(directory, file)));
  const termPatterns = allTerms.map((term) => wordPattern(term.name));

  const findings: Finding[] = [];
  for (const file of files) {
    for (const { line, text } of proseLines(readFileSync(join(directory, file), "utf8"), (number) => added?.get(file)?.has(number) ?? true)) {
      const termSpans = termPatterns.flatMap((pattern) => spans(text, pattern));
      for (const term of terms) {
        for (const alias of term.aliases) {
          for (const match of text.matchAll(wordPattern(alias))) {
            const start = match.index ?? 0;
            const end = start + match[0].length;
            if (termSpans.some((span) => span.start <= start && end <= span.end && span.end - span.start > end - start)) continue;
            findings.push({ file, line, column: start + 1, alias: match[0], term });
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
