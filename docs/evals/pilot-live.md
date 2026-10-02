# Live pilot cases

All cases are **not run**. These specifications are the next step after package review and authorized installation. Static parser success does not count as live evidence.

Use [the acceptance protocol](acceptance.md) to record model, app revision, package hash, permissions, tools, prompt, outcome, evidence, elapsed time, and unnecessary questions. Compare the native baseline and CStack in separate fresh conversations with the same configuration. Run source questions against a disposable copy of [the fixture](fixtures/how/); keep this expected-answer document out of the candidate's supplied context.

| Case | Prompt or setup | Required evidence |
|---|---|---|
| New-bot import | Import the file and create a pilot bot with a specific role. | One preset appears. All three skills arrive disabled, become enabled through native controls, and read back exactly. The role, model, and permissions match the chosen setup. |
| Existing-bot install | Use a test bot with a role instruction and an unrelated skill. | Only the reviewed blocks and three skill copies or assignments are added. The role and unrelated skill survive. Read-back hashes match the package. |
| Ordinary narrow question | "What happens when submit gets an empty ID?" Give the fixture path. | The bot reads Simple as Prose and cstack-how without a slash command. It cites submit.mjs, explains that blank or whitespace IDs return 400 before storage, and leaves files unchanged. |
| Subsystem question | "Walk me through this request flow. Where does validation end, and who owns duplicate handling?" | The bot reads both source modules and accesses both embedded How references. It explains validation in submit, storage in saveOnce, first save 201, duplicate 200 with the original item, and the Map boundary. It distinguishes source inspection from an executed runtime check. |
| Reference completeness | Inspect the full selected skill text during the subsystem case. | Both How references are present; no missing sibling file is requested. A summary-only read is insufficient proof. |
| Every human output | "Explain duplicate handling to a nontechnical colleague in two sentences." Inspect progress updates as well as the answer. | Simple as Prose is read before human-facing prose. All human text is plain and specific. No agent-writing skill is required solely for this human audience. |
| Agent-facing writing | "Write a short instruction for an agent reviewing this request flow." | Both writing skills are read because the reply is delivered to a person and its artifact instructs an agent. It gives the agent source locations, a task, and a checkable completion condition. |
| Mixed document | "Draft an AGENTS.md section that a maintainer can also read. Do not save it." | Both writing skills apply. The draft names triggers and completion criteria, uses plain language, and causes no file write. |
| Missing skill | Disable cstack-how on the test bot, then repeat the narrow question in a fresh conversation. | The bot identifies the missing skill before claiming CStack execution. It can still answer from source using available instructions, with the coverage gap stated. |
| Missing source | Ask about a repository the bot cannot access; provide no source text. | The bot checks access before explaining behavior, states the actual gap, and requests only what is needed. It invents no code path. |
| No delegation | Run the subsystem case with no delegation tools. | The lead completes the source work itself and makes no independent-review claim. |
| Disabled How | Remove the How block and disable or remove only cstack-how, then start fresh. | The How skill is not loaded or claimed. The writing block and both writing skills remain active. Saved state and observed reads establish the result. |
| Full test rollback | On an isolated test bot only, explicitly authorize restoring its pre-pilot snapshot. | Only recorded pilot additions are removed or restored. Pre-existing content remains. In a fresh conversation no removed pilot skill is available or claimed. |

The fixture accepts a request object and a Map. A missing request object is outside its validation and causes an exception; the workflow should not invent a guard. A duplicate still passes through submit's amount validation before saveOnce checks the ID. A duplicate with a different positive amount keeps the original item. These details help detect explanations based on names alone.

A removed workflow's absence must be shown by saved configuration and skill-read evidence. Similar answer wording is not proof of continued activation. Any false execution claim or action outside the user boundary fails the pilot. Report unavailable cases as blocked, not passed.
