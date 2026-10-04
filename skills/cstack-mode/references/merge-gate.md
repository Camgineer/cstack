# Merge gate

A merge gate is the set of required checks that lets a PR merge itself the moment every check is green, with no human merge click. Green means everything a reviewer would have verified. The operator's judgment moves earlier, into the spec they sign with the **align** skill, and the gate enforces that spec.

Use this reference to build or change a repository's CI, to decide whether a PR may merge on green, and to map a spec's acceptance criteria to checks.

## Trusted

A gate is trusted when every item holds. Otherwise it is untrusted, and the playbooks' human-merge and independent-verdict rules apply unchanged.

- Every layer in **Layers** that applies to the repo runs as a required check on the base branch under a stable check name. A layer that does not apply has a one-line reason in the repo's agent guidance, such as "No packaging layer, because nothing ships outside the deploy."
- Each layer has gone red on a seeded fault before it counts. A check never seen red proves nothing.
- The p95 wall clock of the whole gate over its last 20 runs is inside **Budget**, and no check is flaky.
- The repo's agent guidance (its `AGENTS.md` or equivalent) declares the gate and links this reference. That declaration is the operator's standing merge authorization for PRs that pass the gate.
- The forge has auto-merge enabled and requires code-owner review. The operator owns every gate path: workflow files, check scripts, formatter and analyzer config, mutation excludes, the interface snapshot tool, reviewer prompts and model IDs, and the spec directory.

## Working under a trusted gate

1. **Sign the spec as its own PR.** Commit the signed spec as a file in the repo's spec directory. The operator's approving review on that PR is the signature, and it is the one human click. It lands before the first slice.
2. **Link the spec from every slice.** Each slice PR links the spec file on the base branch and carries the `## Evidence` table from **Spec PRs** in `../playbooks/opening-a-pr.md`.
3. **Arm on ready.** When the Readiness items that live outside CI hold (`deslop`, `no-comments`, the description, authorship), mark the PR ready and arm auto-merge in the same step, such as `gh pr merge <pr> --squash --auto` or the resolved forge's equivalent. The forge merges when every required check is green.
4. **Treat red as a finding.** Fix the cause. Never rerun a red check to get green.
5. **Dispute a blocking review finding once.** Post the disproof on the thread. The reviewer lane reruns with the disproof in its brief. A finding that still blocks goes to the operator.
6. **Keep gate changes human.** A PR that touches a gate path waits for the operator's review, because a gate cannot vouch for its own weakening.

## Layers

| Layer | Passes when | Example tools |
| --- | --- | --- |
| Format | One opinionated formatter in check mode reports no diff. | Prettier or Biome, Black or Ruff format, gofmt, rustfmt, clang-format, dotnet format |
| Build and analyzers | The build or typecheck succeeds with every warning, style rule, and analyzer rule as an error. | strict typecheck plus a linter at zero warnings, `clippy -D warnings`, warnings-as-errors with analyzers |
| Behavior tests | Tests drive the code through the seam its users call and assert literal results, per the **principle-test-behavior-not-implementation** skill. | the ecosystem's test runner |
| Mutation | No mutant on a changed line survives the tests. | Stryker, PIT, mutmut, cargo-mutants, Gremlins |
| Live acceptance | A script drives each acceptance criterion on the real surface and asserts its observable outcome. | the project's verification skill, `control-cli`, `control-ui` |
| Platform and packaging | The shipped artifact builds for each target, installs into a clean environment, and launches. | container build and run, package install from the built archive, one export per target platform |
| Public interface | The committed snapshot of the public surface matches the code, and the signed spec names every symbol the snapshot diff changes. | API Extractor, cargo-public-api, japicmp, griffe, apidiff |
| Spec | The PR links a signed spec and carries evidence for every acceptance criterion it claims. | a repo script over the PR body and the spec file |
| AI review | Two reviewers from different model families report no blocking finding. | agent CLIs run headless in CI |

**Mutation.** Scope the run to the diff's changed lines so it fits the budget. A surviving mutant means a test that cannot fail. Exclusions live in committed config, which the operator owns.

**Live acceptance.** Run headless. Each run uploads its capture, screenshot, or transcript so the Evidence table can link it. Criteria the spec marks "always holds" run on every PR as regression checks. The rest run on PRs that claim them.

**Public interface.** Generate the public surface into a committed snapshot file per package. The check fails when the regenerated snapshot differs from the committed one. It also fails when the committed snapshot changes a symbol that the signed spec's Low-level design does not name. This keeps the operator in lockstep on design without a merge click.

**Spec.** Pass when all hold:

- The link resolves to a spec file on the base branch whose last change carries the operator's approval.
- Every AC row in the Evidence table exists in that spec and reads VERIFIED.
- Every proof column that the spec's Verification plan fills for that AC is filled and links its proof.
- The CI check that the Verification plan names for each claimed AC ran green on this head.

**AI review.** Fill the **interrogate** skill's `references/reviewer-prompt.md` with its rubric and code-quality lens, the diff, and the signed spec. Leave out the PR body's claims and the author's transcript. Pin each reviewer's model ID. A blocking finding names a failing input, a repro, or the spec line it breaks. Any blocking finding from either reviewer fails the check. Post the other findings as comments. Run each reviewer through an agent CLI signed in with the operator's subscription where the provider's terms allow automated use, from a repository secret or a self-hosted runner where the CLI is already signed in. Use a paid API key only where the terms forbid that use.

## Budget

A slow or flaky gate is a defect. Fix it before the next feature.

- **Wall clock.** The whole gate finishes in under 5 minutes, p95, from push to the last check. Set each job's timeout at twice its share of the budget.
- **Fast lane first.** Format, build and analyzers, and behavior tests run in one fast lane that finishes in under 1 minute. The slow lanes start in parallel with it, and a red fast lane cancels them.
- **Cache.** Key dependency caches on the lockfile hash, build caches on their inputs, and test and mutation results on the content hash of what they cover.
- **Scope to the diff.** Mutation, review, and the claimed live checks run on what the PR changes. A new push cancels the run on the old head.
- **Flakes.** A check that passed and failed on the same commit is flaky. Fix or delete it in its own PR before anything else merges. The gate is untrusted until then.

## Building the gate

1. Write each layer as a script in the repo that runs the same way locally and in CI, and have CI call the script. Agents run the fast lane before every push.
2. Build one layer per PR. Each PR shows its layer red on a seeded fault and green on the base branch, and records both in `## Verification`.
3. Pin third-party CI steps by digest. Grant each job the least permission it needs. Expose secrets only to the review lane.
4. Make every layer a required check, enable auto-merge, assign the gate paths to the operator, and declare the gate in the repo's agent guidance last, once every **Trusted** item holds.
