# CStack

CStack brings PStack's engineering workflows to Codex, with skills for investigation, implementation, review, and writing. It builds on [PStack by Lauren Tan (poteto)](https://github.com/cursor/plugins/tree/main/pstack) and contains 49 skills.

## Get started

The plugin's Git source is `https://github.com/Camgineer/cstack.git`. The current development candidate is on `core-codex-compatibility`. Select that branch when adding the source. A GitHub source field that accepts a branch-qualified repository can use `Camgineer/cstack@core-codex-compatibility`.

The repository includes a Codex marketplace manifest at `.agents/plugins/marketplace.json` and the plugin manifest at `.codex-plugin/plugin.json`. Use the plugin installation controls available in your host. The candidate remains under review in [PR10](https://github.com/Camgineer/cstack/pull/10).

Once CStack is available in your session, ask it to run `setup-pstack` to check the tools and workflows your host supports. Then use `poteto-mode` for an engineering task. Where the host supports qualified skill names, use `$cstack:poteto-mode`.

For example:

```text
Use CStack's poteto-mode to reproduce the invoice export bug, fix its cause,
and verify the exported amounts. Prepare a PR for review.
```

Poteto Mode chooses a playbook and loads the skills needed for the task. It applies to the current task. Models follow your supported host choices, and workflows report missing tools or model options before relying on them.

## Choose a skill

| Task | Skill |
| --- | --- |
| Run an engineering task from investigation through verification | `poteto-mode` |
| Explain how existing code works | `how` |
| Investigate why a decision was made | `why` |
| Compare designs before implementation | `architect` |
| Review a change | `interrogate` |
| Build with a failing test first | `tdd` |
| Coordinate independent tasks | `swarm` |
| Write clear prose for people | `simple-as-prose` |
| Write prompts, skills, and agent instructions | `writing-for-agents` |
| Capture lessons from completed work | `reflect` |

The [skill directory](skills/) contains the full catalog. Playbooks, principles, persona prompts, and references are instructions the agent loads as needed. This README is the repository's only human guide.

Some workflows need additional tools. The Bun helpers require their locked dependencies, the PR watcher requires `gh`, and the Orchestrate stack frontier requires Graphite. Benny and `make-bot-ui` contain optional Cursor automation sources that still need adaptation for Codex.

## Develop and verify

Tooling uses Bun and strict, erasable TypeScript. The versions are pinned in [package.json](skills/poteto-mode/scripts/package.json) and the dependency lockfile.

With the pinned Bun runtime available, run these commands from a checkout:

```bash
bun install --cwd skills/poteto-mode/scripts --frozen-lockfile --ignore-scripts
bun run --cwd skills/poteto-mode/scripts typecheck
bun run --cwd skills/poteto-mode/scripts test
```

For a Linux x86_64 cloud environment with Node and npm available, use `bash .codex/setup.sh` as the Install script. It installs the pinned Bun runtime into `/workspace/.cstack-tools`, installs locked dependencies, and runs the checks. Add `/workspace/.cstack-tools/bin` to the environment PATH. Save and republish the tested environment so new tasks inherit the setup.

Plugin discovery can also be tested in a disposable, credential-free home. After explicit authorization to install the candidate for that test, run:

```bash
bun tests/discovery.ts --allow-isolated-install --codex <binary>
```

The flag guards the command; it does not grant permission. Source checks and isolated CLI tests cover their own execution paths. Verify host-specific behavior in the host where you intend to use CStack.

## PStack updates

PStack updates enter CStack through reviewed, agent-assisted imports. An agent compares upstream changes with the recorded baseline, adapts useful changes to CStack, and verifies the result in a PR. CStack can change upstream structure and behavior to suit its own design.

The imported baseline is PStack 0.15.5 at `cursor/plugins@fae2c6ed95821bd85f614a73e4842e13229fa5e5`. The original import remains in Git history at `c31f7ace991843f5576398ad025969465251192c`.

## License

[MIT](LICENSE). Upstream license notices and source provenance remain with the imported material.
