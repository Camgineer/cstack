---
name: simple-as-prose
description: Write or revise prose for a person or an agent so it is plain, specific, and easy to act on. Use for replies, docs, PRs, commits, code comments, UI copy, and rewrites that should drop AI tone.
license: MIT
metadata:
  authors: "Alex Hormozi, @Anthony-Lionetti, @Camgineer"
  source: "ai-tells.md adapts unslop from PStack by Lauren Tan, https://github.com/cursor/plugins/tree/main/pstack/skills/unslop, and humanizer by Siqi Chen, https://github.com/blader/humanizer. See humanizer-origin.json and humanizer-LICENSE."
---

# Simple as prose

Write so the reader gets the point on the first pass and knows what to do next. When revising, keep the meaning, facts, required terms, tone, and constraints.

## Set the job

Before drafting, settle who the reader is, what they already know, the outcome you want, and their next action. Ask only when a missing answer would change the result.

## Write the point first

- Lead with the result, decision, risk, or request.
- Give each sentence one idea. Split any sentence that makes the reader backtrack.
- Use active voice, present tense, concrete nouns, and strong verbs.
- Use the shortest familiar word that keeps the meaning. Keep needed technical terms, and explain them when the reader may not know them.
- Give each concept one name and repeat it.
- Back claims with facts, examples, numbers, names, or observable criteria. Label an inference or a guess as one.
- Name the owner, action, timing, blocker, and proof when they affect what happens next.
- Keep warmth, humor, and opinion when they help the message.

## Match the form to the job

- Show structure instead of describing it. Use a table to compare options and a Mermaid diagram for a flow, an architecture, or a before and after state. Use prose for the reasoning between them.
- Keep chat and status updates short, with the result before the process.
- Write requests so the reader can act without guessing.
- Write procedures as direct commands. Put the condition before the instruction. Number only real sequences.
- Keep reference factual and complete, with persuasion left out.
- Explain a topic through its real cause, constraints, tradeoffs, and consequences.
- Give tutorials a visible result early, and tell the reader what they should see.
- Keep a code comment only for a reason the code cannot show, such as a rationale, an external constraint, or a measured tradeoff.

## Common AI tells

Replace these on sight. For documents, PRs, skills, and rewrites, also check the full list in [ai-tells.md](ai-tells.md).

- Openings, sign-offs, praise, and closing summaries. Start with the point and stop when it is made.
- Inflated words. Write "use" for "utilize" or "leverage", "help" for "facilitate", and "is" for "serves as".
- Stock AI words such as delve, crucial, pivotal, foster, enhance, landscape, tapestry, testament, underscore, and vibrant. Use the concrete word.
- "Not just X, but Y" and other contrast framing. State the point.
- Groups of three forced by rhythm. Use the natural count.
- Trailing "-ing" phrases such as "ensuring..." or "highlighting...". Name the actor and the action, or cut the phrase.
- Arrows, dropped articles, and verbless fragments. Write whole sentences.
- Run-ups such as "Here's the thing", sayings such as "at its core", and one-line closers that restate the point. State the claim and stop.

## Punctuation

- Separate ideas with periods and commas. Where a dash might go, start a new sentence. Em dash and en dash characters never appear.
- Use a colon only before a list or an example.
- Use straight quotes, sentence-case headings, and no decorative emoji.
- Use bold, headings, and lists only when they make the text easier to scan.

## Edit pass

1. Check that the first sentence orients the reader.
2. Cut each word and sentence that adds no meaning, evidence, needed tone, or context.
3. Fix unclear pronouns, modifiers, conditions, and list groupings.
4. Replace every AI tell. Use [ai-tells.md](ai-tells.md) for documents, PRs, skills, and rewrites.
5. Search for em dash and en dash characters and replace each one.
6. When revising, compare the result with the original. It adds no fact, name, number, date, quote, or claim the original lacks, and drops none that still applies. Each claim keeps its certainty. A shorter "failed" for "may have failed" is a new claim, so keep the hedge. When a sentence needs a detail you do not have, ask for it or write a simpler sentence.
7. Read once at normal speed. Revise anything that sounds scripted, stiff, or vague.

## Return the right artifact

- For a rewrite, return the improved text. Explain changes only when that helps.
- For a critique, name the main problems, give the revision, and list the rules that mattered most.
- For a draft, infer the reader and outcome, and write the shortest complete version.
- In conversation, answer directly and leave this process unmentioned.

## Done when

- The reader gets the point on the first pass.
- The next action is explicit when there is one.
- Every claim is sourced, measured, or labeled as an inference or a guess.
- Every sentence earns its place.
- The text reads like a capable person wrote it for this reader.
- No em dash or en dash characters remain.
