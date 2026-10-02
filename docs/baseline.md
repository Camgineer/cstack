# CStack baseline, 2026-10-02

## Observed

The initial working tree was clean at `c31f7ac`. The single recorded commit imports pstack 0.15.5. There are 47 top-level `skills/*/SKILL.md` files, plus a separate Benny automation pack. The README described pstack and Cursor installation, with no CStack entry point.

The import includes Bun tests for orchestration and PR watching in `skills/poteto-mode/scripts/package.json`. These are upstream implementation checks; they do not establish OpenMausBot compatibility. They were not run for this documentation-only foundation change.

Specific incompatibilities found by reading source:

- `skills/setup-pstack/SKILL.md` writes a Cursor rules file and assumes Cursor model selection.
- `skills/poteto-mode/SKILL.md` depends on Cursor built-ins, control plugins, fixed model defaults, and sticky-mode behavior.
- `skills/recall/SKILL.md` and `skills/reflect/SKILL.md` assume Cursor transcript locations.
- `skills/make-bot-ui/SKILL.md` describes a Cursor/Grok webhook integration.
- `skills/poteto-mode/playbooks/eval.md` assumes parallel model candidates and local Cursor transcripts.

This was a targeted entry-point assessment, not an exhaustive audit of every imported file.

## Confirmed direction

The user wants a faithful pstack derivative that fits OpenMausBot's native mechanisms. The project preserves upstream reasoning and attribution. A file preset, a small standing instruction, and self-contained skills form the pilot delivery path. Live integration is still to be tested.

Simple as Prose is required for every human-facing reply and artifact. Writing for Agents is required for every agent-facing writing task. Both apply when the audiences overlap. These are confirmed additions, not optional candidates.

The six previous Codex-oriented PRs were closed without merging or deleting their branches. The writing skills are recovered from fixed commits; their provenance is recorded in [the pilot record](pilot.md).

## Open choices

- The first domain to optimize: software work, general research/planning, or a balance.
- Which bot will host the live pilot.
- Whether the deployed preset import, skill visibility, and lifecycle match the inspected source.
- Which workflows should follow the first pilot; no further optional skill choices are assumed.

## Next deliverable

Prepare one reviewable package containing How and the two writing skills, setup and removal instructions, and concrete acceptance cases. After review, install it on a selected pilot bot and compare it with the native baseline on the same fixtures. Extend the port after observed outcomes support the integration.
