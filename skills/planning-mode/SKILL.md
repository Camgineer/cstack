---
name: planning-mode
description: Plan new work and resume planning from natural-language or voice requests. Default to planning when intent is uncertain, produce a reviewed Ready handoff, and stop before execution.
---

# Planning mode

Planning Mode turns an uncertain request into an exact, independently reviewed Ready handoff. It keeps the tracker canonical, carries settled decisions forward, and stops before execution.

## Authority

Planning Mode never creates, reuses, updates, or completes a native goal. It does not create an automation, heartbeat, persistent agent thread, or execution task. It may inspect evidence, use read-only helpers, update planning records within existing write authority, and run an explicitly authorized disposable prototype.

Planning Mode does not install or configure products, edit product code or assets, reorganize operational chats, or dispatch implementation. Planning assent such as `yes`, `agreed`, `let's do it`, or `continue` settles a planning choice only. Execution requires a later user message that names the exact Ready revision and endpoint.

Every future implementation handoff targets a different user-visible task. Prefer an existing dedicated Builder task. If none exists, prepare `new-task` as the destination and record that its creation awaits later explicit execution authorization. A subagent inside the planning task does not satisfy this separation.

Current user decisions outrank historical notes. Tracker records outrank chat reconstruction. Missing evidence blocks only the decisions that depend on it. Continue independent planning branches while another branch waits.

Before any final response, reconcile every included branch and take the next permitted planning step whenever one remains. A saved answer, checkpoint, research result, or Ready slice does not end larger included scope. Keep commentary updates going while work continues. Yield only for the sole remaining material user question, a real access, tool, or runtime limit, explicit pause or cancellation, or independently reviewed Ready coverage for the requested included scope. At a non-completion yield, state the exact question or blocker and the retained next action.

Answer simple questions and small non-implementation requests directly. Use this workflow for material work. If the requested included scope already has independently reviewed Ready coverage, verify its exact receipts, present the handoff, and stop.

## Required references

Read a reference before its named operation. Resolve each path relative to this file.

- Before recovering state, changing state, resuming work, or auditing map completion, read [references/lifecycle.md](references/lifecycle.md).
- Before creating or changing a tracker record, snapshot, manifest, or receipt, read [references/records.md](references/records.md).
- Before research, grilling, prototyping, visual work, or artifact handling, read [references/evidence.md](references/evidence.md).
- Before readiness review, executor qualification, or presenting a handoff, read [references/handoff.md](references/handoff.md).
- Before defining, running, or evaluating proof, read [references/verification.md](references/verification.md).

Each reference is mandatory for its operation. If a required file is missing or unreadable, stop that operation before producing its output or mutation. Report the exact path, what could not proceed, and the action needed to restore the file. Continue unrelated work when its own inputs remain valid.

## Planning sequence

1. **Recover the tracker.** Read live tracker membership, relationships, bodies, relevant comments, revisions, checkpoints, and open review findings. Resume at the earliest unmet guard. Verify the planning destination, access, visibility, and existing write authority before a write.
2. **Inspect evidence and standards.** Read applicable global and repository instructions, primary evidence, affected files, and current model policy before selecting any worker or reviewer. Record facts, user decisions, proposals, assumptions, conflicts, and missing evidence separately.
3. **Map and grill.** Preserve a small decision tree in the current record. Promote that same map when independent branches, independent Ready slices, or partial invalidation appear. Ask the full currently answerable decision frontier with evidence, viable choices, tradeoffs, and a recommendation. Wait for the human on material choices. Recompute the frontier after each answer.
4. **Synthesize records.** Create grouped decision records when questions become specifiable and implementation records when coherent scope exists. Keep one owner for each fact. Record complete conditional design, exclusions, dependencies, impact links, artifacts, authority, failure and recovery, and acceptance-to-proof mappings.
5. **Review the exact revision.** Obtain the required independent readiness review against the original request, current decisions, primary evidence, scope, access, ownership, dependencies, recovery, and proof. Resolve routine findings within scope. Return material choices to the user. Recheck changed material.
6. **Present Ready accurately.** Mark only an exact independently passed revision Ready. Present its ticket, revision, snapshot and manifest hashes, review receipt, proof recipe, endpoint, and unresolved excluded work. A Ready slice may be prepared for later authorized execution while other included branches continue. Claim the full map Ready and stop only when every included branch passes the completion audit.

Planning records may describe a later execution receipt. They never constitute dispatch. A Ready label never grants execution, merge, deployment, publication, paid generation, or another external effect.

## Composition

Use installed methods as bounded methods under the current request and tracker decisions. Read each method when its trigger in [references/evidence.md](references/evidence.md) or [references/handoff.md](references/handoff.md) fires. Preserve vendor files and invocation metadata. If automatic invocation is unavailable, apply the method through its supported instructions without claiming hook or skill activation.

This package defines guidance and records. It adds no hook, permission layer, model registry, tracker service, or runtime lock.
