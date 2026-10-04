---
name: setup
description: Prepare a person's harness and a project for this plugin, fixing each gap found. Use for setup, plugin setup, or first use of the plugin in a repository.
---

# Set up the plugin

Read [the runtime contract](../cstack-mode/references/runtime.md) and the host note for this harness. The plugin needs no model or provider configuration, so setup covers only what a person and a project must change once.

Work through each item. Fix it when the fix is a file change in the project or the person's own host settings. Show the exact change before you write outside the project. When an item needs a setting only the person can reach, give them the exact setting and its location.

1. **Install.** Confirm the plugin loaded: its skills appear in the host's skill list and the plugin root resolves from this skill's directory. Where the host runs the plugin's hooks, confirm they loaded, per the host note. On Codex, ask the person to review and trust the hooks when they are untrusted.
2. **Attribution.** Read the host note's attribution section. Where the host has a setting, check it in the person's settings and the project's settings, and turn attribution off where it is on. Where the host has none, report that the **Authorship** rule in [opening-a-pr](../cstack-mode/playbooks/opening-a-pr.md) is the only control.
3. **Commit identity.** Read `git config user.name` and `git config user.email` in the project. When either names a model, an agent, or a harness, set the project's local identity to the person's own, such as their forge noreply address, and ask once when you cannot find it. In a cloud or remote environment that resets on start, tell the person to add the same two settings, with `--global`, to the environment's setup script.
4. **Mode.** Find the instructions file every agent in the project reads at session start, usually `AGENTS.md`, plus `CLAUDE.md` for Claude Code (it can hold `@AGENTS.md`). When it does not already start the mode, add this line, with `<plugin>` resolved to the plugin's name:

   ```markdown
   Invoke the `<plugin>-mode` skill as your first action in every session in this repository, before any other tool call. Work under it for the rest of the session unless the user turns it off.
   ```

   The hooks keep the mode on only where the person typed its command on that machine, so new machines, cloud sessions, and Cursor chats rely on this line.
5. **Dependencies.** Check only what the person's planned workflows need. The Bun helpers need Bun and their locked dependencies in an owned working copy, the PR watcher needs `gh`, and the Orchestrate stack frontier needs Graphite. Name each missing one. Leave installs to the person.
6. **Verification.** When the project has no scripted way to prove its UI, CLI, or service behavior, offer the **create-verification-skill** skill once.

Report one row per item: its state before, the change you made or the setting the person must change, and its state after. Setup is done when every row shows fixed, already set, or a named action for the person.
