---
name: setup-pstack
description: Configure CStack's native project personas, per-role models, and supported reasoning effort. Use for setup-pstack, configuring CStack models, or changing a role's choices.
---

# Setup PStack workflows in Codex

Read [the Codex runtime contract](../poteto-mode/references/codex-runtime.md). The skill keeps its upstream identifier; it configures this Codex project, not a Cursor rule or a gateway.

## 1. Discover capabilities

Use the current host's supported model catalog, such as app-server `model/list`, including all pages. Record each exact `model` value and its `supportedReasoningEfforts`. Catalog visibility alone does not prove a particular child tool can select that model: inspect its actual schema or a supported native profile. If no catalog is exposed, ask for supported choices or offer explicit inheritance. Never synthesize provider slugs, edit suffixes, or assume entitlement from a model name in a document.

## 2. Load the project configuration

Read `.codex/cstack/models.json` if present. Keep the user's existing roles and panel lists. Report unknown/retired roles before replacing them. Do not modify global `AGENTS.md`, provider credentials, model catalogs, or gateway configuration.

The upstream roles remain: `feature, refactoring`, `bug-fix`, `perf-issue`, `hillclimb`, `judgment and prose`, `hardest tasks`, `how explorer`, `how explainer`, `why investigators`, `why synthesizer`, `reflect tooling`, `reflect judgment, divergent, synthesizer`, `arena runners`, `arena cross-judge pool`, `swarm workers`, `architect runners`, and `interrogate reviewers`.

## 3. Choose effort and roles

Present supported model/effort pairs from the current catalog. Keep model ID and effort separate. Offer the user's actual available effort range rather than an unsupported hard-coded budget ladder. Show the existing choice when re-running setup. No personal roster or default effort is embedded in this plugin.

For a new panel, retain upstream's three-seat default and let the user choose each entry. A later explicit panel list determines the count. The cross-judge pool is a list from which one judge is selected, favoring another model family when identity is known. `auto` and `inherit-parent` keep a seat but omit overrides; neither asserts diversity or a served model. Explain any unavailable independent-model lane before accepting a reduced review.

Show the complete proposed role map and confirm the choices using the supported user-question tool, unless the user already supplied those exact choices. Example shape (inheritance is illustrative, not a bundled model policy):

```json
{
  "schema": 1,
  "roles": {
    "swarm workers": {"model": "inherit-parent"},
    "arena runners": [
      {"model": "inherit-parent"},
      {"model": "inherit-parent"},
      {"model": "inherit-parent"}
    ]
  }
}
```

For a concrete model, use `{"model": "<catalog model>", "reasoning_effort": "<supported effort>"}`. Do not write placeholder values. An omitted role remains unconfigured, not silently mapped to a provider default.

## 4. Validate and save

Export the non-secret live model catalog into an owned temporary file. Validate the proposed JSON with `python3 <plugin-root>/scripts/validate_models.py --config <proposal> --catalog <catalog>`. Resolve every rejected choice before saving. Save the confirmed map atomically to `.codex/cstack/models.json`, preserving a recoverable prior version. This file is loaded by CStack skills; it does not change the host's global model settings. Revalidate against live capabilities before future use when availability changes.

## 5. Optional native personas

Offer project-scoped native personas once. The setup helper requires Python 3.11 or newer; use an existing compatible interpreter explicitly, and report a missing dependency rather than installing one silently. With the user's setup authorization, preview `python3 <plugin-root>/scripts/setup_agents.py --project <project>` and apply with `--apply`. It creates only `cstack-poteto` and `cstack-comment-sicko` profiles plus an ownership receipt. It refuses unowned, edited, or symlinked target profiles. A profile update after a plugin upgrade must pass the same ownership check; never overwrite an unrelated profile. Retired profiles must be handled through a separate reviewed cleanup, not deleted blindly.

Profiles inherit the host's model and permission settings. Per-role model overrides use only supported native spawn fields; if that host needs additional role-specific profiles, present that explicit project configuration rather than pretending the base persona selected a different model. Until profiles are available, pass the full bundled persona to a native child as the runtime contract specifies. Open a fresh host session when required for project agent discovery.

## 6. Verify and report

Confirm discovered skill and persona names, actual supported model-selection mechanism, the saved role map, and any unverified served identity. Hook trust is a separate host review; setup never trusts a hook. Do not claim sticky activation or compaction restoration without lifecycle receipts and target-host tests.

## 7. Optional verification skill

If the project lacks a real application verification path, offer `create-verification-skill` once. On acceptance, generate a project-local skill under `.agents/skills/`; otherwise continue without adding one.
