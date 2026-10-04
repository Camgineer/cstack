---
name: setup
description: Prepare a person's harness and a project for this plugin, fixing each gap found. Use for setup, plugin setup, or first use of the plugin in a repository.
---

# Set up the plugin

Read [the runtime contract](../cstack-mode/references/runtime.md) and the host note for this harness. The plugin needs no model or provider configuration, so setup covers only what a person and a project must change once.

Work through each item. Fix it when the fix is a file change in the project or in the person's own host settings. Show each change with the value it replaces, and use the **Ask** capability to get the person's yes before you write outside the project. When an item needs a setting only the person can reach, give them the exact setting and where it lives. Leave project edits uncommitted for the person to review.

1. **Install.** Confirm the plugin loaded: this skill and the `<plugin>-mode` skill appear in the host's skill list, and a read of `<plugin-root>/skills/<plugin>-mode/SKILL.md` succeeds. Where the host note says the plugin's hooks need the person's trust or say how a missing hook shows, check that and report it.
2. **Attribution.** Read the host note's attribution paragraph. Where the host has a setting, an unset key counts as on. Write the form the host note gives that works on every version it names, in the person's own settings file, because attribution is a personal choice across projects. When the session runs in an environment that resets on start, write it in the project's settings file instead, and tell the person it survives a reset only once they commit it. Where the host has no setting, or attribution that no setting removes, report that the **Authorship** rule in [opening-a-pr](../cstack-mode/playbooks/opening-a-pr.md) is the remaining control.
3. **Commit identity.** Apply the **Authorship** rule's identity check to the project. Ask once for the person's name and email when the project, their global git config, and their forge account do not supply both. An identity that names a model, an agent, or a harness supplies nothing. When the session runs in an environment that resets on start, also tell the person to add the same two settings, with `--global`, to the environment's setup script, because a new environment starts with the harness identity again.
4. **Mode.** Read the instructions file each host note names. Put the mode line in `AGENTS.md` at the project root, and create the file with only that line when it is missing. When this host's instructions file is another file, make it import `AGENTS.md` the way its host note shows, at the end of the file. When no line already invokes `<plugin>-mode` first, add this line near the top, with `<plugin>` resolved to the plugin's name:

   ```markdown
   Invoke the `<plugin>-mode` skill as your first action in every session in this repository, before any other tool call. Work under it for the rest of the session unless the user turns it off.
   ```

   The hooks keep the mode on only on a machine where the person typed its command, and some hosts run no hooks, so every other session relies on this line.
5. **Merging.** Read the base branch's required checks, its allowed merge methods, and whether the repository allows auto-merge, with the commands in **Merging** in [opening-a-pr](../cstack-mode/playbooks/opening-a-pr.md). Ask the person once whether agents should arm auto-merge when they mark a PR ready, and with which method when the base allows more than one. When the answer differs from that rule's default, add one `Merging:` line to `AGENTS.md`, such as `Merging: manual` or `Merging: auto, rebase`. When the base requires no status checks or the repository has auto-merge off, report that agents wait for every check, or leave the merge to the person, and name the forge setting that changes it.
6. **Dependencies.** Check the tools some workflows need and name each one that is missing: Bun with the plugin's locked helper dependencies for the bookkeeping helpers, `gh` for the PR watcher, and Graphite for the Orchestrate stack frontier. Leave installs to the person.
7. **Verification.** When the project has no scripted way to prove its UI, CLI, or service behavior, offer the **create-verification-skill** skill once.

Report a table with one row per item and these columns: state before, change you made, action left for the person, and state after. Setup is done when every row is fixed, already set, or names an action for the person.
