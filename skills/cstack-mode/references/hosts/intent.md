# Intent host note

Apply [the runtime contract](../runtime.md) first. This note maps its capabilities to Intent, a workspace app whose daemon, `intentd`, runs Claude Code, Codex, and other agent CLIs as providers. You are in Intent when your tools include `workspace_api` and your system prompt lists `<available_skills>`. Claude Code's own tools can still appear there, so follow this note rather than the Claude Code note.

Intent keeps the plugin's skills away from its providers. It starts Claude Code with skill commands off and user settings only, and it starts Codex in an isolated home with the user's skills, hooks, and plugins left out ([provider profiles](https://github.com/intent-hq/intentd/blob/bf6411e809d8029f543bbdcf82260ee4101940f0/crates/intent-services/src/provider_profiles/mod.rs)). Intent marks Claude Code's user plugins and hooks as unverified, so they may still run, and nothing here relies on them. The plugin reaches Intent agents through Intent's own skill catalog and specialists, which `hooks/intent-install.sh` fills. This note was read from `intentd`'s source at release 0.10.19 and checked against the 0.10.7 stable daemon.

| Capability | Native route |
| --- | --- |
| **Delegate** | `ws.agent.delegate` through the `workspace_api` tool ([bindings](https://github.com/intent-hq/intent/blob/7fe16c77e6871587cea5617c538253d9f26db4e7/docs/protocol/methods/mcp-bindings.md)). Put the brief in `agentInstructions`; no task note is needed. Pass `specialist: "cstack-agent"` or `specialist: "comment-sicko"` for a bundled persona, and pass a routed workflow's own prompt as `behaviorPrompt`. Intent removes Claude Code's native subagent tool, so this is the only route. Delegation stops two levels below the agent the person started: an agent at that depth cannot delegate. Read results with `ws.agent.readConversation`. |
| **Ask** | `ws.app.question.ask`, when the session's structured-questions feature is on. Intent turns it off for delegated agents. Otherwise ask in the reply and continue on reversible work. |
| **Plan** | Intent tasks: `ws.note.listTasks` to read them and `ws.task.update` to change status. |
| **Invoke a skill** | Intent lists each installed skill in the system prompt with its `location`. Read that `SKILL.md`. Users ask for a skill by name, since Intent has no skill command. The `principle-*` skills are not listed; read them at `<plugin-root>/skills/<name>/SKILL.md`. |
| **History** | `ws.agent.readConversation` for other agents in the workspace. Otherwise use a transcript or digest the user supplies. |
| **Continue later** | `ws.hook.schedule`, which wakes the agent when its check passes, and `ws.pr.monitor` for pull-request events, while the background-hooks and PR-monitor features are on. |
| **Generate an image** | None. An `image` line naming a CLI runner, such as `codex exec`, provides it. |

Skill directories. `<project-skills>` is `.agents/skills` in the project, which Intent and Codex outside Intent both read. `<user-skills>` is `~/.intent/skills`. Intent also scans `.claude/skills`, `.codex/skills`, and `.intent/skills` in the project ([skill discovery](https://github.com/intent-hq/intentd/blob/bf6411e809d8029f543bbdcf82260ee4101940f0/crates/intent-services/src/skills.rs)).

Instructions file. Intent adds one project file to every agent's system prompt: the first of `CLAUDE.md`, `AGENTS.md`, `.intent/guidelines.md`, and `.augment/guidelines.md` that exists, or else every `.intent/rules/*.md` ([rules](https://github.com/intent-hq/intentd/blob/bf6411e809d8029f543bbdcf82260ee4101940f0/crates/intent-services/src/rules.rs)). It does not follow `@` imports. In a project with a `CLAUDE.md`, put the mode line in `CLAUDE.md` itself, above any import of `AGENTS.md`.

User instructions file. None. Intent keeps personal rules in Settings → Agent Behavior ([settings](https://intentapp.dev/docs#settings-configuration)), so give the person the rule text to paste there.

Model roles. A `native` role passes `provider`, `model`, and `reasoningEffort` to `ws.agent.delegate`. A specialist file may also set `codingAgent`, `model`, and `reasoningEffort` in its frontmatter ([specialists](https://github.com/intent-hq/intentd/blob/bf6411e809d8029f543bbdcf82260ee4101940f0/crates/intent-services/src/specialists.rs)). The plugin's personas set none, so they run on the person's default provider and model. Set a persona's model with a `Models:` block. Intent's specialist editor writes through the installed link into the plugin's own file.

Plugin root. Intent lists a linked skill's real directory as its `resourceDirectory`. The plugin root is two levels above that directory.

Install. The person runs `npx -y github:<owner>/<repo>` with the plugin's repository, and runs it again to update. It runs `hooks/intent-install.sh`, which copies the plugin to `${XDG_DATA_HOME:-~/.local/share}/<plugin>`, replacing the last copy, because npx's cache can vanish. From a git checkout, such as a clone of the plugin being worked on, the script links to the checkout instead, and a rerun after `git pull` updates it. Either way, it links every skill except the principles into `~/.intent/skills` and both personas into `~/.intent/specialists`. It replaces only its own links and broken ones, and reports every other entry in the way as `kept`. Run from another host's plugin cache, it copies too, so its links never point into a cache that host replaces.

Persistent mode. Intent runs no hook of its own for the plugin, so `hooks/mode.sh` and `CSTACK_MODE` have no effect. The mode is on wherever an instruction says so. The project's instructions file covers one repository. For every project, the install's first run adds this personal rule through `intentd call rules.update` with `ruleType` `workspace`, which reaches every agent, including delegated ones. When it can't reach `intentd`, it prints the rule for the person to paste under Settings, Agent Behavior:

```markdown
Before any other step, read the `<plugin>-mode` skill's SKILL.md from your skills list and follow it for the rest of the session.
```

The person turns the mode off by removing that rule.

Attribution. Intent's `git.autoCommit` setting is on by default. When a task-linked agent goes idle, Intent commits its changes with a generated message and `Agent-Id:` and `Linked-Note-Id:` trailers, outside the **Authorship** rule in `playbooks/opening-a-pr.md`. Pass `skipAutoCommit: true` to `ws.agent.delegate`, and give the person the setting to turn off: auto-commit in Intent's Git settings, or `intentd settings git.autoCommit false`.

Headless runs. `intentd` runs on Linux without the desktop app. The installer gives a small launcher that downloads the daemon on the first `serve`. Where that download fails behind a proxy, fetch the asset that the [stable channel manifest](https://github.com/intent-hq/intentd-releases/releases/download/channel-stable/stable.json) lists, check it against the manifest's sha256, and run the `intentd` inside it. Start `intentd serve` with a disposable `HOME`, and keep `XDG_DATA_HOME` short, because its socket path must fit the Unix socket limit. `intentd status` shows the socket path and whether the daemon is up. Create a workspace with `intentd call workspace.create --params '{"title":"probe"}'`. Then `intentd call skill.list` and `intentd call specialist.list`, each given that workspace's id as `workspaceId`, show what Intent's agents see, with no provider signed in. On a failed call, `intentd call` prints an error line after the JSON, so parse stdout alone.
