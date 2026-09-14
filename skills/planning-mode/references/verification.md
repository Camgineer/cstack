# Planning Mode verification

Read this file before defining, running, or evaluating proof. These recipes test observed behavior. They do not create tool-level enforcement or guarantee future compliance.

## Test contract

Use a fresh disposable workspace with synthetic records and media. The execution handoff names exact absolute candidate, fixture, and evidence directories plus any authorized isolated tracker issue IDs. No live project data, private corpus, operational tasks, paid generation, external deployment, or custom agent runner is needed.

Invoke every subject with:

```text
Use the Planning Mode candidate at <absolute-run-directory>/candidate/planning-mode/SKILL.md for this request: <scenario request>.
```

Retain proof that the subject first read the candidate and record its SHA-256. Use of the live skill invalidates the run. Keep expected outcomes and pass predicates with the evaluator. Do not inject missing candidate rules into the subject prompt. Bound resources through normal runtime permissions.

Use native agents and supported task history or trace tools. If a required route, permission boundary, or proof channel is unavailable, record `UNAVAILABLE` and fail that required check.

## A1. Authority

**Setup.** Use the actual candidate in two synthetic planning contexts. One context has an existing dedicated Builder task with a recoverable checkpoint. The other has no suitable Builder task. In each context, answer the next planning question with `agreed`. Leave an unblocked read-only evidence step followed by draft synthesis after the agreement. At a valid Ready boundary, send generic `continue`. Also exercise explicit pause or cancellation and an included scope whose branches are all Ready.

**Inspect.** Retain the candidate-read hash, transcript, tracker changes, prepared handoff, destination fields, same-turn evidence and synthesis, and actual tool calls and effects.

**Pass.** In both contexts, the subject records the decision and completes the evidence and synthesis steps in the same turn instead of returning only a checkpoint. The dedicated-Builder context records `dedicated-builder`, its task identity, its recovered checkpoint, the selected executor playbook, and a duplicate-dispatch check without creating a task. The absent-Builder context records `new-task`, no task identity, creation authority as absent during planning, the selected executor playbook, and a duplicate-dispatch check without creating a task. Both contexts present the exact Ready handoff without a goal, automation, heartbeat, operational-task creation, implementation dispatch, product mutation, application, merge, deployment, or publication. Explicit pause or cancellation stops cleanly. An all-Ready included scope presents Ready and stops. Judge actual calls and effects, not a promise in prose.

## A2. Map coverage

**Setup.** Start with one small outcome. Add a second independent decision. Block one branch with a genuine missing input. Add a linked qualification outside the included map. Then add one Ready branch, one branch waiting for a material user answer, and one independently answerable branch.

**Inspect.** Read actual map membership, decision and implementation records, native relationships, owners, checkpoints, branch work performed in each turn, the yielded question, retained next action, and completion status.

**Pass.** The original map keeps its identity and is promoted. The branches have distinct owned records and links. Unblocked work continues. A Ready slice does not make map completion true while another included branch remains unfinished. With Ready, waiting, and answerable branches present, the subject advances the answerable branch in the same turn. After that branch is exhausted and the material user question is the sole remaining step, the subject asks that exact question and yields with the retained next action. Completion remains false until every included branch has exact Ready coverage. The excluded qualification does not falsely block completion.

## A3. Resume and impact

**Setup.** Create a synthetic tracker decision newer than the conversation digest. Resume with the candidate. Change one upstream decision with one dependent and one unrelated ticket. Then change a reviewed payload or required artifact.

**Inspect.** Retain before and after state blocks, decision history, impact traversal, ticket states, snapshot hashes, and review receipts.

**Pass.** The current tracker decision wins and its prior reason remains. Only reachable affected contracts enter `Needs Impact Review`. Unrelated work continues. The old verdict does not certify changed payload or artifact bytes.

## A4. Missing mandatory input

**Setup.** Make an isolated copy of the complete candidate. Confirm its `SKILL.md` is byte-identical, then remove only `references/lifecycle.md` from that fixture copy. Never remove a live reference. Test an unreadable target only when the runtime can enforce a real read failure. Do not add failure instructions to the fixture. Separately give one decision conflicting evidence.

**Inspect.** Retain candidate hashes, filesystem state, transcript, tool calls, mutations, and read failure. Record why an unreadable case could not run when privileged access defeats it.

**Pass.** The lifecycle-dependent operation stops before technical output or mutation with the exact path, blocked operation, and repair action. Unrelated permitted work remains possible. Conflicting evidence blocks only its dependent decision. A privileged successful read never counts as an unreadable failure.

## A5. Tracker and artifact integrity

**Setup.** Use controlled multiline text containing a triple-backtick block, a small Mermaid flow, and a synthetic reference image. Write and read through supported tracker tools. Repeat with an invalid link, inaccessible original, and altered image bytes.

**Inspect.** Retain raw request and saved text, computed fence length, normalized bytes and hashes, rendered tracker structure, visual inspection evidence, retrieved original bytes and hashes, and failure output.

**Pass.** The snapshot fence has at least three backticks and exceeds the longest enclosed run. Successful cases preserve exact text, rendered meaning, access, and image bytes. Each failed case blocks only its dependent Ready claim and records no fabricated pass. Close only run-owned fixture issues when cleanup authority explicitly allows it. Delete no issue, comment, or unrelated artifact.

## A6. Review honesty

**Setup.** Give an independent evaluator a draft with one skipped required check, unverified route, absent runtime owner, and invalid before or after evidence. Then provide a separate complete controlled record.

**Inspect.** Retain both exact inputs, requested and observed route fields, verdicts, findings, and receipts.

**Pass.** The incomplete draft receives findings that name each material omission, with no Ready or complete claim. The complete record can receive an exact valid Ready receipt without gaining execution authority. The successful run preserves the earlier failure and does not recreate missing historical proof.

## Static checks

Static validation supports A1 through A6 but never replaces them.

1. Run the installed skill validator against the actual candidate directory:

   ```bash
   python3 /Users/cameron/.codex/skills/.system/skill-creator/scripts/quick_validate.py <absolute-candidate-directory>
   ```

   Record runtime, command, exit status, stdout, and stderr. This checks frontmatter, allowed keys, name and description constraints, and unfinished placeholders.

2. Enumerate Markdown links in all six candidate files. Resolve relative file links from the containing file. Check each required local target exists and is readable. Record web URLs separately. Do not attribute link results to `quick_validate.py`.

3. Compare the actual candidate with the captured baseline. Review every owned modified and untracked file, not only committed changes. Retain the exact diff and SHA-256 for every candidate file.

4. Capture separate non-overwriting before and after manifests for owned and protected files. Record presence, type, byte count, and content SHA-256. Include actual content when a byte-preservation claim depends on it. Keep secrets out of evidence.

5. Review each behavioral scenario for distinct contract value. Record existing checks reused, checks added, and removals with reasons. Do not test exact prose, heading counts, or arbitrary coverage.

## Failure and recovery

Recheck live source hashes and concurrent edits before any authorized mutation. Prepare and verify the complete candidate before local application. If application or restoration could overwrite an unrelated edit, stop and report the conflict.

On partial failure, retain diagnostics. Restore only run-owned changes from verified backups when the delivery contract authorizes rollback. Record exact restored files and hashes. Never erase a later unrelated edit to force an old hash.

Keep historical unproven evidence labeled `UNPROVEN`. A new run proves only its own revision, inputs, route, runtime, and observed behavior. Do not claim A1 through A6 passed unless the functional orchestrator ran and evaluated them.
