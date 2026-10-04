# Merge gate

A merge gate is the set of required checks that lets a PR merge itself the moment every check is green, with no human merge click. Green stands in for the reviewer's verdict. The operator's judgment moves earlier, into the spec they sign with the **align** skill, and the gate enforces that spec.

Use this reference to build or change a repository's CI, to decide whether a PR may merge on green, and to map a spec's acceptance criteria to checks.

## Trusted

A gate is trusted when every item holds. Otherwise it is untrusted, and the playbooks' human-merge and independent-verdict rules apply unchanged.

- Every layer in **Layers** that applies to the repo runs as a required check on the base branch under a stable check name. A layer that does not apply has a one-line reason in the repo's agent guidance, such as "No packaging layer, because nothing ships outside the deploy."
- Each layer has gone red on a seeded fault before it counts. A check never seen red proves nothing.
- The p95 wall clock of the whole gate over its last 20 runs is inside **Budget**, and no check both passed and failed on one commit in those 20 runs.
- The repo's agent guidance (its `AGENTS.md` or equivalent) declares the gate, links this reference, and tells agents to run the fast lane before every push. The declaration is a commit the operator authored, or approved through code-owner review of the agent-guidance file. An agent never adds or edits it. That declaration is the operator's standing merge authorization for PRs that pass the gate.
- The forge has auto-merge enabled and requires code-owner review on the gate paths only, through a CODEOWNERS file that lists them. The operator owns every gate path: workflow files, check scripts, formatter and analyzer config, mutation excludes, the interface snapshot tool, reviewer prompts and model IDs, the spec directory, and the agent-guidance file.

## Working under a trusted gate

1. **Sign the spec as its own PR.** Commit the spec as a file under the repo's spec directory in a PR of its own. The operator's approving review on that PR is the sign-off, per the **align** skill, and it is the one human click. It lands before the first slice.
2. **Link the spec from every slice.** Each slice PR links the spec file on the base branch and carries the `## Evidence` table from **Spec PRs** in `../playbooks/opening-a-pr.md`.
3. **Arm on ready.** When the Readiness items that live outside CI hold (`deslop`, `no-comments`, the description, authorship), mark the PR ready and arm auto-merge in the same step, such as `gh pr merge <pr> --squash --auto` or the resolved forge's equivalent. The forge merges when every required check is green. Arm only a PR whose base is trunk. A stack child waits for its retarget per steps 4 to 7 of `../playbooks/shipping.md`.
4. **Treat red as a finding.** Fix the cause. Never rerun a red check to get green.
5. **Dispute a blocking review finding once.** Post the disproof on the thread. The reviewer lane reruns with the disproof in its brief. A finding that still blocks goes to the operator.
6. **Keep gate changes human.** A PR that touches a gate path waits for the operator's review, because a gate cannot vouch for its own weakening.

## Layers

| Layer | Passes when | Example tools |
| --- | --- | --- |
| Format | One opinionated formatter in check mode reports no diff. | Prettier or Biome, Black or Ruff format, gofmt, rustfmt, clang-format, dotnet format |
| Build and analyzers | The build or typecheck succeeds with every warning, style rule, and analyzer rule as an error. | strict typecheck plus a linter at zero warnings, `clippy -D warnings`, warnings-as-errors with analyzers |
| Behavior tests | Tests drive the code through the seam its users call and assert literal results, per the **principle-test-behavior-not-implementation** skill. | the ecosystem's test runner |
| Mutation | No mutant on a changed line survives the tests, since a survivor marks a test that cannot fail. The run covers only the diff's changed lines, and exclusions live in committed config. | Stryker, PIT, mutmut, cargo-mutants, Gremlins |
| Live acceptance | A headless script drives each acceptance criterion on the real surface, asserts its observable outcome, and uploads a capture, screenshot, or transcript for the Evidence table. Criteria the spec marks "always holds" run on every PR. The rest run on PRs that claim them. | the project's verification skill, `control-cli`, `control-ui` |
| Platform and packaging | The shipped artifact builds for each target, installs into a clean environment, and launches. | container build and run, package install from the built archive, one build per target platform |
| Public interface | The regenerated snapshot of the public surface matches the committed snapshot file for each package, and the signed spec's Low-level design names every symbol the snapshot diff changes. This keeps the operator in lockstep on design without a merge click. | API Extractor, cargo-public-api, japicmp, griffe, apidiff |
| Spec | The PR links a spec file on the base branch whose last change carries the operator's approval. Every AC row in the Evidence table exists in that spec, reads VERIFIED, and links each proof that the spec's Verification plan names. The CI check that the plan's CI check column names for each claimed AC ran green on this head. | a repo script over the PR body and the spec file |
| AI review | Two reviewers from different model families report no blocking finding. A blocking finding names a failing input, a repro, or the spec line it breaks. Other findings post as comments. | agent CLIs run headless in CI |

Brief each AI reviewer with the **interrogate** skill's `references/reviewer-prompt.md`, filled with its rubric and code-quality lens, the diff, and the signed spec. Leave out the PR body's claims and the author's transcript. Run each reviewer headless with credentials the operator supplies as a repository secret, with the model ID pinned.

## Budget

A slow or flaky gate is a defect. Fix it before the next feature.

- **Wall clock.** The whole gate finishes in under 5 minutes, p95, from push to the last check. Set each job's timeout at twice its share of the budget.
- **Fast lane first.** Format, build and analyzers, and behavior tests run in one fast lane that finishes in under 1 minute. The slow lanes start in parallel with it, and a red fast lane cancels them.
- **Cache.** Key dependency caches on the lockfile hash, build caches on their inputs, and test and mutation results on the content hash of what they cover.
- **Scope to the diff.** Mutation, review, and the claimed live checks run on what the PR changes. A new push cancels the run on the old head.
- **Flakes.** A check that passed and failed on the same commit is flaky. Fix or delete it in its own PR before anything else merges. The gate is untrusted until then.

## Building the gate

1. Write each layer as a script in the repo that runs the same way locally and in CI, and have CI call the script.
2. Build one layer per PR. Each PR shows its layer red on a seeded fault and green on the base branch, and records both in `## Verification`.
3. Pin third-party CI steps by digest. Grant each job the least permission it needs. Expose secrets only to the review lane.
4. Make every layer a required check, enable auto-merge, and list the gate paths in CODEOWNERS. Once every **Trusted** item holds, hand the operator the agent-guidance declaration to commit or approve.
