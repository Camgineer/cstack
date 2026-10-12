#!/usr/bin/env bun
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { parseArgs } from "node:util";

type Skill = { name: string; description: string; explicitOnly: boolean; path: string };
type Document = { links: string[]; anchors: Set<string> };

const patterns = [
  { id: "writing-agent", rule: /\b(?:spawn|start|launch|dispatch|delegate)\b[^.!?\n]{0,120}\b(?:(?:writing|coding|implementation|editing)\s+(?:agent|subagent|worker|helper)|(?:agent|subagent|worker|helper)\b[^.!?\n]{0,120}\b(?:writ\w*|edit\w*|implement\w*|cod\w*|fix\w*))\b/i },
  { id: "branch-create", rule: /\b(?:(?:create|make|cut|start|checkout|check\s+out|switch\s+to)\s+(?:(?:a|an|the|new|fresh|feature|isolated|own|your)\s+)*branch|git\s+(?:checkout\s+-[bB]|switch\s+-[cC]|branch\s+(?!-(?:d|D|l|a|r)\b)[\w<][\w/<>-]*))\b/i },
  { id: "worktree-create", rule: /\b(?:(?:create|make|add|start)\s+(?:(?:a|an|the|new|fresh|isolated|own|your)\s+)*worktree|git\s+worktree\s+add)\b/i },
  { id: "pr-open", rule: /(?<!\[)\b(?:(?:open|create|submit|raise)\s+(?:(?:a|the|new|draft|your)\s+)*(?:PR|pull\s+request|merge\s+request)|(?:gh\s+pr|glab\s+mr)\s+create)\b/i },
  { id: "pr-review", rule: /\b(?:(?:review|approve|request\s+(?:a\s+)?review\s+(?:of|for|on))\s+(?:(?:a|the|new|open|draft|your|this)\s+)*(?:PR|pull\s+request|merge\s+request)|gh\s+pr\s+review)\b(?!\s+(?:body|description|title|template|prose|text)\b)/i },
  { id: "ci-watch", rule: /\b(?:(?:watch|monitor|poll|wait\s+for)\s+(?:(?:the|required|hosted|all|green)\s+)*(?:CI|checks|check\s+runs)|gh\s+(?:pr\s+checks\b[^\n]*--watch|run\s+watch))\b/i },
  { id: "pr-merge", rule: /\b(?:(?:merge|squash[- ]merge|auto[- ]merge)\s+(?:(?:a|the|your|this|ready|approved)\s+)*(?:PR|pull\s+request|merge\s+request|branch)|(?:gh\s+pr|glab\s+mr)\s+merge|git\s+merge(?![-\w]))\b/i },
  { id: "harness-tools", rule: /\b(?:AskUserQuestion|AskQuestion|TodoWrite|TodoRead|TaskCreate|TaskGet|TaskList|TaskUpdate|SendMessage|ToolSearch|EnterPlanMode|ExitPlanMode|WriteTodos|request_user_input|spawn_agent|send_input|multi_tool_use|nodeRepl|cua_repl|mcp__[\w]+|mcp_auth)\b|\b(?:functions|browser|computer|recipient)\.(?:exec(?:_command)?|write_stdin|apply_patch|run|click|snapshot|spawn_agent)\b|\b(?:Task|Skill|Bash|Read|Write|Edit|MultiEdit|Glob|Grep|Agent)\s+tool\b|\b(?:call|use|invoke)\s+(?:the\s+)?(?:Task|Skill|Bash|Read|Write|Edit|Glob|Grep|Agent)\b/ },
  { id: "harness-paths", rule: /(?:^|[\s/`"'(])\.(?:claude|codex|cursor|intent)(?:[/-]|\b)|\b(?:CLAUDE\.md|CSTACK_MODE|CODEX_HOME|CLAUDE_PROJECT_DIR)\b|plugin:\/\/|@Browser\b/i },
  { id: "harness-commands", rule: /\b(?:claude\s+(?:-p|--print|--plugin-dir|plugin)|codex\s+(?:exec|mcp|plugin)|cursor(?:-agent)?\s+(?:agent|--print|-p)|agent\s+--print)\b/i },
  { id: "deleted-skills", rule: /\b(?:cstack-mode|maintain-verification-skill|figure-it-out|automate-me|interrogate|swarm|arena)\b|\b(?:invoke|run|use|load|read)\s+(?:the\s+)?setup\s+skill\b/i },
  { id: "deleted-process", rule: /\b(?:runtime[ -]contract|references\/runtime\.md|bugbot-triage|watch-pr|worktree-audit(?:\.sh)?|check-plan\.ts|check-receipt\.ts|bootstrap\.ts|autopilot-full|autopilot-stack|autonomous[ -]run|multi-phase[ -]plan|opening[ -]a[ -]pr|worktree[ -]cleanup|session[ -]pickup|pause[ -]safely|comment-sicko|cstack-agent|orch)\b|\bagents\/(?:advisor|comment-sicko|cstack-agent|investigator|lead|reviewer|scout|verifier|worker)\.md\b|\b(?:orchestrate|shipping|babysit|image generation)\s+playbook\b|\b(?:advisor|comment sicko|lead|reviewer|scout|verifier|worker)\s+seat\b|\bscripts\/orch\b/i },
] satisfies { id: string; rule: RegExp }[];

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`symlinks are not shipped resources: ${path}`);
    return entry.isDirectory() ? files(path) : [path];
  }).sort();
}

function readSkill(path: string): Skill {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(readFileSync(path, "utf8"));
  if (!match?.[1]) throw new Error("frontmatter must be a YAML mapping");
  const value: unknown = Bun.YAML.parse(match[1]);
  if (typeof value !== "object" || value === null || !("name" in value) || !("description" in value)) {
    throw new Error("frontmatter needs name and description");
  }
  const { name, description } = value;
  if (typeof name !== "string" || name !== dirname(path).split(sep).at(-1)) throw new Error("name must match the skill directory");
  if (typeof description !== "string" || !description.trim()) throw new Error("description must be non-empty text");
  const policy = "disable-model-invocation" in value ? value["disable-model-invocation"] : undefined;
  if (policy !== undefined && typeof policy !== "boolean") throw new Error("disable-model-invocation must be a boolean");
  return { name, description, explicitOnly: policy === true, path };
}

function document(text: string): Document {
  const links: string[] = [];
  const anchors = new Set<string>();
  Bun.markdown.render(text, {
    link: (children, { href }) => { links.push(href); return children; },
    image: (children, { src }) => { links.push(src); return children; },
    heading: (children, { id }) => { if (id !== undefined) anchors.add(id); return children; },
    html: (children) => {
      for (const match of children.matchAll(/\b(?:id|name)=["']([^"']+)["']/g)) if (match[1]) anchors.add(match[1]);
      return children;
    },
  }, { headings: { ids: true } });
  return { links, anchors };
}

function invocationText(text: string, path: string, skills: Skill[]): string {
  return Bun.markdown.render(text, {
    link: (children, { href }) => {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) return children;
      const target = resolve(dirname(path), decodeURIComponent(href.split("#")[0] ?? ""));
      return skills.find((skill) => skill.path === target)?.name ?? children;
    },
    paragraph: (children) => `${children}\n`,
    heading: (children) => `${children}\n`,
    listItem: (children) => `${children}\n`,
  }).replace(/[*`]/g, "");
}

function main(): void {
  const { values } = parseArgs({ options: { root: { type: "string", default: resolve(import.meta.dir, "..") } } });
  const root = resolve(values.root);
  const paths = files(join(root, "skills"));
  const errors: string[] = [];
  const fail = (path: string, rule: string, message: string) => errors.push(`${relative(root, path)}: ${rule}: ${message}`);
  const skills: Skill[] = [];
  const docs = new Map<string, Document>();

  for (const path of paths) {
    const text = readFileSync(path, "utf8");
    for (const { id, rule } of patterns) {
      const match = rule.exec(text.replace(/[*`]/g, "").replace(/\s+/g, " "));
      if (match) fail(path, id, match[0]);
    }
    if (path.endsWith(`${sep}SKILL.md`)) {
      try { skills.push(readSkill(path)); }
      catch (error) { fail(path, "frontmatter", error instanceof Error ? error.message : String(error)); }
    }
    if (path.endsWith(".md")) docs.set(path, document(text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "")));
  }

  for (const entry of readdirSync(join(root, "skills"), { withFileTypes: true })) {
    if (entry.isDirectory() && !existsSync(join(root, "skills", entry.name, "SKILL.md"))) {
      fail(join(root, "skills", entry.name), "frontmatter", "skill directory needs SKILL.md");
    }
  }
  if (skills.length === 0) errors.push("skills: frontmatter: no skills found");
  const implicit = skills.filter((skill) => !skill.explicitOnly);
  const words = implicit.reduce((total, skill) => total + (skill.description.match(/\S+/gu) ?? []).filter((word) => /[\p{L}\p{N}]/u.test(word)).length, 0);
  if (words > 500) errors.push(`skills: description-budget: ${words} words exceeds 500`);
  for (const skill of implicit) {
    if (!/\b(?:use|apply)\s+(?:only\s+)?(?:when|before|after|for|to)\b/i.test(skill.description)) {
      fail(skill.path, "description-trigger", "say when to use the skill");
    }
  }

  for (const [path, doc] of docs) {
    for (const link of doc.links) {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(link)) continue;
      const [pathname = "", fragment] = link.split("#", 2);
      const target = pathname ? resolve(dirname(path), decodeURIComponent(pathname)) : path;
      if (!(target === root || target.startsWith(`${root}${sep}`)) || !existsSync(target)) {
        fail(path, "markdown-link", `missing shipped resource: ${link}`);
      } else if (fragment && statSync(target).isFile() && target.endsWith(".md")) {
        const anchors = docs.get(target)?.anchors ?? document(readFileSync(target, "utf8")).anchors;
        if (!anchors.has(decodeURIComponent(fragment))) fail(path, "markdown-link", `missing anchor: ${link}`);
      }
    }
  }

  const explicit = skills.filter((skill) => skill.explicitOnly);
  for (const skill of explicit) {
    for (const path of paths.filter((path) => path.startsWith(`${dirname(skill.path)}${sep}`) && path.endsWith(".md"))) {
      const text = invocationText(readFileSync(path, "utf8"), path, skills);
      for (const target of explicit) {
        const name = target.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const invocation = new RegExp(`\\b(?:invoke|run|use|apply|execute|call|follow|route\\s+to)\\s+(?:(?:the|skill)\\s+)*(?:[\\w./-]+/)?${name}\\b`, "i");
        if (invocation.test(text)) fail(path, "invocation-policy", `user-invoked ${skill.name} invokes user-invoked ${target.name}`);
      }
    }
  }

  for (const error of errors) console.error(error);
  console.log(`Toolkit: ${skills.length} skills, ${implicit.length} model-invocable, ${words}/500 description words, ${docs.size} Markdown files, ${errors.length} violations.`);
  if (errors.length) process.exitCode = 1;
}

try { main(); }
catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
