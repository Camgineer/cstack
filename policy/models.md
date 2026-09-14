# C-Stack model policy

Single source for Cameron's model choices across all PStack skills, playbooks, and modes, including Planning Mode, Poteto Mode, and future modes, in repositories and outside them. C-Stack owns this policy. Global AGENTS.md should only point at C-Stack. This is instruction policy, not an automatic router or upstream configuration schema. Vendor skills remain unchanged.

## Operating model

Sol Medium is the durable driver for phase one and phase two. It owns the user conversation, research integration, decisions, project record, coordination, implementation supervision, finding resolution, and final delivery.

Every material plan in Planning Mode must pass one independent Astra Medium readiness audit before it becomes Ready. Astra challenges the plan and returns concrete findings. Sol resolves them. Astra rechecks only the changed or disputed parts. Poteto Mode starts only after the plan can stand alone without hidden product decisions. Small requests that do not need material planning may bypass Planning Mode rather than weakening this exit gate.

Do not add a general Astra audit at the end of phase two. Use the required independent implementation review and repository verification gates.

## Role defaults

Use at most five distinct model identifiers, including fallbacks and panel members. Roles may share models. Reasoning efforts do not count as separate models.

| Work | Model | Reasoning | Boundary |
| --- | --- | --- | --- |
| Durable lead and orchestration | Sol | Medium | Own both phases, continuity, decisions, coordination, and delivery. |
| Planning, explanation, research synthesis, architecture, diagnosis, technical adjudication, and release coordination | Sol | Medium | General reasoning route. Product choices still belong to Cameron. |
| Final phase-one readiness audit | Astra | Medium | Independent one-time gate plus focused recheck. Do not rewrite the plan by default. |
| Artistic creation and judgment across 2D and 3D | Astra | Medium | Creative direction, image reasoning, generation direction and acceptance, Meshy, Blender, Godot scene art, geometry, rigs, animation, materials, lighting, composition, and renders. |
| Autonomous exploratory gameplay | Astra | Medium | Operate a qualified game-control bridge, explore behavior, recover from stuck states, and retain observations. This is not human playtesting. |
| Bounded implementation | Luna | Extra High | Well-specified work, including complete features, with contained impact, clear checks and no unresolved design decision. Route difficult debugging, complex interactions, migrations and other high-risk work to Grok even when the ticket is clear. |
| Standard and complex implementation or refactoring | Grok | High | Other code work within an approved contract, including test and verification-harness code. |
| Independent code-contract and security-diff validation | Sol | Medium | Inspect requirements, exact changes, defects, and proof independently. |
| Routine CLI/API operation and live proof | Grok | High | Operate the actual runtime and retain evidence. This includes authorized deployment or rollback mutation. |
| Routine browser or native UI operation and proof | Sol | Medium | Operate the interface and check agreed behavior. Creative visual acceptance remains Astra. |
| Alternate-family judgment | Gemini | High | Required independent critique from a family distinct from Astra and Sol. |
| Bounded extraction and code exploration | Luna | High | Read-only source-backed findings. Sol handles causal or architectural synthesis. |

Exact identifiers: Astra is `gpt-6-astra`; Sol is `gpt-5.6-sol`; Grok is `combo/grok-4.6`; Luna is `gpt-5.6-luna`; Gemini is `combo/gemini-3.8.flash`.

Use standard non-Fast service tiers. Keep Sol and Astra at Medium. Higher effort is not a standard retry path. A later qualification may change a role or effort, but a model label, file count, missed requirement, unavailable tool, or unused allowance does not justify escalation.

Choose for quality first and completed delivery speed second. Cost is tertiary. Public benchmarks and practitioner reports provide context, not routing policy.

## Artistic and gameplay boundaries

Astra owns artistic reasoning, tool direction, iteration, and acceptance. The selected image, video, 3D, or DCC tool produces the artifact. A deterministic file conversion or pinned-baseline pixel comparison does not become Astra work merely because the file is visual.

Autonomous exploratory gameplay checks functional paths, recovery, visual state, unexpected behavior, and long-running scenarios. Scripted gameplay regression routes through ordinary implementation and proof roles. Human players judge fun, feel, clarity, pacing, frustration, fairness, accessibility experience, and desirability. A synthetic player never proves representative human experience.

Real-time action play requires a qualified low-latency controller. Until then, use games that tolerate deliberation, input bursts, a virtual clock, or pause-while-thinking operation.

## Implementation and review routing

1. Sol Medium owns the Ready ticket and selects workers from the approved contract.
2. Use Luna Extra High when the Bounded implementation boundary holds. Use Grok High for all other non-art implementation.
3. When bounded implementation exceeds its boundary or a focused Luna repair leaves a substantive defect, preserve valid work and hand it to Grok.
4. A substantive Grok defect allows one focused Grok repair. If it remains, Sol diagnoses the mechanism and corrects the plan. A fresh Grok worker may implement the corrected contract. Changing model or effort does not reset retry limits.
5. A fresh Sol Medium reviewer checks the ticket, exact changes, worker adjustments, defects, and proof. The implementer never grades itself.
6. Resolve routine technical findings within the approved scope. Return material product, design, authority, access, or acceptance choices to Cameron.
7. Do not route hard code work to Astra as a generic rescue. Astra is reserved for the readiness, artistic, and exploratory-gameplay roles above.

## Proof channels

Roles state what an agent owns. Proof channels state how a claim is demonstrated. A model assignment never proves that a tool, runtime, or permission exists.

Global policy selects the model for a canonical role. Each repository's verification skill owns:

- launch and doctor checks;
- build, test, lint, migration, and runtime commands;
- supported CLI, API, browser, native-app, image, DCC, game-engine, and gameplay-control tools;
- environment, port, process, database, engine, editor, and user-data ownership;
- feature-to-proof-channel mapping;
- observable pass and failure criteria;
- screenshots, traces, logs, recordings, reports, revision receipts, and other retained artifacts;
- cleanup and recovery.

Match the proof route to the claim:

- Grok High executes CLI/API proof.
- Sol Medium executes routine browser/native UI proof.
- Astra Medium performs creative visual acceptance and autonomous exploratory gameplay.
- Deterministic image parity uses the pinned baseline and comparison harness. Astra is needed only when the baseline or visual quality itself is in question.
- Human experience claims require human evidence.

Workers must use every shipped surface required by the repository's verification skill. A later green run does not erase an intermittent failure. Evidence identifies the exact revision and runtime.

## PStack role mapping

Resolve specialized work first, then the actual work role, then profile aliases. Classify by the claim and artifact, not the application name.

| PStack role or workflow | Apply |
| --- | --- |
| Planning Mode main agent | Sol Medium |
| Planning Mode final readiness reviewer | Fresh Astra Medium |
| Poteto Mode main agent | Sol Medium. This policy cannot switch an already-running parent. |
| Feature, refactoring, bug-fix, performance, and hill-climb workers | Luna Bounded or Grok Standard, except Astra artistic work |
| How explorer and bounded Why evidence collection | Luna High |
| How explainer, Why causal synthesis, Architect, specifications, tickets, diagnosis, and technical adjudication | Sol Medium |
| Interrogate and code-review lanes | Sol Medium for code contract; Gemini High when alternate-family judgment is required |
| Arena runners and Swarm workers | Route each actual assignment. Preserve required lane count and model-family diversity. |
| Comment Sicko | Sol Medium, read-only |
| CLI/API live lane | Grok High |
| Routine UI live lane | Sol Medium |
| Artistic or exploratory-gameplay live lane | Astra Medium |
| Any unnamed role | Sol Medium classifies it without gaining new authority |

`Judgment`, `tooling`, `investigator`, `synthesizer`, `instruction-following`, and `fast` are descriptive profiles, not model choices. Route their actual assignment. `Fast` never changes service tier.

## Panels and independence

Preserve every selected workflow's lane count, independence, distinct-model, and alternate-family requirements. Separate agents on one model provide context independence but do not satisfy a distinct-model or cross-family requirement.

Gemini High fills a required alternate-family judgment lane when eligible. If unavailable, use only the workflow's explicit reduced-panel rule. Otherwise stop the gate. Do not substitute Astra or Sol and claim family diversity.

The Astra readiness reviewer must be fresh and must inspect the exact plan revision plus primary requirements and evidence. Any material plan change after the verdict requires a focused recheck.

## Dispatch, receipts, and fallback

1. Read the selected skill and assignment. Apply current user choices, specialized roles, actual work, then aliases.
2. Check the dispatch tool's supported models and efforts. Request the exact pair. Keep requested settings separate from observed settings.
3. Record requested and observed model, effort, provider, failover, role, policy revision, repository, and runtime. Combo results are provider-specific. A combo configuration is not a route receipt.
4. Include this policy path and the resolved pair in delegated work. Preserve scope, permissions, and required independence.
5. Luna unavailable or outside the bounded implementation boundary: use Grok High.
6. Grok unavailable for code or CLI/API operation: use Sol Medium and report the fallback. Do not lower acceptance.
7. Sol unavailable for durable ownership or required review: stop the affected phase or gate. Astra does not substitute for routine leadership.
8. Astra unavailable for readiness, artistic work, or exploratory gameplay: stop only that affected gate or specialist assignment.
9. Gemini unavailable for required family diversity: use only an explicit reduced-panel rule or stop the gate.
10. Tool, access, observation, and runtime failures need their own remedy. They are not model failures.

## Policy-change verification

For each policy revision, use an exact independently reviewed handoff identifying the authorized files, candidate hashes, current baseline hashes, qualification scope and rollback. This policy does not authorize its own activation or additional configuration changes.

1. Sol owns activation and the retained record. Recheck live baseline hashes immediately before applying each reviewed change. Stop affected writes if another session changed the baseline.
2. Apply only the handoff's authorized candidate files. Re-read them and verify candidate hashes. Preserve a per-file receipt if application is interrupted.
3. In fresh sessions, qualify the roles affected by the change using the handoff's approved proof. Retain requested and observed model, effort, provider and failover. CLI-only results do not qualify Desktop. An unobserved route remains unverified.
4. Confirm Poteto main resolves to Sol; unnamed roles are classified by Sol; Astra remains confined to readiness, artistic and exploratory-gameplay work plus separately authorized policy audits; required panel independence remains intact; repositories still own proof tools and commands.
5. Roll back affected run-owned changes if a required route, boundary or gate fails. Restore from the retained baseline only when the current files still match the run-owned state. Preserve concurrent edits and stop for reconciliation when they do not.
6. Retain failed and restored-state evidence. Stop only affected PStack work until recovery and required qualification pass. Never treat an unrelated later success as proof of an earlier failed revision.

## Configuration and authority boundary

Keep this policy global. Repositories own project standards, permissions, verification commands, tools, and evidence contracts, not copies of this model list.

Model selection does not grant execution, merge, deployment, external-message, account, permission, or destructive authority. Vendor defaults do not bypass readiness or answer material user decisions silently.
