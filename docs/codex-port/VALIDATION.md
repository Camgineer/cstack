# Validation and review gate

**PR 1 remains draft. It is not ready for merge or production installation.** Packaging, workflow mapping, project-persona setup, model validation, and the lifecycle prototype are implemented. The remaining gate is real trusted host execution, not another packaging test.

## Verified on 2026-09-30

| Check | Result |
|---|---|
| Initial import | Exact upstream PStack tree `975600f2f90dc6f755d58cccdccee27f950edcd2`; original MIT unchanged; no source files omitted. |
| Official validators | Plugin and all 47 exposed skills pass. |
| Standalone CLI 0.156.0 | Official isolated marketplace/add and app-server discovery: 47 enabled skills, zero errors, two untrusted hooks; only setup is exposed for implicit invocation. |
| Desktop bundled CLI 0.159.2 | Same isolated discovery result. This is runtime coverage, not Desktop UI verification. |
| Python behavior tests | 19 pass: owned/idempotent persona setup; edited, duplicate, nested, and symlinked profile protection; model/effort validation; primary on/off/status receipts, quoted-content non-transitions, root/child identity isolation, stale state and opt-out tombstones, compaction restoration using synthetic events, and lock recovery after process death; helper startup without automatic dependency installation; worktree paths with spaces. |
| Existing Bun helper suite | 52 pass, zero failures, 206 assertions; TypeScript strict typecheck passes. Dependencies were installed explicitly in a scratch copy with package lifecycle scripts disabled. |
| Hook trust | Both hosts report the two hooks as `untrusted`; no trust records were written or bypass flags used. |
| Project trust | Both hosts' `config/read` explicitly disable the isolated project's local config until it is trusted. Generated persona files do not establish live registration. |
| Independent review | Found and corrected stale Cursor readonly/MCP advice, invented tool fields, stale setup/loop claims, wrong generated-skill metadata, nested profile collision handling, and incomplete policy hashing. Final host-level gates below remain. |

Reproduce the credential-free tests:

```sh
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 tests/discovery.py --codex /path/to/standalone/codex
python3 tests/discovery.py --codex /path/to/desktop/bundled/codex
python3 docs/codex-port/audit_baseline.py
```

Persona setup requires **Python 3.11+** and checks the version explicitly. The hook uses Python 3.9+ standard library only. Verify the interpreter visible to Desktop before the live hook canary. Discovery does not require Bun; the optional upstream helpers do. Run helper tests in an owned scratch copy after reviewing `package.json` and `bun.lock` and explicitly installing their frozen dependencies.

## Exact remaining approval boundary

Positive native-persona and lifecycle testing needs a dedicated test project trusted through the normal host flow, followed by explicit review/trust of the two hook definitions through `/hooks`. This is a security/trust action, outside the instruction to make no security/access changes. The implementation does not self-approve, write trust hashes, or use bypass flags.

The smallest exception needed is **normal project and hook trust in a disposable pre-merge test environment only**, after reviewing `hooks/hooks.json` and `scripts/mode_state.py`. Production configuration, production hook trust, installed production plugins, and gateway state remain unchanged. Without that exception, these tests must wait for the user's normal post-merge setup; the PR cannot truthfully claim full pre-merge runtime validation.

Desktop additionally needs an approved isolated UI test session. No supported GUI automation harness was established in this environment. Testing its bundled CLI does not replace opening the actual skill selector, reviewing hook trust, and observing the resulting Desktop conversation.

## Required live canaries

1. Discover all 47 skills in CLI and Desktop; explicit-only skills stay explicit, while setup remains discoverable. Verify skill references resolve after installation.
2. Trust only the dedicated test project normally. Start a fresh session; invoke each exact native persona for a harmless scoped task. Verify Poteto reads its full skill and principles, and Comment Sicko stays within comment scope. Verify native model selection and actual sandbox behavior; do not infer these from a TOML file or a requested model.
3. Review/trust the two mode hooks normally. Exercise natural-language activation and opt-out through the primary setter, quoted/injected non-intent, next turn, resume, manual compaction, automatic compaction, and changed plugin instructions. Verify actual delivered hook payloads and receipts.
4. Spawn native children while mode is active. Verify root-only SessionStart receipt issuance, rejected child prompt events, and rejection when a child tries to use an inherited parent receipt. Confirm native thread/session environment values and exact opaque transcript binding. Pinned host source supports these contracts; synthetic tests do not replace dispatch verification.
5. Confirm missing/untrusted/modified hooks, malformed state, cancellation, and concurrent sessions cannot silently claim persistence or widen authority. Recheck hook timeout and missing-interpreter behavior.
6. Complete install/update/disable/re-enable/uninstall checks in the isolated environment. Ensure project-profile ownership and state handling remain explicit. Never patch plugin caches.

## Semantic differences requiring review

- **Natural-language activation:** the primary interprets the current user's intent and calls the narrow `on/off/status` setter; hooks never parse prompts or transcripts. Only root SessionStart issues a receipt. The setter requires `CODEX_THREAD_ID == CODEX_SESSION_ID == receipt.session`, the matching project, and a current policy hash. Hooks restore the matching session/project/opaque-transcript state. Explicit off records an inactive tombstone, including for stale instructions. This preserves natural-language interaction through model-mediated recording; reliability and real restoration remain live-test gates, not claimed native Cursor parity. Environment variables prevent accidental cross-thread use, not deliberate same-user spoofing.
- **Host identity evidence:** root session/thread equality is established in [Codex 0.156](https://github.com/openai/codex/blob/rust-v0.156.0/codex-rs/core/src/session/session.rs#L860-L881) and [0.159.2](https://github.com/openai/codex/blob/rust-v0.159.2/codex-rs/core/src/session/session.rs#L856-L877). [SessionStart dispatch](https://github.com/openai/codex/blob/rust-v0.156.0/codex-rs/core/src/hook_runtime.rs#L119-L154) excludes native spawned children. Hook transcript paths are opaque host identities; no file-name parsing or transcript reading is used. State locking uses crash-released POSIX advisory locks; Windows lifecycle support has not been implemented or claimed.
- **Mode retention:** state is scoped to host identity and retained in host-managed plugin data until explicit lifecycle cleanup. There is no silent TTL expiration, preserving until-opt-out intent. A policy change invalidates restoration through the instruction hash. Storage cleanup must not be represented as implemented.
- **Long-running work:** the local port does not provide Cursor cloud workers or a new `/loop` daemon. Workflows use actual native capacity and continuation capabilities. Missing cadence or restart survival is reported; never silently convert event automation into polling.
- **Optional integrations:** Benny remains a dormant source pack; the external Grok Bot/Tailscale workflow keeps its explicit prerequisites. Neither is provisioned or enabled by installing CStack.

## Where to focus review once the gates pass

Review the native runtime contract and model-role semantics first, then persona ownership and hook activation/isolation. Confirm every inventory disposition and any capability gap before reading individual prompt edits. PR 2 owns the concise public README and branding. Personal model/advisor enhancements are outside this PR.


## Short manual Desktop check

Do not install this branch into the production Desktop profile. Use only an approved isolated Desktop profile whose Codex home and application-data isolation have both been verified; a supported launcher for that profile is still unresolved. Otherwise defer this GUI check until the user's post-merge installation. No broad macOS Accessibility or Screen Recording grant is needed for a human check.

1. In the isolated profile, complete normal sign-in if needed; never copy production credentials. Open only the disposable test project and review its normal project-trust prompt.
2. Confirm CStack's 47 skills in the selector. Review only its SessionStart/UserPromptSubmit hooks through the normal hook UI, if separately approved.
3. Ask to enable Poteto Mode naturally, verify the setter receipt, then ask to turn it off. Test a quoted activation example; it must not change stored mode.
4. Repeat on/off across resume and compaction; check a harmless native-persona task and child isolation. Record actual results and app/runtime versions. Keep the PR unmerged and production untouched until its remaining gates are accepted.
