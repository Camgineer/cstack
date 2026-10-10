# Context

Orientation for an agent that picks this repository up cold. Read [AGENTS.md](../AGENTS.md) for the rules and the [README](../README.md) for what the plugin is, how it installs, and its layout table. This file holds only what those two leave out. When a line here repeats one of them, delete the line.

Each dated fact below is a snapshot. Check it at its source before you design around it.

## Layout beyond the README table

| Path | What an agent needs to know |
| --- | --- |
| `skills/cstack-mode/playbooks/` | One file per task type. The mode skill routes to them, and `opening-a-pr.md` ends every one. |
| `skills/cstack-mode/scripts/` | The Bun workspace. Every check runs from here, and `tests/` at the root holds its suites. |
| `skills/reflect/gate/` | Source of the Retro check. `.github/workflows/retro.yml` and `.github/retro-gate.jq` are this repository's installed copies. |
| `docs/` | Coordinator memory: this file, [DECISIONS.md](DECISIONS.md), and [STATUS.md](STATUS.md). |
| `.claude/worktrees/` | Untracked worktrees from agent sessions. Each agent works in the one its brief names. |
| `.git/orchestrate/<plugin>/` | Untracked coordinator state in the main checkout, including the standing orders. |

## Host truth

What a host can and cannot do lives in its note under `skills/cstack-mode/references/hosts/`, and nowhere else. A claim about a host in a pull request, a brief, or [STATUS.md](STATUS.md) is relayed until you check it against that note and the host doc the note links.

## How a change reaches users

AGENTS.md "Versioning" has the rules. These facts sit around them.

- Main accepts squash merges only, and its one required check is the `Checks` workflow job. The ruleset also requires a branch to be up to date with main, so a pull request that GitHub reports as behind needs a merge of main before it can land. Read from the ruleset API on 2026-10-09.
- Every merge to main that passes `Checks` runs the release workflow, which bumps the version and publishes a release. A docs-only merge releases a patch version like any other.
- A Claude Code, Codex, or Cursor install takes the repository as it is on main, so a new tracked file ships to those users. The Intent install is the exception. It packs only the paths in the root `package.json` `files` list. Inferred from the install commands in the README and from that list.
- `tools/setup.sh` runs only on Linux x86_64. On any other machine, run the four commands under "Develop and verify" in the README.

## The Retro check

`Retro` is a commit status that `.github/workflows/retro.yml` posts. The workflow job named `retro` passes as soon as it has posted the status, so read the status and not the job.

- The status stays pending until a pull request comment starts with `Retro: no lessons` or `Retro: lessons in <link>`.
- A lessons pull request passes with no comment when one of the first three text lines of its description starts with `Lessons from <link>`.
- The agent whose session built the pull request runs the retro, per **Retro** in `skills/cstack-mode/playbooks/opening-a-pr.md` and the `reflect` skill. Post the comment only after that run.
- On 2026-10-09 the main ruleset did not list `Retro` as a required check, so GitHub does not block a merge on it. The operator's merge gate does.

## Coordinator model

One coordinator thread owns this repository. It plans, delegates each piece of work to a child thread, and reviews what comes back. It writes no code itself.

- Only the operator merges, arms auto-merge, or closes a pull request. This overrides the playbook steps that arm auto-merge.
- Each child gets a brief that names its worktree, its writable paths, and its report format.
- Standing orders live at `.git/orchestrate/<plugin>/preferences.md` in the main checkout. Read them before any work. They override a playbook step they conflict with.
- These three files are the coordinator's long-term memory. A new coordinator thread reads all three before it plans.
