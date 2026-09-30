# Set up CStack on Codex

**Development draft: do not install this branch into production.** The port targets local Codex CLI and ChatGPT/Codex Desktop. [Validation status](../codex-port/VALIDATION.md) lists what has actually passed and what remains blocked.

After the completed port is reviewed and merged, installation uses the official Codex marketplace/plugin lifecycle. No manual cache edits, dependency installers, or hook trust changes happen during discovery.

## Configure the project

Invoke [`setup-pstack`](../../skills/setup-pstack/SKILL.md) through the host's registered CStack skill selector. It discovers actual supported model/effort pairs, preserves upstream role meanings and panel counts, and writes only a confirmed project map to `.codex/cstack/models.json`. Model and reasoning effort are separate values. Missing roles require configuration; they do not pick an old provider default.

`auto` and `inherit-parent` omit model overrides. They do not prove which model served a request or make a panel model-diverse. Optional native personas are project-scoped and ownership-checked. A fresh session may be required for native agent discovery. Global settings and credentials are unchanged.

Setup can also offer a project-local verification skill under `.agents/skills/` when the project lacks one.

## Start a task

Load Poteto Mode explicitly, then describe a small outcome and its verification:

```text
$cstack:poteto-mode add a --json flag to this command. text output stays byte-identical. verify both.
```

The loaded skill routes the task through the matching playbook. Persistent mode is a separate lifecycle contract: the current prototype recognizes the exact standalone activation message `$cstack:poteto-mode` (or `$cstack:poteto-mode on`) and exact opt-out `$cstack:poteto-mode off`. Free-form activation or opt-out does not yet update persisted state. This differs from upstream's natural-language sticky mode and remains a release-review gate.

Hook trust requires normal host review. A unit test or summary is not evidence that activation survived real resume, child dispatch, or compaction. Do not claim persistence without the verified host receipt.

Next: [Route work through Poteto Mode](./02-poteto-mode.md).
