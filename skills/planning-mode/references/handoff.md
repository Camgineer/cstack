# Readiness review and handoff

Read this file before readiness review, executor qualification, or presenting Ready.

## Review input

Give the reviewer the exact original request, current approved decisions, primary evidence, ticket body snapshot, source manifest, applicable standards, artifacts, acceptance-to-proof map, and delivery authority. The reviewer inspects these before implementer conclusions.

Keep two review roles distinct:

- Routine per-ticket review checks the implementation contract through the alternate-family or other route required by current policy.
- The final phase-one readiness audit checks the complete map through the current global readiness route.

Resolve both roles from the current `/Users/cameron/.codex/pstack-models.md`. Do not hardcode model names in this package. Record requested and observed role, model, effort, provider, and failover when the runtime exposes them. Unknown fields stay unknown. A configured route does not prove an observed route or family diversity.

## Verdict

The independent reviewer returns one result for the exact revision:

- `READY` means the reviewer found no unresolved material gap in behavior, scope, access, ownership, dependencies, failure and recovery, or proof.
- `FINDINGS` lists severity, primary evidence, why autonomy is blocked when applicable, and the smallest correction.

The lead resolves routine technical findings inside the approved scope. Return product, design, authority, access, or acceptance choices to the user. Obtain a focused recheck for changed material. Missing access, route, runtime, or proof remains a failed gate. A new successful run does not erase an earlier failure.

## Executor qualification

Select a different user-visible task for every future implementation handoff. Prefer an existing dedicated Builder task. If none exists, prepare a `new-task` destination whose creation waits for later explicit execution authorization. A subagent inside the planning task does not satisfy this separation. Destination identity is opaque and does not depend on a memory product.

Before reuse or later creation, inspect the destination task, its recovered checkpoint, acknowledgement, and prior dispatch evidence. Record the destination mode, identity when present, recovered checkpoint, creation-authority state, selected executor playbook, and duplicate-dispatch check. Keep the planning-readiness owner separate from the destination task's fresh independent implementation-review owner. The destination task owns implementation, verification, progress, implementation review, and completion evidence.

For Poteto execution, read these current installed files before Ready:

- [Poteto entrypoint](/Users/cameron/.codex/plugins/cache/pstack-for-codex-local/pstack-for-codex/0.1.0/skills/poteto-mode/SKILL.md)
- [Poteto runtime contract](/Users/cameron/.codex/plugins/cache/pstack-for-codex-local/pstack-for-codex/0.1.0/skills/poteto-mode/references/codex-agent-runtime.md)
- [Authoring a skill playbook](/Users/cameron/.codex/plugins/cache/pstack-for-codex-local/pstack-for-codex/0.1.0/skills/poteto-mode/playbooks/authoring-a-skill.md) when the work creates or edits a skill
- [Portable Poteto persona](/Users/cameron/.codex/plugins/cache/pstack-for-codex-local/pstack-for-codex/0.1.0/skills/poteto-mode/references/poteto-agent-prompt.md) when the custom profile is unavailable

Read any method reached by that playbook, including current skill authoring and agent-writing guidance. Record each mandatory step with its evidence or explicit approved disposition. Current user authority overrides upstream PR or activation defaults. An unresolved conflict keeps the route unqualified.

## Runtime ownership and recovery

The handoff names owned checkout and files plus every relevant port, process, service, container, database, browser profile, editor or engine session, and user-data directory. Use existing supported reservation and cooperative checkpoint mechanisms. Serialize shared mutable resources. Do not add an ownership service.

The executor owns only named resources. Cleanup removes only run-owned resources. After interruption, inspect actual files, processes, external effects, and checkpoints before one bounded retry. A missing acknowledgement does not prove that no work occurred.

## Ready handoff

Before preparing or presenting a Ready slice, verify:

- The ticket and manifest hashes match the current reviewed payload and artifacts.
- The independent receipt covers the slice's exact current revision.
- The destination mode, identity when present, recovered checkpoint, creation-authority state, selected executor playbook, and duplicate-dispatch check are explicit.
- The planning-readiness owner and the implementation-review owner are separate and explicit.
- The executor, files, runtime, dependencies, endpoint, forbidden effects, proof, and recovery are explicit.
- Historical failures and excluded work remain visible with their true status.

Present the exact Ready ticket and revision, evidence, review receipt, proof recipe, authorized endpoint, and unresolved excluded work. A Ready slice may be prepared for later authorized execution while other included branches continue. Reconcile the map and take the next permitted planning step after presenting that slice. Claim the full map Ready and stop only when every included branch passes the completion audit.

For a Ready slice, the later execution action is a distinct user message that names the exact revision and endpoint. Planning Mode does not create a goal, schedule work, create an operational task, dispatch an executor, mutate the target, apply files, merge, deploy, publish, or pay for a service.
