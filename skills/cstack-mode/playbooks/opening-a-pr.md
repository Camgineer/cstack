### Opening a PR

Invoked at the end of every other playbook.

**Worktree.** Work from a git worktree off main. Subagents inherit it. Multiple native subagent calls on the same branch each get their own worktree, or `git fetch && git reset --hard origin/<branch>` between them. Dirty branch with unrelated work: patch out, fresh worktree, apply. Snarled worktree: reset from main, redo minimally.

**Commits.** Commit liberally. Rebase into small, ordered commits before opening PRs, one purpose per commit. Each commit is a future PR: landable, ordered to tell the story. Amend when the fix belongs in a just-made commit. New commit when separable. Before regrouping commits that are already pushed, record `git rev-parse HEAD^{tree}`. Before the force-push, confirm the tree hash is unchanged. A different hash means the regroup changed content, so stop and restore the original branch.

**Authorship.** The user is the sole author of everything you produce: commits, PR titles and bodies, review comments, code, and docs. Before the first commit, read `git config user.name` and `git config user.email`. When either names a model, an agent, or a harness, set the repository's local identity to the user's, such as their forge noreply address, and ask once when you cannot find it. A forge squash adds a co-author trailer for every other commit author, so make every commit on the branch use the user's identity, and confirm it with `git log --format='%an <%ae>' <base>..HEAD`. Write each message with no co-author trailer for a model or agent, no "generated with" line, no session link, and no model name, even when the harness asks for them. When the user's organization enforces attribution through managed settings, keep it and tell the user. A PR or comment tool can append its own footer after you post, so read back each PR body and comment you post and edit out any attribution it added. Host settings that switch off the harness's own attribution are in its host note.

**PRs.** Run the **deslop** skill over the diff before commit. Run `no-comments` before review. Write every PR title, PR description, and commit body with `technical-writing`, then apply `simple-as-prose`. Apply every technical-writing layer except Diátaxis. Use one word for each action, keep articles, and avoid `-ing` when a plain verb works.

**Titles.** Use Conventional Commits in the form `type(scope): subject`. Use `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, or `perf` as the type. Use the changed area, such as `cstack-mode` or `swarm`, as the scope. Keep the subject short and imperative. Name a real symbol when one carries the change. For example, `fix(cstack-mode): retarget opening-a-pr babysit trigger`. Do not add a trailing period.

**Descriptions.** The PR body is a briefing, not the lab notebook. A reviewer who has the diff should learn why the change exists, what is out of scope, and how you proved the change works. The squash commit body is the PR body. If the body would make the squash commit longer than about 40 lines, cut the body.

Use these sections in order. Drop a section when it has nothing to say.

- `## Why`. State the intent and approach in one or two short paragraphs. Do not list SHAs or rebase genealogy. Do not add a "based on main" preamble.
- `## Scope`. Use bullets to list real symbols and paths. Name both sides of a rename or retarget. State what is in and out only when the boundary matters. Do not write a file-by-file essay.
- `## Tradeoffs`. Name only rejected alternatives that a reviewer would otherwise ask about. Skip this section when there was no real choice.
- `## Blast Radius`. In one to three sentences, name who or what the change touches and why the change is safe or risky. State the continuing cost if main stays red without the fix. End with a door call. Call it one-way when the merge is hard to undo, such as a schema migration, a public API, or deleted data. Call it two-way when a revert is cheap. The reviewer then knows how careful the merge must be.
- `## Verification`. Name each real run path and its outcome. For a performance change, report one primary number with its unit in `before → after` form. Link the arena or swarm directory for the remaining evidence. Do not include sample-size methodology, swarm recitals, or metric tables.

**Spec PRs.** When the **align** skill produced a signed spec, the bottom PR's description is that spec, and the 40-line limit gives way to it. Every PR in the stack ends with an `## Evidence` table in place of `## Verification`: one row per acceptance criterion it proves, every kind of proof that criterion's verification row names, and a verdict. Link or inline each proof so a reviewer can judge the PR from the table alone, before or after the merge. A PR that proves no criterion, such as a prefactor, keeps `## Verification`.

```markdown
| AC | Test | Eval | Live check | Review | Verdict |
| --- | --- | --- | --- | --- | --- |
| AC-1 | `test/tags.test.ts` passes, 6 cases | n/a | [terminal capture](link) | interrogate: met | VERIFIED |
```

After these sections, attach videos or screenshots when they prove a claim. Do not paste full SHAs, swarm or arena lane recitals, lever-correction essays, file-by-file checklists, or "CLEAN" verdicts. Put these details in a linked artifact. Do not use `## Summary` or `## Test plan` boilerplate. A commit body does not restate its subject.

**Forge.** Resolve the forge before the first PR operation and keep that choice for create, edit, view, watch, and merge. GitHub CLI (`gh`) is the default. If `command -v origin` succeeds and Origin can resolve the repository, prefer `origin pr ...`. If Origin is absent or cannot resolve the repository, stay on `gh` and record the fallback. Do not require Graphite (`gt`).

**Size and stacks.** Give each PR one purpose. Split anything that splits, and stack the pieces. A stack is a base-branch chain. The root PR targets trunk. Each child branch rebases onto its parent's exact tip and its PR targets the parent branch. Create a child as a draft per **Readiness**, with `gh pr create --draft --base <parent-branch>` or the Origin equivalent. Retarget an existing child with `origin pr edit <pr> --base <parent-branch>` or `gh pr edit <pr> --base <parent-branch>`. Branch from trunk only for independent work. Rebase on trunk before substantial stack work.

**Readiness.** Ready for review means merge-ready. The work is done and verified as fully as agentic automation can take it, so the only step left for the human is the merge. Their own validation is optional. Open every PR as a draft, and keep it a draft until every merge-ready item holds:

- Every check on the current head has completed and passed.
- The forge reports no merge conflicts with the base and no unresolved review threads. A required human approval is the one gate that may stay open.
- `deslop` and `no-comments` ran on the final diff.
- Every review-bot finding is triaged per `../references/bugbot-triage.md`. When a review bot or a check skips drafts, mark the PR ready once every other item holds. Then wait for that bot's or check's first pass on the ready PR, and triage it before you report the PR merge-ready.
- A reviewer other than the author reviewed the diff, and its proven findings are fixed. Use the **Delegate** capability for a fresh-context reviewer. When Delegate is missing, keep the draft and report this item as blocked.
- The load-bearing behavior is proven on the real surface the change touches, per the **prove-it-works** principle skill. For a docs-only or instruction-only change, the proof is a realistic run of the changed workflow, or `n/a: <reason>` recorded in **Verification**.
- The PR description is complete per **Descriptions**.
- Every commit author, commit message, and the PR title and body meet **Authorship**.
- No question or pending decision for the human is open.

Create the draft with `gh pr create --draft`, or with the draft status that `origin pr create --help` lists, according to the resolved forge. When a PR tool creates the PR, set its draft option to true. When every item holds, run `gh pr ready <number>` or `origin pr ready <number>`. When a ready PR regresses (red CI, a new proven finding, or a push whose patch-id differs from the verified one; a rebase that keeps the patch-id stays ready unless CI on the new head goes red), convert it back to a draft with `gh pr ready --undo <number>` or Origin's draft conversion, and mark it ready again only when every item holds. If Origin has no draft conversion, comment the regression on the PR and report it. If the forge or plan rejects drafts, open the PR normally and make the first line of its description `Not merge-ready: <open items>`. Remove that line when every item holds, and restore it on a regression. Run `origin pr view <number>` or `gh pr view <number>` before you refer to PR status.

**Retro.** When you report a PR merge-ready, after any post-ready review-bot pass is triaged, run the **reflect** skill in PR retro scope on it while this session still holds the work. The retro belongs to the agent whose session built the PR. An agent that marks another agent's PR ready asks that builder for its retro result, and runs the retro from the PR record only when the builder is gone. A retro never blocks or edits the PR under retro. The lessons PR it opens is the one PR you leave a draft once every Readiness item holds, and no agent merges it.

**Babysit.** A PR in a stack that is still being built does not get its own babysit. Post the URL and keep building, then run one babysit pass over the whole stack once it exists. A standalone PR, with no parent or child in the same build, is a finished stack once it opens. The agent that opened it runs `playbooks/babysit.md` in `drive` on that PR until the PR is marked ready per **Readiness**, or until only items the agent cannot close remain, and it reports those. A babysit for each new PR in an unfinished stack stalls the build and spends checks on commits that later waves restart. Push back when feedback drifts from intent.

A subagent that opens a PR runs `deslop` and `no-comments`, plus `interrogate` when the design is contested, and posts the URL. A subagent that opened a standalone PR then drives it to ready per **Babysit** before it returns, unless its brief says to return at the URL. A subagent that opened one PR of a larger stack returns to the parent without babysitting, unless it is an Autopilot-full or Autopilot-stack owner. That owner's brief assigns the babysit loop and is the ask `playbooks/babysit.md` waits for. The owner starts the loop after its code-ready report and reports loop-green or STACK-READY as its playbook says. The rules here and in `playbooks/babysit.md` that hold babysitting until a whole stack is built do not apply to that owner.
