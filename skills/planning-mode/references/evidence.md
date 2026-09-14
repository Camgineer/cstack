# Decisions, evidence, and artifacts

Read this file before research, grilling, prototypes, visuals, or artifact work.

## Materiality and intake

A question is material when different answers change the product outcome, public or domain language, architecture, stored data, permissions, privacy, cost, rights, delivery authority, dependencies, acceptance, or proof. Record the question and its affected branches.

Start with the user's requested outcome. Use problem-first intake when the problem, user, current behavior, or success condition is unclear. Do not force a full interview when those facts are already settled.

Classify evidence as `VERIFIED`, `PROVISIONAL`, `CONFLICTING`, `MISSING`, or `UNAVAILABLE`. State what each item proves and its limits. Prefer the cheapest observation that can decide the question. Stop gathering evidence when another source cannot change a current material decision, acceptance criterion, or risk disposition. This is the Q39 stop rule.

Missing or conflicting evidence blocks only dependent decisions. Continue independent branches.

## Installed methods and read triggers

Use these resolved methods as bounded inputs. Read each file in full when its trigger fires. Current user decisions and tracker records govern scope and authority.

- For a substantive product, architecture, process, or priority decision, read [Knowledge Librarian](/Users/cameron/.agents/skills/knowledge-librarian/SKILL.md) and retrieve a small current brief before advising.
- For a bounded factual investigation that needs primary sources, read [Research](/Users/cameron/.agents/skills/research/SKILL.md).
- For a planning question round, read [Grilling](/Users/cameron/.agents/skills/grilling/SKILL.md), [Domain Modeling](/Users/cameron/.agents/skills/domain-modeling/SKILL.md), and [Show Me](/Users/cameron/.agents/skills/show-me/SKILL.md). Use the smallest useful visual beside the questions.
- For large uncertain work spanning sessions, read the pinned [Wayfinder method](https://github.com/mattpocock/skills/blob/3cca18b368ae95cdbdebbff572ccafa662551015/skills/engineering/wayfinder/SKILL.md) and current tracker operations.
- Before turning settled decisions into a specification or implementation records, read [To Spec](/Users/cameron/.agents/skills/to-spec/SKILL.md) and [To Tickets](/Users/cameron/.agents/skills/to-tickets/SKILL.md).

If a method is absent, unreadable, explicit-only, or unsupported in the active runtime, record that fact and use only an approved bounded fallback. Do not claim automatic activation, another host's Skill API, or inherited authority. Keep vendor packages unchanged.

## Decision rounds

For every currently answerable material question:

1. State the recommendation first and cite the evidence that supports it.
2. Include only materially distinct viable alternatives. State the tradeoff and when each wins.
3. Show the smallest useful Mermaid diagram, literal tree, comparison, or concrete example when it clarifies the choice.
4. Ask the full answerable frontier for that round. Wait for the user's decisions.
5. Record each answer, source, reason, affected records, and reopening observation. Recompute the frontier.

The user decides preferences, product tradeoffs, authority, and other material choices. The lead retrieves facts and settles routine technical details inside approved scope.

## Prototypes

A prototype has one status: `Proposed`, `Isolated`, `Evidence captured`, `Disposed`, or `Promoted by implementation contract`.

Use a disposable prototype only when observation can settle a material question. Name the question, allowed files and runtime, cost, expected observation, disposal owner, and stop condition first. Free isolated work may proceed within existing authority. Paid generation needs exact bounded approval.

Retain the prompt, inputs, settings, requested and observed model or tool route when available, outputs for the approved batch or fallback, reasons, hashes, and intended downstream use. A prototype becomes production work only through an approved implementation contract. Dispose of run-owned resources or record the exact promotion.

## Visual and creative evidence

Use Mermaid for flows. Use fenced monospace trees for literal hierarchy. Use Visualize only when explicitly invoked. Use Canvas or Sites only when their actual deliverable is in scope.

Identify each reference image and creative sample by source, rights status, hash or stable revision, approved traits, rejected traits, and allowed downstream use. Approval of a style reference does not grant permission to copy protected content or ship a prototype.

For a decision-bearing visual, inspect the rendered result. Syntax success alone is not visual proof. For a required original, retrieve it through a supported path, compare its SHA-256 with the recorded bytes, and open it in the intended consumer before Ready. An invalid link, inaccessible original, altered hash, or failed rendering blocks the dependent Ready claim.

## Artifact ownership

Attach or link artifacts from their owning ticket. Preserve current private access. Use an existing large-file convention when one applies. Treat unavailable storage as a dependency. Do not install storage, LFS, hosting, publication, or migration during planning.

After every artifact or tracker write, read back saved content and rendered structure. Keep raw content and hashes. Keep screenshots when visual meaning matters.

Use LikeC4 only when settled architecture meaning needs a durable versioned view of systems, components, trust, deployment, data, or interactions. Its first use needs a separately authorized repository-local pinned pilot. That later contract must cover formatting, validation, a self-contained `index.html`, no remote assets, disconnected opening, visual inspection, traceability, editability, and reconciliation with implementation. Planning Mode does not install or host LikeC4.
