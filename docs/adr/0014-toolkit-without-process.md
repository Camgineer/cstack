# The mode selects the task guide

The plugin supplies tools, task guides, and one default mode. The mode is `autopilot`. It picks which task guide to read and follow. The person and their environment choose the model and own the branch. Installing the plugin registers no hook.

## Process test

The previous test said a skill is process when it decides who does the work or what happens to the branch, and that process goes.

The test now has three parts:

- Choosing the task guide is allowed. `autopilot` may make that choice, then follow the chosen guide.
- Choosing a model is process. No skill names a model for a task. A missing model name is a failure of this rule, and so is a silent default model.
- Choosing the branch, opening a review, or merging is process. The surrounding environment owns those.

A tool still helps the agent already doing the work. Task guides stay explicit-only. `autopilot` is model-invocable. Any request with no guide named may load it, and it selects the guide.

## Consequences

`autopilot` reads the `description` in each task guide's own file and follows the one that fits. It keeps no copy of those descriptions. The guide ends when the work is verified on the current branch. The mode does not install hooks, write a model map, or take the branch. When no description fits, it asks which guide to follow and waits.

The mode is one skill under `skills/`. Cursor, Claude Code, and Codex discover that same file through their generated manifests. Grok is outside this decision.

The term for this procedure is task guide. The README and `AGENTS.md` already use that term. Runbook does not appear in this repository. In the `why` skill, playbook names an evidence-category reference, which is a different concept, so those files keep their name.
