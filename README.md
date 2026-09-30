# CStack

A Codex port in progress of [PStack](https://github.com/cursor/plugins/tree/main/pstack), by [poteto](https://x.com/poteto) (Lauren Tan). Rigorous engineering workflows for understanding, designing, building, and verifying software.

CStack starts from an exact copy of PStack 0.15.5. The baseline retains all 47 skills, 23 playbooks, agent personas, helper scripts, and optional automation sources.

## Status

**The Codex port is in development. It is not ready to install.** [PR 1](https://github.com/Camgineer/cstack/pull/1) covers native agents, plugin packaging, permissions, lifecycle behavior, and validation. Installation instructions follow tested support. No custom model or advisor policy is part of the baseline.

- [Port architecture and support plan](./docs/codex-port/PLAN.md)
- [Workflow guide](./docs/guide/README.md) — adapted workflows with explicit validation limits.
- [Skills](./skills/) and [playbooks](./skills/poteto-mode/playbooks/)

## Credit

PStack's workflows and engineering principles come from poteto. See the [original PStack](https://github.com/cursor/plugins/tree/main/pstack) and [exact imported version](https://github.com/cursor/plugins/tree/fae2c6ed95821bd85f614a73e4842e13229fa5e5/pstack).

CStack's Codex adaptation is maintained separately. The original [MIT license](./LICENSE), including **Copyright (c) 2026 Lauren Tan**, is preserved.
