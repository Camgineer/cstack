# Planning records

Read this file before any tracker record, snapshot, manifest, or receipt write. Use existing tracker IDs and conventions. Keep the issue body current and readable. Comments preserve history.

## Map record

```markdown
## Outcome and destination
<requested result and canonical tracker>

## Context and exclusions
<domain, current facts, approved exclusions>

## Included work
- Decision: <native child link, owner, state>
- Implementation: <native child link, owner, state>

## Decisions and fog
- Settled: <decision link and current answer>
- Open: <decision link and answerable question>
- Unspecifiable: <unknown, missing evidence, affected branches>

## Relationships
- Blocks: <native relation and reason>
- Impact: <source -> reachable dependents>

## Checkpoint
<state block, current frontier, next permitted action>

## Completion
<coverage by included branch and exact receipt, or why incomplete>
```

## Decision record

```markdown
## Question
<one material choice>

## State
<current state, previous state, reason, blocker, checkpoint, revision>

## Current answer
<approved answer, source, date or revision>

## Evidence
- VERIFIED: <primary source or direct observation and scope>
- PROVISIONAL: <inference and missing check>
- CONFLICTING: <sources and affected decision>

## Choice
- Recommendation: <choice and evidence-backed reason>
- Viable alternative: <when it wins and cost>

## Open conditions
<assumptions and the observation that would reopen the decision>

## History and impact
<approval, rejection, correction, or supersession reason and source>
<artifacts and explicit impact links>

## Next action
<one permitted planning action>
```

Do not ask the user for observable facts the lead can retrieve. Do not list invented or nonviable alternatives.

## Implementation record

```markdown
## Outcome
<observable behavior for the user or operator>

## Scope
<approved work and explicit exclusions>

## Sources
<decision links, standards, evidence, approved examples>

## Design
<domain terms, responsibilities, composition, interfaces, flows, data and configuration>
<file operations, migration, privacy, security, rights, cost, and creative references when material>
<concise inapplicable reason for each material category that does not apply>

## Ownership and dependencies
<exact files and runtime resources, owner, blockers, impact edges>

## Acceptance and proof
<proof entry for every acceptance ID>

## Failure and recovery
<partial effects, retry rule, cleanup owner, restoration evidence>

## Delivery authority
<approved endpoint, forbidden effects, later authority still required>

## Execution destination
destination_mode: <dedicated-builder | new-task>
destination_task_identity: <opaque task identity when present, otherwise null>
recovered_destination_checkpoint: <last observed checkpoint or null>
creation_authority_state: <existing destination | awaits later explicit execution authorization>
selected_executor_playbook: <resolved entrypoint, playbook, and runtime contract>
duplicate_dispatch_check: <existing task, checkpoint, acknowledgement, and dispatch evidence inspected>
planning_readiness_owner: <independent owner of the exact Ready verdict>
implementation_review_owner: <fresh independent reviewer owned by the destination task>

## Revision and review
<body hash, manifest hash, independent receipt, focused rechecks>

## Checkpoint
<state block and next permitted action>
```

A small implementation record owns its specification. Create a shared specification only for a contract that several implementation records truly share.

## Proof entry

```yaml
acceptance_id: A1
behavior: <observable contract>
controlled_input: <fixture or request>
failure_case: <material failure>
expected_outcome: <independent contract result>
actual_boundary: <CLI, API, UI, file, runtime>
interaction: <exact command or supported action>
artifact: <log, screenshot, record, hash, trace>
pass_predicate: <binary observable condition>
status: NOT_RUN
result: null
revision: <candidate hash or commit>
route:
  requested_model: <value or unknown>
  requested_effort: <value or unknown>
  observed_model: <value or unknown>
  observed_effort: <value or unknown>
  provider: <value or unknown>
  failover: <value or unknown>
```

Use `INAPPLICABLE` only with a concrete contract reason. Never turn a skipped or unavailable check into a pass.

## Review receipt

```yaml
snapshot_url: <exact immutable-enough retained comment or file>
ticket_body_sha256: <64 hex characters>
manifest_sha256: <64 hex characters>
scope_revision: <ticket and source revision>
requested_role: <policy role>
requested_model: <value or unknown>
requested_effort: <value or unknown>
observed_model: <value or unknown>
observed_effort: <value or unknown>
provider: <value or unknown>
failover: <value or unknown>
verdict: READY | FINDINGS
findings:
  - severity: <material | technical>
    evidence: <primary evidence>
    autonomy_block: <why the lead cannot settle it, or null>
    smallest_correction: <bounded correction>
focused_rechecks: []
```

Unknown runtime fields stay `unknown`. A configured route is not an observed receipt.

## Handoff receipt

```yaml
ticket: <exact ticket and revision>
destination_mode: <dedicated-builder | new-task>
destination_task_identity: <opaque task identity when present, otherwise null>
executor: <destination task owner>
selected_executor_playbook: <resolved entrypoint, playbook, runtime contract>
recovered_destination_checkpoint: <last observed checkpoint or null>
creation_authority_state: <existing destination | awaits later explicit execution authorization>
duplicate_dispatch_check: <existing task, checkpoint, acknowledgement, and dispatch evidence inspected>
planning_readiness_owner: <independent owner of the exact Ready verdict>
implementation_review_owner: <fresh independent reviewer owned by the destination task>
original_request: <verbatim or durable link>
approved_scope: <included work>
owned_files_and_runtime: <exact paths and resources>
forbidden_files_and_effects: <boundaries>
dependencies: []
endpoint: <authorized delivery endpoint>
proof_and_recovery: <acceptance map and rollback contract>
independent_review: <exact receipt>
next_permitted_action: <later explicit execution handoff or continued planning>
```

This prepared receipt is not a dispatch receipt.

## Later execution receipt template

Planning may prepare this schema for a later authorized executor:

```yaml
authority: <exact user message and Ready revision>
destination_mode: <dedicated-builder | new-task>
destination_task_identity: <opaque task identity>
executor_task: <destination task owner>
selected_executor_playbook: <resolved entrypoint, playbook, runtime contract>
requested_route: <role, model, effort>
observed_route: <model, effort, provider, failover, or unknown>
ownership: <files and runtime resources>
forbidden_resources: <paths and effects>
recovered_destination_checkpoint: <last observed checkpoint or null>
creation_authority_state: <authority that permitted reuse or creation>
duplicate_dispatch_check: <evidence inspected before dispatch>
planning_readiness_owner: <owner of the exact Ready verdict>
implementation_review_owner: <fresh independent implementation reviewer>
acknowledgement: <observed acknowledgement or unknown>
checkpoint: <last verified side effect>
cleanup_owner: <identity>
result: <complete | interrupted | failed>
evidence: []
```

Preparing the schema grants no dispatch authority.

## Safe tracker writes

Before each write, re-read the destination and the proposed content. Use a body file or structured payload for multiline text. The lead serializes its own authoritative writes. If the outcome is uncertain, search for the intended operation before retrying. These checks reduce collisions but do not provide compare-and-swap protection.

After every write, read back the saved content and rendered structure. Keep the receipt. Reconcile native membership and blocked-by relations with readable links. Do not install labels, configuration, or another ID service. A Ready label is status, not execution permission.

## Exact review snapshots

Fetch the current ticket body. Replace CRLF and CR with LF, encode UTF-8, and retain every other character, including the trailing newline. Record byte count and SHA-256 outside the body fence.

Choose a fence length with this rule:

```text
fence_backticks = max(3, longest_backtick_run_in_content + 1)
```

The opening and closing fences use the same run. The fence must always contain at least three backticks and must exceed every backtick run in the enclosed content. For example, content containing a triple-backtick block needs four backticks:

````markdown
```text
literal content
```
````

Use this envelope:

```text
## Review snapshot: revision <ticket-body-sha256>
Ticket: <exact URL>
Normalization: UTF-8; CRLF/CR replaced by LF; all other bytes and trailing newline retained.
Body bytes: <count>
Body SHA-256: <hash>
Manifest SHA-256: <hash>
Status: submitted for independent review, not a verdict or execution authority.

### Exact ticket body
<computed fence><language>
<exact normalized body>
<computed fence>

### Exact source manifest
<computed fence>json
<exact UTF-8/LF manifest>
<computed fence>
```

The manifest lists every required decision and artifact URL or path, revision or hash, approval state, and access requirement. Hash the exact manifest bytes separately. Mark envelope fields so a body edit cannot hide as metadata. Exclude later review receipts and status projections from the reviewed payload. Keep design, authority, and proof in it.

Comments are mutable. Preserve superseded snapshots. Before Ready and handoff, compare the retained body, current reviewed payload, and manifest with the receipt. Record every mismatch and re-review material changes. A URL and timestamp alone do not identify a revision. Do not claim resistance to malicious history changes.
