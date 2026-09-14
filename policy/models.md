# C-Stack model policy

Single source for model choices across PStack skills, playbooks, and modes. C-Stack owns this policy. Global AGENTS.md only points here. Vendor skill slugs do not win.

This is instruction policy. It does not change Codex or OpenCodex config by itself.

## Identifiers

Leads are not spawn seats.

| Name | Slug | Seat |
| --- | --- | --- |
| Fable | `anthropic/claude-fable-5-1` | Lead only |
| Opus | `anthropic/claude-opus-5` | Lead only |
| Astra | `gpt-6-astra` | Spawn |
| Sol | `gpt-5.6-sol` | Spawn |
| Grok | `combo/grok-4.6` | Spawn |
| Luna | `gpt-5.6-luna` | Spawn |
| Muse | `cursor/muse-spark-1.3` | Spawn |

Spawn uses at most five models. Those five are Astra, Sol, Grok, Luna, and Muse. Combo is the slug for Grok, not a second model. Fable and Opus never occupy a spawn seat.

If the live spawn tool's model list is not these five, stop and report. Do not use Gemini, Terra, Haiku, Sonnet, Composer, or inherit-parent as a policy route.

## Leads

Create a new lead at Medium. Cameron may change parent effort. This policy does not fight that.

| Lead | When |
| --- | --- | --- |
| Fable Medium | Engineering and critical bots |
| Opus Medium | Other important bots |
| Sol | Only if the Anthropic lead route is down |

The lead owns grilling, routing, worker selection, context for each spawn, and delivery. It does not write product code. It does not serve as its own readiness gate.

This policy cannot switch an already-running parent.

## Workers

Right-size model, effort, and context for every spawn. Effort may be low through max. Muse's interrogate seat stays Max.

| Work | Model | Starting effort | Boundary |
| --- | --- | --- | --- |
| Everyday review, code-contract, security diff | Sol | Medium | Fresh worker. The implementer never grades itself. |
| Routine browser or native UI proof | Sol | Medium | Creative visual acceptance stays Astra. |
| Interrogate, arena, and adversarial code review | Muse | Max | Do not downshift Muse. Everyday review stays Sol. |
| Comment audit | Luna | Medium | Keep-list comment hunt. Do not spend Sol on this. |
| Implementation and CLI/API proof | Grok | High | All non-art product code. Raise or lower with hardness. |
| Bounded cheap implementation | Luna | High | Clear ticket, contained impact, obvious checks. Unclear or high-risk work is Grok. |
| Bounded extraction and code exploration | Luna | Medium | Read-only. Synthesis stays with the lead or Sol. |
| Independent readiness audit | Astra | Medium | Fresh session. Inspect the exact plan revision plus primary requirements. Findings only. The lead resolves them. Recheck only what changed. |
| Art, 3D, Image 2.5 acceptance, exploratory play | Astra | Medium | Astra directs and accepts. The generator or DCC tool produces the artifact. Astra never writes product code. |

## Codex spawn

`spawn_agent` can override only the five spawn slugs. Children inherit the parent if `model` is omitted. Fable and Opus parents would leak into workers. Always set `model` and `reasoning_effort`.

Use `pstack-poteto-agent` for Poteto coding delegates. Still set an explicit worker model from the five. Do not let it inherit the lead.

Use `pstack-comment-sicko` for comment audits. Pin it to Luna Medium. Sol is wasted on comment hunting.

`ocx-*` profiles pin a model and ignore `model`. Use an `ocx-*` profile only when it is one of Astra, Sol, Grok, Luna, or Muse. Do not use Gemini or Terra profiles.

`default`, `explorer`, and `worker` also inherit. Set `model` on those too.

Pass only the context the worker needs. Do not fork the parent thread by default.

## Independence

Sol does everyday review of Fable-led and Opus-led work. Muse Max does interrogate and adversarial review. Grok never reviews its own diff. Fable and Opus never spawn. Astra readiness is a fresh agent. It does not rewrite the plan.

## Implementation path

1. The lead owns the ticket and picks workers.
2. Use Luna for bounded cheap work. Use Grok for every other non-art implementation.
3. If Luna exceeds its boundary or leaves a real defect, keep valid work and hand it to Grok.
4. One focused Grok repair is allowed. If it still fails, Sol diagnoses. A fresh Grok worker implements the corrected contract.
5. A fresh Sol reviewer checks the ticket, the exact changes, defects, and proof.
6. For interrogate or adversarial review, spawn Muse Max. Spawn Sol plus Muse Max only when the workflow requires two reviewers.
7. Return product, design, authority, and acceptance choices to Cameron.

## Proof

Roles are not proof. Repository verification skills own commands, tools, and pass criteria.

- Grok executes CLI/API proof.
- Sol executes routine UI proof.
- Astra executes creative visual acceptance and exploratory play.
- Human feel still needs a human.

## PStack mapping

Vendor skills name Cursor slugs. Resolve them here.

| PStack role | Apply |
| --- | --- | --- |
| Planning or Poteto main agent | The running lead. New engineering leads are Fable. New other important leads are Opus. |
| Planning readiness reviewer | Fresh Astra |
| Feature, refactor, bug-fix, perf, hill-climb workers | Luna or Grok. Art is Astra. |
| How explorer, bounded Why collection | Luna |
| How explainer, Why synthesis, Architect, specs, tickets, diagnosis | The lead, or Sol when spawned |
| Everyday code-review | Sol |
| Interrogate | Muse Max |
| Arena runners and Swarm workers | The actual assignment. Use only spawn slugs. Keep required lane count. |
| Comment Sicko | Luna Medium, `pstack-comment-sicko` |
| CLI/API live lane | Grok |
| Routine UI live lane | Sol |
| Art or exploratory play | Astra |
| Unnamed role | The lead classifies it. No new authority. |

Judgment, tooling, investigator, synthesizer, and fast are labels, not models. Route the actual work.

## Fallback

1. Request the exact slug and effort. Record requested versus observed.
2. Luna unavailable or out of bounds: Grok.
3. Grok unavailable for implementation or CLI: Sol, and say so.
4. Sol unavailable for review: stop the review gate. Astra does not replace Sol.
5. Muse unavailable for interrogate: Sol, and say so. Do not substitute Grok.
6. Astra unavailable for readiness or art: stop that gate only.
7. Fable unavailable as lead: Opus if the bot is not critical, else Sol.
8. Opus unavailable as lead: Sol.
9. A missing spawn slug is a config problem, not a reason to pick Gemini.

## Authority

This policy is global. Repositories own standards, permissions, verification, and evidence. Model choice does not grant merge, deploy, message, or destructive authority.

