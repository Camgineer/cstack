# CStack

This is a portable engineering toolkit for coding agents. It runs the same workflows in Claude Code, Codex, Cursor, and Intent: investigate, design, build, verify, and review. It builds on [PStack by Lauren Tan (poteto)](https://github.com/cursor/plugins/tree/main/pstack) and ships 55 skills.

The toolkit holds process only. It has nothing about who uses it or which repositories they work in. Keep personal context in your agent's own memory.

## Install

In the commands below, `OWNER/REPO` is the GitHub repository you install from. `PLUGIN` is the `name` field in [tools/metadata.json](tools/metadata.json).

**Claude Code.** Add the repository as a marketplace, then install the plugin:

```bash
claude plugin marketplace add OWNER/REPO
claude plugin install PLUGIN@PLUGIN
```

Inside a session, `/plugin marketplace add OWNER/REPO` and `/plugin install PLUGIN@PLUGIN` do the same.

**Codex.** Clone the repository, add the checkout as a marketplace, then add the plugin:

```bash
codex plugin marketplace add /path/to/checkout
codex plugin add PLUGIN@PLUGIN
```

**Cursor.** Add the repository through Cursor's plugin settings. Cursor reads `.cursor-plugin/plugin.json` at the repository root.

**Intent.** Intent loads no plugins, so this command fetches the latest plugin, keeps a copy in `~/.local/share/cstack`, and links its skills and personas into Intent:

```bash
npx -y github:OWNER/REPO
```

Run it again to update. Each run replaces the copy, so new and removed skills follow. To work on the plugin itself, run `sh hooks/intent-install.sh` from a clone instead, and Intent links straight to the clone. Intent support is new: the install is checked against Intent's daemon, but no agent session has run under it yet. On the first run, the command also adds the rule that keeps the mode on to Intent's Settings, under Agent Behavior. When it can't reach Intent, it prints the rule for you to paste there. To pick models for the plugin's delegated steps, add a `Models:` block to that rule. Leave the plugin's specialists alone in Intent's specialist editor, which saves its changes into the plugin's files, where the next update replaces them.

On a new computer, run the same commands. Every skill, playbook, and persona comes back with the plugin.

## Get started

Run `setup` once in each repository. It turns off AI attribution where your harness allows, fixes the commit identity, and makes the mode start in every session. Then run `cstack-mode` for an engineering task. Each harness has its own command form.

| Harness | Command |
| --- | --- |
| Claude Code | `/PLUGIN:cstack-mode` |
| Codex | `$PLUGIN:cstack-mode` |
| Cursor | `/cstack-mode` |

For example:

```text
Use cstack-mode to reproduce the invoice export bug, fix its cause,
and verify the exported amounts. Prepare a PR for review.
```

CStack Mode picks a playbook and loads the skills the task needs. It reports any tool or model the workflow needs that your harness lacks.

In Claude Code and Codex, the mode stays on for the project once you invoke it, including in new sessions and after the context compacts. Run the same command with `off` to turn it off. Codex asks you to review and trust the plugin's hooks first. In Cursor, it stays on in new chats, but can lapse when a long chat compacts. To keep it on every turn, pick `cstack-mode` from the `/` menu with Option+Enter on Mac or Alt+Enter on Windows instead of Enter. That makes it a [Custom Mode](https://cursor.com/docs/agent/prompting#custom-modes), which stays in context until you exit it. Cursor offers Custom Modes in the Agents Window and the CLI.

To turn the mode on in every project, set `CSTACK_MODE=on` in the environment your harness starts from, such as your shell profile or a cloud environment's settings. Claude Code, Codex, and Cursor all read it when a session starts. Intent ignores it and uses the rule from its install step instead. Unset it to stop. A project you turn off with the `off` command stays off either way.

## Write a prompt

A prompt states what you want and how to tell when it is done. The playbook supplies the steps, so a few plain sentences work better than a step-by-step plan. Put in:

- **The goal.** Say what is wrong, or what you want.
- **The done check.** Name something that can pass or fail. "Make it better" and "work on it for an hour" are not checks.
- **The proof to show.** Ask for the real command output, a video of the flow, the stored value, or a before and after number.
- **What you already know.** Add a symptom, a repro step, a log line, or a link.
- **The real constraints.** "Reproduce it first", "don't change any code yet", "no behavior change", and "let me review the design first" each change what the agent does.

Leave out the how and the list of skills. The playbook picks both, and a hand-written order drops steps it would keep. Hold back your theory of the cause until the agent restates the problem, because a stated guess narrows its search. For a long thread or a vague report, make the restatement the first step:

```text
Use cstack-mode to read this thread and restate the underlying issue
in plain words. Don't change any code yet.
```

For a change you will leave running, the `align` skill asks you for the goal, the done check, and the proof, and records them in a signed spec. Before you step away, say so, for example "going to bed". The agent then keeps going, and it still pauses before irreversible steps such as a deploy or a force-push.

## Learn from every PR

Before an agent marks a PR ready to merge, it runs a retro with the `reflect` skill. Lessons for your repository go to its `AGENTS.md`, and lessons for the plugin go to a draft for the plugin's repository. The lessons land in one PR that goes through the same review and merge rules as any other PR. A PR with nothing to learn gets a `Retro: no lessons` comment.

On GitHub, you can make the retro a merge requirement. Ask an agent to install the retro gate, then add the `Retro` status check to your default branch's required checks.

## Keep yourself the only author

The plugin's PR playbook writes commits, PRs, and comments with no AI attribution, and it checks that you are the commit author. Each harness also adds its own attribution, which you turn off on your computer:

| Harness | Setting |
| --- | --- |
| Claude Code | In `~/.claude/settings.json`: `"attribution": { "commit": "", "pr": "", "sessionUrl": false }` |
| Codex | None needed. Current versions add no attribution. |
| Cursor | Turn off Commit Attribution and PR Attribution in Cursor Settings. For the CLI, in `~/.cursor/cli-config.json`: `"attribution": { "attributeCommitsToAgent": false, "attributePRsToAgent": false }` |

Cloud agents (Claude Code on the web, Codex cloud tasks, Cursor cloud agents) can add attribution that no setting removes, such as a bot commit identity or a comment footer.

## Choose a skill

| Task | Skill |
| --- | --- |
| Run an engineering task from investigation through verification | `cstack-mode` |
| Explain how existing code works | `how` |
| Investigate why a decision was made | `why` |
| Agree a signed spec with the agent before it works alone | `align` |
| Compare designs before implementation | `architect` |
| Stress-test a plan and record its glossary and decisions | `grill-with-docs` |
| Show a design or change as code, diffs, or diagrams | `show-me` |
| Review a change | `interrogate` |
| Build with a failing test first | `tdd` |
| Design or polish a UI and prove every state renders | `design-ui` |
| Drive a UI or CLI to verify a change | `control-ui`, `control-cli` |
| Check a benchmark result before you trust it | `benchmark-checklist` |
| Coordinate independent tasks | `swarm` |
| Write clear prose for people | `simple-as-prose` |
| Write prompts, skills, and agent instructions | `writing-for-agents` |
| Capture lessons from a session or a PR you just finished | `reflect` |
| Stop agents repeating the same mistake | `correct` |

The [skill directory](skills/) has the full catalog. Playbooks, principles, persona prompts, and references are instructions the agent loads as needed. This README is the repository's only human guide.

Some workflows need extra tools. The Bun helpers need their locked dependencies, the PR watcher needs `gh`, and the Orchestrate stack frontier needs Graphite.

## How the repository is laid out

One core serves all three harnesses. Each harness gets a thin adapter that uses its own native plugin format.

```mermaid
flowchart LR
  meta[tools/metadata.json] --> sync[tools/sync-hosts.ts]
  fm[SKILL.md frontmatter] --> sync
  sync --> cc[.claude-plugin/]
  sync --> cx[.codex-plugin/ and .agents/plugins/]
  sync --> cu[.cursor-plugin/]
  sync --> oy[skills/*/agents/openai.yaml]
  core[skills/ and agents/] --> cc & cx & cu
```

| Path | Role |
| --- | --- |
| `skills/` | The core. Skills in the shared `SKILL.md` format, with no harness tool names. |
| `agents/` | Persona prompts. Claude Code and Cursor register them as subagents. Codex receives them as instructions. Intent lists them as specialists. |
| `skills/cstack-mode/references/runtime.md` | The runtime contract. Workflows name capabilities such as "delegate" and "ask the user". |
| `skills/cstack-mode/references/hosts/` | One host note per harness. Each maps those capabilities to native tools. |
| `.claude-plugin/`, `.codex-plugin/`, `.agents/plugins/`, `.cursor-plugin/` | Generated manifests. Never edit them by hand. |
| `hooks/` | Hooks that keep `cstack-mode` on across sessions. Claude Code and Codex load `hooks/hooks.json`, and Cursor loads `hooks/cursor.json`. `intent-install.sh` links the plugin into Intent, which runs no hooks, and is the command `npx` runs. |
| `tools/metadata.json` | The single source for the plugin's name, version, and description. |
| `contrib/` | Optional sources that need one vendor's automation APIs. No manifest loads them. |

The release workflow sets the version after each merge to main. To rename the plugin, also rename the `<name>-mode` skill and the `<name>-agent` persona to match, then regenerate. The agent's skill list shows every workflow skill. The `principle-*` skills set `disable-model-invocation: true`, which keeps them off that list. `cstack-mode` reads them when a step needs one. CI fails if a principle is visible or any other skill is hidden.

```bash
bun run --cwd skills/cstack-mode/scripts sync:hosts
```

## Develop and verify

Tooling uses Bun and strict, erasable TypeScript. The versions are pinned in [package.json](skills/cstack-mode/scripts/package.json) and the dependency lockfile.

With the pinned Bun runtime available, run these commands from a checkout:

```bash
bun install --cwd skills/cstack-mode/scripts --frozen-lockfile --ignore-scripts
bun run --cwd skills/cstack-mode/scripts typecheck
bun run --cwd skills/cstack-mode/scripts check:hosts
bun run --cwd skills/cstack-mode/scripts test
```

`check:hosts` fails when a generated manifest or `openai.yaml` no longer matches its source. GitHub Actions runs all of these on pull requests and pushes to main. The tests are grouped by what they exercise.

| Location | Category | Execution |
| --- | --- | --- |
| `tests/unit/` | Watcher policy, parsing, rendering, and query logic with controlled readers | `test:unit` |
| `tests/integration/` | Real CLI processes, filesystem stores, Git worktrees, and bundled resource links | `test:integration` |
| `tests/types/` | Compiler checks for valid and invalid watcher states | `typecheck` |
| `tests/support/` | Shared test fixtures | Loaded by tests |
| `tests/e2e/` | Real Codex plugin discovery and installation lifecycle in an isolated home | Explicitly authorized `test:e2e` run |

`test` runs the unit and integration suites. The end-to-end harness is a standalone command because it needs a Codex executable and permission to install the candidate. Automatic CI skips it.

For a Linux x86_64 cloud environment with Node and npm available, use `bash tools/setup.sh` as the install script. It installs the pinned Bun runtime into `/workspace/.plugin-tools`, installs locked dependencies, and runs the checks. Add `/workspace/.plugin-tools/bin` to the environment PATH. Set `SETUP_TOOL_ROOT` to install somewhere else.

Plugin discovery can also be tested in a disposable, credential-free home. After explicit authorization to install the candidate for that test, run:

```bash
bun run --cwd skills/cstack-mode/scripts test:e2e --allow-isolated-install --codex <binary>
```

The flag guards the command; it does not grant permission. Verify host-specific behavior in each harness where you intend to use the plugin.

## PStack updates

PStack updates arrive through reviewed, agent-assisted imports. An agent compares upstream changes with the recorded baseline, adapts useful changes to the harness-neutral core, and verifies the result in a PR. The plugin can change upstream structure and behavior to suit its own design.

The imported baseline is PStack 0.15.13 at `cursor/plugins@2cbf58508f40de470d7490b55c51d71241928fa2`. The update from 0.15.9 took the guide's advice on writing a prompt and Cursor's Custom Modes for keeping the mode on. It left out the `poteto-help` skill, because in a pilot the plugin's agent already answered help questions well from the installed skill files, and a typed-only skill would break the rule that hides only principle skills. It also left out the guide pages, because this README is the repository's only human guide. Of the guide's advice, it left out cloud subagents and `/in-cloud`, Cursor Projects, typing `/typescript-best-practices`, and traits for an agent-friendly control CLI. The update from 0.15.5 took `correct`, `benchmark-checklist`, `principle-explain-the-number`, and the agent-friendly `architect` red flags. It left out the performance mantras, the PR heading rewrite, `/goal` and `/loop` scheduling, fresh subagents by default, the rule against reply tokens, the zod-first boundary parsing in `typescript-best-practices`, and the removal of source lines from `technical-writing`. The original import of 0.15.5 remains in Git history at `c31f7ace991843f5576398ad025969465251192c`.

## License

[MIT](LICENSE). Upstream license notices and source provenance remain with the imported material. `align`, `grill-with-docs`, and `domain-modeling` adapt [mattpocock/skills](https://github.com/mattpocock/skills), `show-me` adapts [humanlayer/skills](https://github.com/humanlayer/skills), and `deslop`, `control-ui`, and `control-cli` adapt [Cursor Team Kit](https://github.com/cursor/plugins/tree/main/cursor-team-kit). Each keeps its upstream MIT license and an `origin.json` beside its `SKILL.md`.
