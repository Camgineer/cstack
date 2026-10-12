---
name: why
description: "Use for design rationale, regressions, postmortems, or thresholds. Search historical evidence and distinguish facts from inference."
---

# Why

Find the evidence behind a design decision. Code shows what happens; author statements, history, and records may show why.

## 1. Anchor the question

Name the target, symbols, and question from the conversation. If scope is ambiguous, state your interpretation and continue. Pin the relevant commit and inspect the file's history:

```sh
git blame -L <start>,<end> <file>
git log --follow -p -- <file>
git log -1 --format=%B <commit>
gh pr view <number> --json title,body,comments,reviews,closingIssuesReferences
```

Record paths, commits, PR numbers, and linked tickets as the search seeds. Read [epistemics.md](references/epistemics.md) before forming conclusions.

## 2. Search the evidence

Discover available read-only sources. Cover source control, issue tracking, documents, team chat, infrastructure telemetry, error tracking, and product analytics. Record each as searched, unavailable, or skipped with a reason. Use the categories relevant to a narrow question; widen when the first evidence leaves a consequential gap. An unavailable source is a limitation, and an empty search is a finding.

Use [source-playbook.md](references/source-playbook.md) to choose category references and [investigator-prompt.md](references/investigator-prompt.md) for each pass. For defensive code, also read [incident-postmortem.md](references/sources/incident-postmortem.md). Keep queries scoped to the target and time window. Follow cross-source leads once rather than repeating the same search.

If the environment supports parallel read-only helpers, they may search distinct categories; otherwise do the passes yourself. Keep findings separate by source. Search and read only; the question authorizes no external writes or permission changes.

## 3. Synthesize

Use [synthesizer-prompt.md](references/synthesizer-prompt.md). Verify citations, surface contradictions, and distinguish direct evidence, supported conclusions, inference, speculation, and unknowns. Preserve each claim's confidence when editing the answer. Treat the person's proposed rationale as a hypothesis to test.

Return the answer with searched sources and concrete gaps. For a question that precedes a change, add the constraints the evidence implies: preserve, change, avoid, and risk. Omit empty sections and repeated summaries. The newest commit is a lead, not automatically the authoritative rationale.
