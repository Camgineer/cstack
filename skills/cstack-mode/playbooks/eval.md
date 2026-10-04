### Eval

**You own the experiment design. Plan, blind, run, synthesize.**

**Non-negotiables for blinding:**

- No `eval`, `test`, `judge`, `experiment`, `rubric`, `score`, `compare`, `benchmark`, `candidate`, or `arena` in any directory, file, or prompt the candidate sees.
- The candidate prompt looks like an organic user request. State the goal, not the meta.
- No chain-eliciting cues. Don't ask the candidate to list which skills, principles, or files they applied. Ask for design notes generally and grade chain-following from code shape, not self-report.
- Sanitize directory and slug names. Use project-shaped names a user might pick.
- Don't tell the candidate other candidates exist.
- The judge can know it's judging but sees outputs by sanitized label only, never by model name.
- Comparing two variants: one judge scores both sets in a single pass on one scale, blind to which set each came from.

**Steps:**

1. **Frame.** State what variant is under test and what behavior counts as success. Write the rubric (3-6 concrete criteria) for the judge only. Hold it back from candidates.
2. **Set up sanitized environments.** Per-candidate working dir with the variant in place. Plant any context an organic task would have: a project skeleton, the skills the candidate would naturally read.
3. **Author one organic prompt.** What a user would type. No leakage of what's being measured.
4. **Spawn N parallel candidates** on different models per the **arena** skill's Phase B. Each works in its own sanitized dir. Same prompt to each.
5. **Spawn one blinded judge** on a different model family per the **arena** skill's Phase C. Judge sees outputs by sanitized label and the rubric, never a model name.
6. **Verify the chain from transcripts, not self-report.** Read each candidate's actual tool history through the host's supported history tools or an authorized export. If unavailable, mark chain-following unverified. Do not inspect private host transcript storage. Look at which files each candidate actually opened. Grade chain-following from the files it really read plus the shape of the code, never from the candidate's own claims.
7. **Read every candidate output yourself** end to end. Compare to the judge's verdict. Disagreement means a model is biased or the rubric is ambiguous. Synthesize.

**Evaluating a skill.** Run the steps above with these additions:

- **Baseline.** Each task runs twice under the same prompt, model, and environment: once with the skill and once without it. When revising an existing skill, the baseline is a snapshot of the previous version. Launch both arms together. Give both arms the same input artifacts. Score lesson quality or the task outcome, never a count that the revision itself makes possible, such as uses of a route it adds.
- **Repeated work.** Read the transcripts of the with-skill runs. A helper script or multi-step procedure that several runs wrote independently belongs in the skill's `scripts/`, with the skill pointing to it.
- **Trigger evals.** Write about 20 realistic requests: half that should load the skill, half near-misses that share its keywords but need something else. Make each one substantive enough that an agent would reach for a skill at all. Run each request a few times and score the trigger rate against the expected answer. Revise the description against a train split of about 60 percent, and keep the version with the best score on the held-out rest.

**Reply:** variant under test, rubric, per-candidate notes, judge's verdict, your synthesis, and a recommendation for whether to promote the variant.
