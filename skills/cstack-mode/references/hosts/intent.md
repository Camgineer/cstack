# Intent host note

Apply [the runtime contract](../runtime.md) first. This note maps its capabilities to Intent, a workspace app whose daemon, `intentd`, runs Claude Code, Codex, and other agent CLIs as providers.

Intent loads no host plugin. It starts Claude Code with skill commands off and user settings only, and it starts Codex in an isolated home without the user's skills, hooks, or plugins ([provider profiles](https://github.com/intent-hq/intentd/blob/main/crates/intent-services/src/provider_profiles/mod.rs)). The plugin reaches Intent agents through Intent's own skill catalog and specialists instead, which `hooks/intent-install.sh` fills.

| Capability | Native route |
| --- | --- |
| **Delegate** | `ws.agent.delegate` through the `workspace_api` tool. Pass `specialist: "cstack-agent"` or `specialist: "comment-sicko"` for a bundled persona. For a routed workflow's own prompt, pass it as `behaviorPrompt`. Intent removes Claude Code's native subagent tool, so this is the only route. Read results with `ws.agent.readConversation`. |
| **Ask** | `ws.app.question.ask`, when the session's structured-questions feature is on. Otherwise ask in the reply and continue on reversible work. |
| **Plan** | Intent tasks: `ws.note.listTasks` to read them and `ws.task.update` to change status. |
| **Invoke a skill** | Intent lists each installed skill in the system prompt with its `location`. Read that `SKILL.md`. Users ask for a skill by name, since Intent has no skill command. The `principle-*` skills are not listed; read them at `<plugin-root>/skills/<name>/SKILL.md`. |
| **History** | `ws.agent.readConversation` for other agents in the workspace. Otherwise use a transcript or digest the user supplies. |
| **Continue later** | `ws.hook.schedule`, which wakes the agent when its check passes, and `ws.pr.monitor` for pull-request events. |
| **Generate an image** | None. An `image` line naming a CLI runner, such as `codex exec`, provides it. |

Skill directories. `<project-skills>` is `.agents/skills` in the project, which Intent and Codex both read. `<user-skills>` is `~/.intent/skills`. Intent also scans `.claude/skills`, `.codex/skills`, and `.intent/skills` in the project ([skill discovery](https://github.com/intent-hq/intentd/blob/main/crates/intent-services/src/skills.rs)).

Instructions file. Intent adds the project's `CLAUDE.md`, `AGENTS.md`, `.intent/guidelines.md`, and `.intent/rules/*.md` to every agent's system prompt.

User instructions file. None. Intent keeps personal rules in Settings → Agent Behavior ([settings](https://intentapp.dev/docs#settings-configuration)), so give the person the rule text to paste there.

Model roles. A `native` role passes `provider`, `model`, and `reasoningEffort` to `ws.agent.delegate`. A specialist file may also set `codingAgent`, `model`, and `reasoningEffort` in its frontmatter. The plugin's personas set none, so they run on the person's default provider and model. Set a persona's model with a `Models:` line rather than Intent's specialist editor, because the installed persona is a link into the plugin's files.

Plugin root. Intent lists a linked skill's real directory as its `resourceDirectory`. The plugin root is two levels above that directory.

Install. Run `sh <plugin-root>/hooks/intent-install.sh` from a checkout that stays in place, such as a clone the person updates with `git pull`. Run it again after each update, so added and removed skills follow. It links every skill except the principles into `~/.intent/skills` and both personas into `~/.intent/specialists`, and it leaves any entry that is not its own link untouched. A link into another host's versioned plugin cache breaks when that host updates.

Persistent mode. Intent runs no plugin hooks, so `hooks/mode.sh` and `CSTACK_MODE` have no effect. The mode is on wherever an instruction says so. The project's `AGENTS.md` line covers one repository. For every project, the person pastes this personal rule, which reaches every agent, including delegated ones:

```markdown
Before any other step, read the `<plugin>-mode` skill's SKILL.md from your skills list and follow it for the rest of the session.
```

The person turns the mode off by removing that rule.

Attribution. Intent's docs name no commit or PR attribution setting, so the **Authorship** rule in `playbooks/opening-a-pr.md` is the whole control.

Headless runs. `intentd` runs on Linux without the desktop app. Start `intentd serve` with a disposable `HOME`, and keep `XDG_DATA_HOME` short, because its socket path must fit the Unix socket limit. Create a workspace with `intentd call workspace.create --params '{"name":"probe"}'`. Then `intentd call skill.list` and `intentd call specialist.list`, each given that workspace's id as `workspaceId`, show what Intent's agents see, with no provider signed in.
