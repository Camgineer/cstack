---
name: writing-for-agents
description: "Use when writing prompts, skills, personas, references, or guidance an agent reads. State triggers and completion criteria."
---

# Writing for agents

Write instructions the next agent can follow cold. For a skill, also read [Skill mechanics](SKILL-MECHANICS.md).

## Context pointers

A context pointer names material outside the current context and states when to read it. Skill descriptions and guidance that links a reference are pointers. Their wording decides whether the agent reaches the target.

- Lead with the observable condition that needs the material.
- Give each distinct case one trigger. Cut synonyms that repeat the same case.
- Use conditions the agent can observe while holding the pointer. A failure in the load path needs guidance where the reader still looks.
- Sharpen a weak pointer before inlining its target. Keep identity and detail in the body.

Always-loaded pointers spend context on every turn. Disclosed references spend it only when reached, but the reader still needs to know they exist. Keep independently selected work discoverable and branch-specific detail behind a pointer.

## Information hierarchy

Put ordered actions first. Keep reference needed on every path beside the action it governs. Move detail used only on one branch into a linked reference and give that link a trigger.

Keep a concept's definition, rule, and caveats together. A rule scattered across sections is easy to half-follow. Split a long document by branch or sequence when attention thins, rather than hiding a required step behind several reads.

## Completion criteria

Give each step a checkable condition for completion. "Every changed caller accounted for" demands more than "produce a change list". Name the expected output, coverage, or decision so the agent can distinguish done from unfinished.

When later steps tempt premature completion, first sharpen the current step's criterion. Split the sequence only if that criterion cannot be made clear and a run actually shows the rush. Keep required inputs with the step that consumes them.

## Leading words

Use a familiar term for a repeated concept, define it once, and repeat the term. A term such as "regression" or "boundary" recruits existing knowledge. A coined label spends text on its definition, so use one only when the familiar words cannot name the distinction.

State the target behavior positively. Keep a prohibition for a hard guardrail that cannot be expressed positively, and pair it with the desired action. Avoid capitals and stacked absolutes that make a rule dominate unrelated decisions.

## Prune

- Give each meaning one authoritative home. Link shared instructions instead of restating them.
- Let configuration, scripts, and directory structure state facts they already encode. Cache only an expensive lookup or a reason the environment cannot show.
- Cut stale content, exposition with no decision attached, and sentences that do not change behavior from the default. Delete a no-op sentence rather than shortening it.
- Keep only words that sharpen a trigger, action, boundary, or completion criterion.
- Check a disputed rule through realistic execution. A reader's preference alone does not prove whether an agent needs it.

Before returning the instructions, trace each branch from trigger through required inputs to a visible result. Name any untested behavior instead of claiming the writing alone proves it.
