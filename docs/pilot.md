# CStack pilot

The repository package is prepared for review. No preset or skill has been installed on a bot.

## Scope

The pilot includes pstack's How workflow and the two writing skills the user selected. Simple as Prose applies to every human-facing reply and artifact. Writing for Agents applies whenever text is written for an agent. Both apply when the audiences overlap.

The How workflow tests automatic selection, full reference access, source inspection, and a supported explanation. Its scope is the standalone upstream How skill, not the full poteto-mode investigation playbook or the remaining pstack workflows.

## Work record

- Reviewed the existing drafts and recovered the prior integration findings.
- Recovered both writing skills and their licenses from the closed PR commits.
- Inspected OpenMausBot's preset documentation and package parser at commit `033fd71fdc1b61a094c77942abd6f8efc93b52c0`.
- Prepared the activation block and adapted How instructions, including both reference files.
- Generated the preset and identical standalone skill files with all references and license notices embedded.
- Passed six packaging tests and the pinned native parser check. Verified the small evaluation fixture's expected behavior.
- Added setup, update, removal, and live acceptance procedures. Checked the documentation's local links.
- Live installation and behavioral evaluation remain outside this repository preparation step.

## Upstream coverage

| Upstream How element | Pilot implementation |
|---|---|
| Assess ambiguity and complexity; prefer the simple path when unsure | cstack-how step 1 |
| Explore a narrow question in one pass | Steps 1 and 2 |
| Split complex questions into two to four distinct angles | Steps 1 and 2 |
| Trace entry, calls, abstractions, boundaries, and non-obvious behavior | Embedded exploration reference |
| Record components, flow, files read, boundaries, surprises, and gaps | Embedded exploration reference |
| Reconcile explorer findings and check contradictory claims in source | Step 3 and embedded explanation reference |
| Overview, concepts, flow, file map, gotchas, and useful diagrams | Embedded explanation reference |
| Preserve the explainer's substance and uncertainty when presenting | Steps 3 and 4 |

The execution adapter replaces mandatory Cursor Task dispatch and fixed model defaults with lead execution and authorized optional delegation. Named OpenMausBot teammates use the native handoff lifecycle. A missing delegation tool leaves the source work with the lead. This is an explicit host adaptation; it does not claim identical multi-model behavior.

The pilot adds early access checks, verifiable completion criteria, and the user's audience-based writing rules. The How source and both reference prompts are fully accounted for. The larger investigation playbook, poteto-mode principles index, and other workflows remain unported.

## Review artifacts

- [Preset package](../dist/openmausbot/cstack-pilot-0.1.0.openmaus.json).
- [Activation blocks](../openmausbot/activation.md).
- [Package definition](../openmausbot/pilot.json) and [build hashes](../dist/openmausbot/manifest.json).
- [Installation and lifecycle](installation.md).
- [Static verification](evals/pilot-static.md) and [pending live cases](evals/pilot-live.md).

## Confirmed later addition

The user wants every file edit shown as an actual diff with a clickable link to the edited file. This requirement is recorded for later CStack integration. It is being followed in this task's edit reports; it has not been added to the pilot's installed workflow.
