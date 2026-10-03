---
name: setup-pstack
description: Check which of this plugin's workflows the current harness can run, with its native tools, model choices, and verification capabilities, before using them in a project. Use for setup-pstack or plugin setup.
---

# Set up the plugin's workflows

Read [the runtime contract](../cstack-mode/references/runtime.md). Setup establishes what this host can do; ordinary workflows require no generated configuration.

1. Identify the current harness and read its host note from the runtime contract. Identify the project, available skill discovery, native delegation/status tools, and authorized source-control or connector access. Inspect actual schemas before selecting fields. Use a supported readiness workflow if the environment is starting.
2. Retain the user's current native model choices. For ordinary single-role work, inherit when no override is requested. If the user wants a specific model or a diverse panel, use an exposed model catalog and the actual delegation schema to establish supported model IDs and reasoning efforts. Preserve the workflow's seat count; report unavailable diversity and obtain the user's choice before reducing that requirement.
3. Check only the dependencies needed for the requested work. Helpers require existing Bun dependencies in an owned working copy; the watcher requires `gh`, and the Orchestrate stack frontier requires Graphite metadata. Find real UI/CLI verification tools for the target. Name unavailable capabilities without installing software or changing permissions.
4. Explain that bundled persona prompts work through native delegation without generated profiles. Report whether this host runs the plugin's hooks, per its host note. Where it does, typing the `cstack-mode` command keeps the mode on for the project until the user turns it off. Elsewhere it applies to the current session only.
5. Report the workflows this host can execute, the selected model policy, missing lanes or dependencies, and tests still needed. Distinguish reading skill source from installed discovery and actual runtime verification. Stop when the requested workflow has a supported route or a concrete blocker.

If the project needs a reusable verification path, offer `create-verification-skill` once. On acceptance, use the real application tools and save the skill under `<project-skills>/`.
