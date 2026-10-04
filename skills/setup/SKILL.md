---
name: setup
description: Prepare a person's harness and a project for this plugin, fixing each gap found. Use for setup, plugin setup, or first use of the plugin in a repository.
---

# Set up the plugin

Read [the runtime contract](../cstack-mode/references/runtime.md) and the host note for this harness. Setup covers what a person and a project must change once.

Work through each item. Fix it when the fix is a file change in the project or in the person's own host settings. Show each change with the value it replaces, and use the **Ask** capability to get the person's yes before you write outside the project. When an item needs a setting only the person can reach, give them the exact setting and where it lives. Leave project edits uncommitted for the person to review.

1. **Install.** Confirm the plugin loaded: this skill and the `<plugin>-mode` skill appear in the host's skill list, and a read of `<plugin-root>/skills/<plugin>-mode/SKILL.md` succeeds. Where the host note says the plugin's hooks need the person's trust or say how a missing hook shows, check that and report it.
2. **Attribution.** Read the host note's attribution paragraph. Where the host has a setting, an unset key counts as on. Write the form the host note gives that works on every version it names, in the person's own settings file, because attribution is a personal choice across projects. When the session runs in an environment that resets on start, write it in the project's settings file instead, and tell the person it survives a reset only once they commit it. Where the host has no setting, or attribution that no setting removes, report that the **Authorship** rule in [opening-a-pr](../cstack-mode/playbooks/opening-a-pr.md) is the remaining control.
3. **Commit identity.** Apply the **Authorship** rule's identity check to the project. Ask once for the person's name and email when the project, their global git config, and their forge account do not supply both. An identity that names a model, an agent, or a harness supplies nothing. When the session runs in an environment that resets on start, also tell the person to add the same two settings, with `--global`, to the environment's setup script, because a new environment starts with the harness identity again.
4. **Mode.** Read the instructions file each host note names. Put the mode line in `AGENTS.md` at the project root, and create the file with only that line when it is missing. When this host's instructions file is another file, make it import `AGENTS.md` the way its host note shows, at the end of the file. When no line already invokes `<plugin>-mode` first, add this line near the top, with `<plugin>` resolved to the plugin's name:

   ```markdown
   Invoke the `<plugin>-mode` skill as your first action in every session in this repository, before any other tool call. Work under it for the rest of the session unless the user turns it off.
   ```

   The hooks keep the mode on only on a machine where the person typed its command, and some hosts run no hooks, so every other session relies on this line.
5. **Models.** Read **Model roles** in the runtime contract. Ask the person once which runner, model, effort, and speed each role should use, with the host's model as the default for every role, and list the agent CLIs found on the PATH as runner options. Check each CLI runner they name: run a one-line prompt through it non-interactively, with the model flag from its `--help`, and report an error, a sign-in prompt, or a rejected model as a failure to fix before writing. When any role differs from the default, write a `Models:` block with one line per set role to the user instructions file named in the host note, after their yes, because model choices follow the person across projects. When the host note says the host has no such file, follow what it says instead. When the session runs in an environment that resets on start, tell them a user-level file does not survive the reset.
6. **Dependencies.** Check the tools some workflows need and name each one that is missing: Bun with the plugin's locked helper dependencies for the bookkeeping helpers, `gh` for the PR watcher, and Graphite for the Orchestrate stack frontier. Leave installs to the person.
7. **Verification.** When the project has no scripted way to prove its UI, CLI, or service behavior, offer the **create-verification-skill** skill once.

Report a table with one row per item and these columns: state before, change you made, action left for the person, and state after. Setup is done when every row is fixed, already set, or names an action for the person.
