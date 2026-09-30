# Validation and review gate

**PR 1 remains draft. It is not ready for merge or production installation.** Packaging, workflow mapping, project-persona setup, model validation, and the lifecycle prototype are implemented. Trusted runtime tests now pass on both pinned versions. Actual Desktop UI confirmation and the explicitly untested edge cases below remain; do not represent runtime coverage as GUI coverage.

## Verified on 2026-09-30

| Check | Result |
|---|---|
| Initial import | Exact upstream PStack tree `975600f2f90dc6f755d58cccdccee27f950edcd2`; original MIT unchanged; no source files omitted. |
| Official validators | Plugin and all 47 exposed skills pass. |
| Standalone CLI 0.156.0 | Official isolated marketplace/add and app-server discovery: 47 enabled skills, zero errors, two untrusted hooks; only setup is exposed for implicit invocation. |
| Desktop bundled CLI 0.159.2 | Same isolated discovery result. This is runtime coverage, not Desktop UI verification. |
| Existing-login native delegation | Desktop bundled CLI 0.159.2 reused existing ChatGPT authentication in place with `--ignore-user-config`, plugins/hooks disabled, and read-only sandbox. One native child completed; parent thread=session, child thread differs and shares the root session. No credential copy, plugin install, or config/trust change. This is not plugin/persona-registration, hook, compaction, or GUI coverage. |
| Python behavior tests | 20 pass: owned/idempotent persona setup; edited, duplicate, nested, and symlinked profile protection; model/effort validation; primary on/off/status receipts, quoted-content non-transitions, root/child identity isolation, stale state and opt-out tombstones, compaction restoration using synthetic events, and lock recovery after process death; helper startup without automatic dependency installation; worktree paths with spaces. |
| Existing Bun helper suite | 52 pass, zero failures, 206 assertions; TypeScript strict typecheck passes. Dependencies were installed explicitly in a scratch copy with package lifecycle scripts disabled. |
| Hook trust | Credential-free discovery leaves hooks untrusted. In the separately signed-in live fixtures, the user authorized normal UI trust for exactly SessionStart and UserPromptSubmit. No bypass flags or production trust changes. |
| Project trust/personas | Untrusted discovery disables project config. After approved normal trust, both native personas ran on both runtimes; actual thread metadata records the requested roles. |
| Skill lifecycle | Isolated install, disable, re-enable, uninstall and reinstall pass on both runtimes. Fixture updates use the ordinary marketplace/install CLI, not cache edits. |
| Live lifecycle | Both runtimes pass natural-language on/off, quoted opt-out preserving active state, manual compaction restoring active state, and fresh-process resume preserving off. Actual hook events corroborate model reports. |
| Live child identity guard | Both runtimes return the expected parent-thread rejection from real native children using their own identities. No synthetic environment or receipt sharing was used. |
| Independent review | Found and corrected stale Cursor readonly/MCP advice, invented tool fields, stale setup/loop claims, wrong generated-skill metadata, nested profile collision handling, and incomplete policy hashing. Final host-level gates below remain. |

Reproduce the credential-free tests:

```sh
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 tests/discovery.py --codex /path/to/standalone/codex
python3 tests/discovery.py --codex /path/to/desktop/bundled/codex
python3 docs/codex-port/audit_baseline.py
```

Persona setup requires **Python 3.11+** and checks the version explicitly. The hook uses Python 3.9+ standard library only. Verify the interpreter visible to Desktop before the live hook canary. Discovery does not require Bun; the optional upstream helpers do. Run helper tests in an owned scratch copy after reviewing `package.json` and `bun.lock` and explicitly installing their frozen dependencies.

## Approved test scope and remaining validation

The user approved normal project and two-hook trust in the two disposable test homes on 2026-09-30, then completed each normal sign-in. Trust was granted through the CLI UI, without bypass flags, credential copies, or changes to production trust.

On standalone CLI 0.156.0 and Desktop-bundled CLI 0.159.2, live tests now confirm root hook dispatch, primary-mediated activation, quoted opt-out leaving mode unchanged, manual compaction restoring active state, both named native personas, explicit off, and off-state preservation after restarting the app-server and resuming. Host hook events corroborate the transitions; this is stronger than model self-report. Child shells have distinct thread IDs and share the root session ID.

The initial child negative test hit the sandbox's lock-write restriction before the identity check. The helper now checks identity before locking and keeps status read-only. The corrected live negative test passes on both runtimes: real native children receive `receipt belongs to a different session or a parent thread`. A broad before/after fixture snapshot was not a valid no-write assertion because it was taken before asynchronous root startup hooks finished invalidating old-version state; it is not counted as a passing invariant. The status implementation and unit test independently establish that it never requests a write lock. Root on/off writes outside the project can still require normal command approval; trust in a hook does not grant shell commands broad write access.

A separate actual Desktop profile has been launched using verified installed startup support for `CODEX_ELECTRON_USER_DATA_PATH`, a separate `--user-data-dir`, and the isolated `CODEX_HOME`. Its IPC endpoint is inside that test home. GUI skill-selector and conversation confirmation remain pending; bundled CLI evidence does not replace them. No OS Accessibility or Screen Recording permission was granted.

## Coverage limits and remaining checks

- Actual Desktop skill-selector and conversation checks remain pending user confirmation in the isolated GUI profile.
- Manual compaction and resume were exercised live. Automatic context-limit triggering, deliberate host-hook timeout, and host missing-interpreter behavior were not forced; do not label those as separately passed live tests.
- Changed instructions invalidate stored state through the policy hash. Stale-state behavior, malformed state, concurrent-lock handling, and killed-process lock recovery pass unit tests. Updated fixture hooks remained trusted through the normal plugin lifecycle, but broader upgrade/uninstall data cleanup is not implemented or claimed.
- Skill install/disable/re-enable/uninstall/reinstall has automated host coverage. This does not imply that uninstall removes project persona files or mode data.
- Read-only native status and child rejection now occur before any writable lock. Root on/off requests retain the host's ordinary one-time command-approval boundary for plugin data outside the project.

## Semantic differences requiring review

- **Natural-language activation:** the primary interprets the current user's intent and calls the narrow `on/off/status` setter; hooks never parse prompts or transcripts. Only root SessionStart issues a receipt. The setter requires `CODEX_THREAD_ID == CODEX_SESSION_ID == receipt.session`, the matching project, and a current policy hash. Hooks restore the matching session/project/opaque-transcript state. Explicit off records an inactive tombstone, including for stale instructions. This preserves natural-language interaction through model-mediated recording; manual compaction and off-state resume pass on both tested runtimes, without claiming identical native Cursor mode control. Environment variables prevent accidental cross-thread use, not deliberate same-user spoofing.
- **Host identity evidence:** root session/thread equality is established in [Codex 0.156](https://github.com/openai/codex/blob/rust-v0.156.0/codex-rs/core/src/session/session.rs#L860-L881) and [0.159.2](https://github.com/openai/codex/blob/rust-v0.159.2/codex-rs/core/src/session/session.rs#L856-L877). [SessionStart dispatch](https://github.com/openai/codex/blob/rust-v0.156.0/codex-rs/core/src/hook_runtime.rs#L119-L154) excludes native spawned children. Hook transcript paths are opaque host identities; no file-name parsing or transcript reading is used. State locking uses crash-released POSIX advisory locks; Windows lifecycle support has not been implemented or claimed.
- **Mode retention:** state is scoped to host identity and retained in host-managed plugin data until explicit lifecycle cleanup. There is no silent TTL expiration, preserving until-opt-out intent. A policy change invalidates restoration through the instruction hash. Storage cleanup must not be represented as implemented.
- **Long-running work:** the local port does not provide Cursor cloud workers or a new `/loop` daemon. Workflows use actual native capacity and continuation capabilities. Missing cadence or restart survival is reported; never silently convert event automation into polling.
- **Optional integrations:** Benny remains a dormant source pack; the external Grok Bot/Tailscale workflow keeps its explicit prerequisites. Neither is provisioned or enabled by installing CStack.

## Where to focus review once the gates pass

Review the native runtime contract and model-role semantics first, then persona ownership and hook activation/isolation. Confirm every inventory disposition and any capability gap before reading individual prompt edits. PR 2 owns the concise public README and branding. Personal model/advisor enhancements are outside this PR.


## Short manual Desktop check

Do not install this branch into the production Desktop profile. Use only an approved isolated Desktop profile whose Codex home and application-data isolation have both been verified; the installed build supports the verified profile/home overrides and `--open-project` route used by this test. Otherwise defer this GUI check until the user's post-merge installation. No broad macOS Accessibility or Screen Recording grant is needed for a human check.

1. In the isolated profile, complete normal sign-in if needed; never copy production credentials. Open only the disposable test project and review its normal project-trust prompt.
2. Confirm CStack's 47 skills in the selector. Review only its SessionStart/UserPromptSubmit hooks through the normal hook UI, if separately approved.
3. Ask to enable Poteto Mode naturally, verify the setter receipt, then ask to turn it off. Test a quoted activation example; it must not change stored mode.
4. Repeat on/off across resume and compaction; check a harmless native-persona task and child isolation. Record actual results and app/runtime versions. Keep the PR unmerged and production untouched until its remaining gates are accepted.


Existing-login limitation: `--ephemeral` could authenticate and read the contract, but native child creation failed because the parent had no saved rollout. Repeating as a normal disposable test conversation passed. This leaves a test history record in the existing Codex home, not a configuration or access change. An external `selectedCapabilityRoots` plugin route exists, but its executor currently filters ordinary command hooks, so it cannot substitute for this plugin's trusted lifecycle canaries.
