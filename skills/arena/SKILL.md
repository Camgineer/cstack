---
name: arena
description: Spawn N parallel candidates at the same task, pick a base, graft the strongest parts of the losers into it. Use for arena, 'arena this', 'throw it in the arena', or when one attempt at a non-trivial artifact would lock in the wrong shape.
---

Read [the runtime contract](../cstack-mode/references/runtime.md) before executing this workflow.


# Arena

Fan out N parallel attempts at the same task. Read every candidate end to end. Pick the strongest as the base. Graft the best ideas from the others into it. Verify the synthesized result.

## Start

Open a todolist with one entry per phase before launching anything.

1. Frame
2. Fan out
3. Cross-judge
4. Pick
5. Graft
6. Verify

## Phase A: Frame

The N candidates will receive the same prompt, so the prompt is the contract.

1. State the artifact each candidate is producing.
2. Derive the rubric. State what success looks like for *this* task, then turn it into 3-6 concrete gradeable criteria. The rubric is the picker's tool in Phase D. Candidates only see the task.
3. Resolve the `arena runners` panel through the `worker` seat per **Model roles** in the runtime contract. On hosts with `Models:` routing, its fallback is the existing `build` role. An `architect runners` panel keeps its existing no-role fallback unless the person names `worker`. Preserve the three-seat default and resolve any required diversity before launching. `auto` or `inherit-parent` preserves a seat but cannot establish model diversity. For rejected entries, report the missing seat and obtain a supported selection rather than guessing a family fallback. Spawn more when the arena covers multiple design directions. Same model N times is appropriate when the work is generation-bound rather than judgment-sensitive.
4. Assign output paths. Each candidate writes scratch to `tmp/<task>/candidate-<n>/` inside the project, per [Scratch files](../cstack-mode/SKILL.md#scratch-files). Use a separate git worktree for each candidate that edits production source, per the **separate-before-serializing-shared-state** principle skill.

## Phase B: Fan out

Delegate all N candidates to the `worker` seat in one message using native concurrency. Carry the workflow's candidate prompt in each brief, with the task, the path to the shared grounding, its own output path, and instructions to produce both the artifact and a short rationale. Follow [Seat delivery](../cstack-mode/references/runtime.md#seat-delivery) in the runtime contract.

Each rationale names the alternatives the candidate considered and what it rejected.

If a candidate fails to produce output, proceed with N-1 and note the dropout in the synthesis record.

## Phase C: Cross-judge

After all Phase B candidates complete, resolve the cross-judge through the `reviewer` seat, with its existing `review` fallback on hosts with `Models:` routing, per **Model roles** in the runtime contract. With no `reviewer` or `review` line on those hosts, prefer a different model family from the parent's when the host exposes that identity. Delegate one read-only judge to the `reviewer` seat. Carry the workflow's judge prompt, the rubric, and the candidates by path label in its brief. Follow [Seat delivery](../cstack-mode/references/runtime.md#seat-delivery) in the runtime contract. The judge scores each criterion and recommends a base with rationale, in parallel with the parent's Phase D reading. Do not spawn it while candidates are writing. Report when cross-family independence cannot be established.

## Phase D: Pick a base

Read every candidate end to end before picking.

Score each candidate against the rubric criterion by criterion, not on holistic feel. Compare against the cross-judge. Agreement on the base confirms the pick. Disagreement means one of you is biased or the rubric was ambiguous. Read both rationales before deciding.

Pick the base on which candidate a future maintainer can extend most easily without breaking invariants. Prefer the cleaner boundary or smaller API when two feel tied, per the Laziness Protocol.

Record the pick and the reason in a short synthesis note alongside the base artifact, including the cross-judge's verdict.

## Phase E: Graft

Walk each losing candidate once more and identify what is worth porting into the base. The signal is usually one or two things per candidate, not most of it.

Fold each graft in by hand, per the **redesign-from-first-principles** principle skill. Don't paste mechanically. The result has to remain coherent under one mental model.

Record what was grafted, from which candidate, and what was rejected and why.

When N candidates converge on the same shape, that is a strong agreement signal. Note the convergence in the record and ship the consensus shape. No graft is needed. When N candidates wildly diverge, Phase A was under-specified. Reframe and re-run rather than averaging the divergence.

## Phase F: Verify

The synthesized artifact has to hold up under the same scrutiny as any other output, per the **prove-it-works** principle skill.

If verification surfaces a problem the arena did not catch, either Phase A was wrong (re-frame and re-run) or one candidate caught it and you missed the graft (go back to Phase E). Don't paper over.

## Outputs

One synthesized artifact. One short synthesis note alongside, naming the base, the grafts (with source candidate), the rejections, the dropouts if any, and the verification result.
