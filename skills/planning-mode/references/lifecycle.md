# Planning lifecycle

Read this file before state recovery, transition, resume, impact review, or map completion audit.

## State record

Every map, decision, and implementation record carries this state block:

```yaml
current_state: Mapping
previous_state: null
reason: Initial outcome and destination need mapping.
blocker: null
dependencies: []
last_accepted_checkpoint: null
evidence: []
next_permitted_action: Record included branches and unresolved questions.
revision: tracker-body-sha256-or-native-revision
```

Use exactly six states: `Mapping`, `Specifying`, `Blocked`, `Readiness Review`, `Ready`, and `Needs Impact Review`. Planning has no execution state.

## Legal transitions

| From | To | Guard and recorded result |
| --- | --- | --- |
| Mapping | Specifying | The included map, branches, dependencies, exclusions, and unresolved questions are recorded. |
| Specifying | Readiness Review | Approved design, evidence, authority, dependencies, acceptance, and proof are complete. |
| Readiness Review | Ready | An independent reviewer passed the exact revision. |
| Readiness Review | Specifying | A required finding changes or completes the design or proof. |
| Mapping or Specifying | Blocked | A named missing input prevents that state from completing. Preserve the previous state. |
| Blocked | recorded previous state | The recorded blocker cleared. Restore the previous state and recompute its next guard. |
| Ready | Needs Impact Review | An upstream decision, dependency, reviewed payload, or required artifact changed. |
| Needs Impact Review | Ready | The exact contract remains valid. Record the checked change and rationale. |
| Needs Impact Review | Mapping | Scope, included branches, or dependencies changed. |
| Needs Impact Review | Specifying | The map remains valid but design, evidence, authority, or proof changed. |

A review finding first returns `Readiness Review -> Specifying`. If the correction then needs unavailable input, record `Specifying -> Blocked` as a separate transition.

## Map growth and ownership

Keep small work in its existing record. Promote that record into the durable map when work gains independent decision branches, separate Ready slices, or a change can invalidate only part of the work. Preserve the map's identity and history.

Create grouped decision records as soon as their questions are specifiable. Create implementation records as soon as a coherent outcome and scope exist. Give each record a clear owner and checkpoint. Assignees and checkpoints are cooperative signals, not locks.

Use native sub-issues for map membership and native blocked-by relations for actual prerequisites. Mirror them with readable links in the record. Keep impact edges separate from blocking edges. Reconcile mismatches before Ready. A Ready contract may name an execution blocker while its design remains Ready.

## Resume

On resume:

1. Read live map membership, issue state, bodies, relevant comments, relationships, revision identifiers, and retained snapshots.
2. Inspect worker and reviewer checkpoints before retrying any assignment.
3. Compare the live tracker with the conversation digest. Keep the latest explicit tracker decision unless the current user has superseded it.
4. Find the earliest unmet transition guard across included branches.
5. Continue every independent branch whose guard can advance. Keep a pending human question pending.

Do not recreate state from chat when the tracker has a current explicit record. If the tracker is unavailable, label the checkpoint provisional and stop dependent writes.

## Impact review

When an upstream fact or decision changes, follow explicit impact edges through reachable dependents. Move affected Ready contracts to `Needs Impact Review`. Leave unrelated contracts in place and record why they remain valid.

For each affected contract, compare scope, design, evidence, authority, acceptance, proof, artifacts, and dependencies with its exact review receipt. Restore unchanged contracts to Ready with a reason. Revise changed contracts and obtain a focused recheck. Record that external execution for affected contracts must pause. Planning Mode does not send that operational command.

## Before any final response

Reconcile every included branch and take the next permitted planning step whenever one remains. A saved answer, checkpoint, research result, or Ready slice does not end larger included scope. Keep commentary updates going while work continues. Yield only when one of these conditions holds:

- A material user question is the sole remaining step.
- A real access, tool, or runtime limit prevents further permitted progress.
- The user explicitly pauses or cancels.
- The requested included scope has independently reviewed Ready coverage.

At a non-completion yield, state the exact question or blocker and the retained next action. An independently reviewed Ready slice may be prepared for later authorized execution while other included branches continue. Only the completion audit supports a full-map completion claim.

## Completion audit

The map is planning-complete only when all checks pass:

- The requested destination and every included branch have implementation coverage.
- Exclusions and unspecifiable fog are explicit.
- Native membership, blocking relations, readable links, and impact edges agree.
- Every included branch has an exact independent Ready receipt for its current revision.
- No unresolved review finding or dependent missing input remains.
- Changed decisions and artifacts have a valid impact disposition.
- The completion receipt names the exact map revision and coverage.

Report planning Ready separately from worker completion, implementation acceptance, live application, merge, deployment, and first-real-use proof. Linked qualifications outside the included map do not block completion. Historical failed or unproven evidence remains visible and cannot become a pass through a new unrelated run.
