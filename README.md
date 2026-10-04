# CStack

This is a portable engineering toolkit for coding agents. It runs the same workflows in Claude Code, Codex, and Cursor: investigate, design, build, verify, and review. It builds on [PStack by Lauren Tan (poteto)](https://github.com/cursor/plugins/tree/main/pstack) and ships 55 skills.

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

In Claude Code and Codex, the mode stays on for the project once you invoke it, including in new sessions and after the context compacts. Run the same command with `off` to turn it off. Codex asks you to review and trust the plugin's hooks first. In Cursor, the mode lasts for the current chat.

## Learn from every PR

When an agent reports a PR ready to merge, it runs a retro with the `reflect` skill. Lessons for your repository go to its `AGENTS.md`, and lessons for the plugin go to a draft for the plugin's repository. Each lesson lands in a draft PR that waits for your review. A PR with nothing to learn gets a `Retro: no lessons` comment.

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
| `agents/` | Persona prompts. Claude Code and Cursor register them as subagents. Codex receives them as instructions. |
| `skills/cstack-mode/references/runtime.md` | The runtime contract. Workflows name capabilities such as "delegate" and "ask the user". |
| `skills/cstack-mode/references/hosts/` | One host note per harness. Each maps those capabilities to native tools. |
| `.claude-plugin/`, `.codex-plugin/`, `.agents/plugins/`, `.cursor-plugin/` | Generated manifests. Never edit them by hand. |
| `hooks/` | Claude Code and Codex hooks that keep `cstack-mode` on across sessions. Cursor loads the empty `hooks/cursor.json` instead. |
| `tools/metadata.json` | The single source for the plugin's name, version, and description. |
| `contrib/` | Optional sources that need one vendor's automation APIs. No manifest loads them. |

To change the version, edit `tools/metadata.json` and regenerate. To rename the plugin, also rename the `<name>-mode` skill and the `<name>-agent` persona to match, then regenerate. The agent's skill list shows every workflow skill. The `principle-*` skills set `disable-model-invocation: true`, which keeps them off that list. `cstack-mode` reads them when a step needs one. CI fails if a principle is visible or any other skill is hidden.

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

The imported baseline is PStack 0.15.9 at `cursor/plugins@e43c7ee26e0038c6c1fa8380dd34ce86ff94cb2a`. The update from 0.15.5 took `correct`, `benchmark-checklist`, `principle-explain-the-number`, and the agent-friendly `architect` red flags. It left out the performance mantras, the PR heading rewrite, `/goal` and `/loop` scheduling, fresh subagents by default, the rule against reply tokens, the zod-first boundary parsing in `typescript-best-practices`, and the removal of source lines from `technical-writing`. The original import of 0.15.5 remains in Git history at `c31f7ace991843f5576398ad025969465251192c`.

## License

[MIT](LICENSE). Upstream license notices and source provenance remain with the imported material. `align`, `grill-with-docs`, and `domain-modeling` adapt [mattpocock/skills](https://github.com/mattpocock/skills), `show-me` adapts [humanlayer/skills](https://github.com/humanlayer/skills), and `deslop`, `control-ui`, and `control-cli` adapt [Cursor Team Kit](https://github.com/cursor/plugins/tree/main/cursor-team-kit). Each keeps its upstream MIT license and an `origin.json` beside its `SKILL.md`.
