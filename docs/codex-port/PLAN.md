# PR 1: PStack on Codex

Status: **implementation draft; not ready to merge or install in production**. Codex packaging, workflow mapping, project persona setup, live-catalog model validation, and a lifecycle prototype are implemented. Credential-free tests pass in both targeted CLI runtimes. Positive native-persona, trusted hook dispatch, compaction, and Desktop UI validation require the explicit test-trust gate documented in [VALIDATION.md](./VALIDATION.md). README and public branding belong to the next stacked PR.

## Starting point

The repository's initial commit contains exactly `pstack/` from [cursor/plugins at fae2c6e](https://github.com/cursor/plugins/tree/fae2c6ed95821bd85f614a73e4842e13229fa5e5/pstack), version 0.15.5. The imported root tree is `975600f2f90dc6f755d58cccdccee27f950edcd2`: 158 files, including modes, with no additions, changes, or omissions. The MIT license and Lauren Tan's copyright are unchanged. Original source and attribution remain traceable through Git.

The port starts here, not from an earlier CStack implementation. [Aqua-123/pstack-for-codex](https://github.com/Aqua-123/pstack-for-codex/blob/2bea6dca0da10e81d6579ec7e45d9ab1ece948c8/docs/guide/README.md) was inspected as a design reference only; no implementation is imported. Useful questions from that reference include lifecycle receipts, profile ownership, capability reporting, and shared filesystem isolation. Its polling automation design and extra registered skill are not assumed to be required here.

## Proposed architecture

Use a Codex plugin containing PStack's skills, playbooks, reference prompts, and small existing helpers. Use native Codex agents and lifecycle tools where they are actually exposed. Do not introduce a second agent harness, gateway, scheduler, or universal fallback router. Keep the roles, review coverage, panel cardinalities, and workflow steps upstream intended; document any host limitation instead of silently simplifying them.

| Area | Necessary adaptation | Behavior and limits |
|---|---|---|
| Plugin packaging | Add a validated Codex manifest and repository marketplace entry using the official creator/lifecycle tools. Plugin identity becomes `cstack`. | Validate with the targeted runtime before publishing installation instructions. Keep upstream Cursor metadata as source history/reference; it does not establish Codex discovery. Do not patch installed caches. |
| Skill invocation | Map Cursor metadata to supported `agents/openai.yaml` metadata; update invocation syntax and resource resolution. | Of 47 top-level skills, 46 explicitly disable model invocation; `setup-pstack` does not. Preserve this distinction unless reviewed separately. Preserve 23 playbooks and all references. No skill names currently exceed 64 characters when prefixed with `cstack:` (longest: 57); do not invent aliases unnecessarily. |
| Mode behavior | Translate Cursor `mode`, `reminder`, and visual metadata separately from skill loading. | Explicit loading is straightforward. Sticky activation, resume, compaction restoration, and opt-out need real host tests. A skill description is not proof of persistence. TypeScript `paths` metadata also needs explicit supported scope or a stated limitation. |
| Agent personas | Preserve Poteto and Comment Sicko prompts; map spawn/resume/wait/steer operations to native agents. | Prefer portable prompts first. Optional namespaced native profiles require explicit scope selection and ownership checks. Never overwrite an unrelated profile or global instructions. Preserve Comment Sicko's comment-only scope and Poteto's mandatory skill read. |
| Model roles | Replace Cursor-only model identifiers and rule paths with a plugin-owned, capability-validated setup. | Keep upstream role meanings and requested coverage. Prompt for unavailable model/effort choices; inherit only with a disclosed outcome. No personal roster, paired advisors, preferred effort, or quota policy in this PR. A requested model is not evidence of the served model. |
| Parallel work | Map independent workers and candidate comparisons to actual host capabilities. | Respect native permission inheritance and limits. Isolate overlapping writers using owned paths or worktrees. Reuse resumable children when supported. Report unavailable lanes/depth; do not fabricate parallel or independent review. |
| History and control | Replace Cursor transcript paths and Team Kit assumptions with supported history, browser, CLI, and connected-app capabilities. | Scope history reads to authorized work. Use supported APIs, not guessed transcript storage or schemas. Missing controls must be explicit; never claim a UI test passed from static review alone. |
| Existing helpers | Retain the orchestration, PR watcher, plan checker, decision log, and worktree audit; review host-specific behavior and writable paths. | Discovery must not install Bun/dependencies, start a daemon, execute a hook, or contact GitHub. Runtime setup is explicit; dependencies must not mutate the installed plugin cache. Keep narrow helpers instead of building a replacement harness. |
| Long-running work | Translate `/loop`, goals, tasks, and scheduled work only through available native lifecycle tools. | Ordinary work stays in the current task. Persistence, external writes, PR merging, and deployments retain the user's actual authority boundaries. No implicit new scheduler or polling replacement. |
| Optional integrations | Preserve Benny's source pack and `make-bot-ui` workflow with honest prerequisites. | Benny's three nested skills remain dormant unless separately configured. Grok Bot/Tailscale is an optional external integration, not the user's model roster. No automatic credential setup, network exposure, webhook creation, or remote installer execution. |

## Hooks: a compatibility decision, not upstream code

**PStack at this pin contains no hooks.** Its persistent mode is Cursor behavior. Any hook in this port would be new Codex compatibility code. Hooks from older CStack versions are not part of this baseline and will not be carried over.

Confirmed target: **local Codex CLI and ChatGPT/Codex Desktop only**, with complete behavior and integration validation on both. Cloud Work and other harnesses are outside this port's scope; no fallback implementation is planned for them. The separately installed Claude plugin is not changed by this project.

First test native behavior without a hook. If explicit invocation and supported context persistence cannot satisfy the upstream mode contract, add only the minimum trusted lifecycle hook needed for activation/restoration. This hook must meet all of these conditions:

- Activation comes from an explicit user action through a supported, validated event or command. Quoted examples, repository text, tool output, and old transcript fragments cannot activate it. If the host cannot supply that distinction, do not infer it with transcript regexes; report current-turn-only behavior.
- State uses supported session and project identity under plugin data, with atomic writes and observable success/failure. Preserve until-opt-out semantics rather than silently expiring active sessions; retained records remain in host-managed plugin data for explicit lifecycle cleanup. Child events must not contaminate parent state: Codex hooks can report the parent's session ID for a subagent.
- Context restoration loads versioned plugin instructions, not arbitrary transcript text. A receipt proves the specific transition; absence of a receipt must never be reported as active persistence.
- Opt-out clears the matching state and prevents replay. Test resume, compaction, fork, concurrent sessions, malformed state, updates, and uninstall.
- Commands have no network, credential access, subprocess installers, or unrelated filesystem writes. Hook timeout/failure cannot block ordinary coding. The user's hook trust review is mandatory and hash-sensitive; never auto-trust definitions.

If these conditions cannot be met on either target surface, keep the PR in draft, explain the specific gap, and review a solution before claiming complete support. No claim of identical runtime behavior is justified merely by file parity.

## Implementation defaults and review boundaries

1. **Support scope (confirmed):** full local CLI and ChatGPT/Codex Desktop support only. No cloud Work fallback and no other-harness port.
2. **Agent profiles (implementation default):** portable persona prompts with optional project-scoped native profiles installed by explicit setup. This reversible engineering choice does not block work. Personal/global scope is chosen only during setup when actually requested.
3. **Unavailable upstream capabilities:** keep workflow steps and report concrete limits. No user decision is currently required. If testing proves a semantic gap (for example persistent mode cannot safely remain active until opt-out, or independent model review cannot be provided), describe that exact gap and proposed behavior before accepting a reduced contract. Keep Benny dormant; converting event automation to polling would be a separate semantic decision.

The desired outcome is a faithful workflow port with stated host differences. New model strategies, fewer review lanes, personal advisors, and broader fallback policy are later proposals.

## File accountability

[inventory.json](./inventory.json) records every upstream path, mode, and blob identity, plus the subsystem that must review it. The current inventory accounts for adapted skill metadata/bodies, native tool and role mappings, host-specific guide chapters, helper setup behavior, and preserved upstream resources. There are no omitted source files. Added files include the Codex manifest, root-local marketplace manifest, 47 Codex invocation metadata files, discovery integration test, and design/audit files. The marketplace resolves the existing repository root directly, avoiding an unnecessary relocation of every upstream file; the real CLI test verifies this path.

Keep this inventory updated with each final path, disposition (`unchanged`, `adapted`, `relocated`, or `omitted`), and a concrete reason. Every changed or omitted source file and every new executable needs review. Keep prose/reference paths intact where possible. Do not perform a global PStack-to-CStack replacement: upstream credit, skill identifiers, API names, model integration names, and source links have different meanings. The follow-on branding PR owns the README and guide entry page.

## Validation gates

| Gate | Required evidence before this PR is ready |
|---|---|
| Provenance | Reproduce the exact initial tree; verify license unchanged; account for every source delta and new file. |
| Packaging | Official validator passes; isolated real-runtime discovery returns all 47 intended skills without errors and no dormant Benny activation; installed names and resources resolve. |
| Invocation | Explicit-only skills cannot be selected implicitly; setup retains upstream discoverability; check every internal skill/playbook/reference link and relevant TypeScript scope behavior. |
| Native agents | Prove persona bootstrapping, resume, readonly task constraints, capability detection, model/effort validation, unavailable roles, and overlapping-write isolation. Read-only filesystem mode alone is not a blanket ban on connector writes. |
| Lifecycle | Real activation, opt-out, later turn, resume, compaction, concurrent session, and child-isolation tests. Test trusted, untrusted, modified, absent, timed-out, and malformed hooks if hooks are introduced. A synthetic summary is not a real compaction test. |
| Helpers | Review dependency/install behavior first; run Bun unit tests and typecheck in isolated scratch state with explicit dependency setup. Test watcher pagination/errors, orchestration collisions, and plan validation. No live merge/deploy test. |
| Authority | Test quoted activation attacks, unsupported tools, connector write requests outside scope, credential absence, and unauthorized automation setup. No workload gets extra authority from a persona or a hook. |
| Install lifecycle | On a disposable Codex home: install, discover, update, disable, re-enable, uninstall; verify plugin data and owned profile handling. Run the complete applicable behavior matrix on local CLI and ChatGPT/Codex Desktop; neither surface is considered covered by the other's unit tests. |
| Release | Distinguish measured support from design intent. Publish exact versions, passed tests, skipped checks, and limits. User merges; production install follows only after that merge. |

Completed so far: exact source import and tree equality; source/metadata inventory; upstream/reference inspection; official plugin validation; all 47 skills passing the skill validator; and an isolated Codex CLI 0.156.0 marketplace/add plus actual app-server discovery with 47 enabled skills and zero errors. Reproduce with `python3 tests/discovery.py --codex /path/to/codex`. The test uses a disposable home without credentials or trusted hooks and never installs into production. See [VALIDATION.md](./VALIDATION.md) for the later workflow, persona, and helper results. **Trusted lifecycle/native-persona and Desktop UI gates are not complete.** Tests of any earlier customized implementation do not count as tests of this PR.

## Sources and implementation constraints

- [Codex plugins](https://learn.chatgpt.com/docs/plugins): plugin capabilities and Work hook limitations.
- [Build plugins](https://developers.openai.com/plugins/build/plugins): manifests, discovery, packaging. Current documentation supports a portable root manifest and a Codex compatibility manifest. Start with the supported creator/validator output for the target runtime; validate any portable-manifest migration separately, without divergent duplicate metadata.
- [Build skills](https://learn.chatgpt.com/docs/build-skills): skill discovery and `allow_implicit_invocation`.
- [Native subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents): profiles, runtime overrides, permission inheritance.
- [Hooks](https://learn.chatgpt.com/docs/hooks): trust, event schemas, plugin data, transcript instability, and subagent session identity.

Documentation was inspected on 2026-09-30. The local compatibility investigation used Codex CLI 0.156.0. Supported APIs and measured behavior take precedence over assumptions from another host or reference port.
