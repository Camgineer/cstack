---
name: simple-as-prose
description: Write or revise prose for a person or an agent so it is plain, specific, and easy to act on. Use for replies, docs, PRs, commits, code comments, UI copy, and rewrites that should drop AI tone.
license: MIT
metadata:
  authors: "Alex Hormozi, @Anthony-Lionetti, @Camgineer"
  source: "ai-tells.md adapts unslop from PStack by Lauren Tan, https://github.com/cursor/plugins/tree/main/pstack/skills/unslop"
---

<a id="cstack-part-0"></a>

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

Replace these on sight. For documents, PRs, skills, and rewrites, also check the full list in [ai-tells.md](#cstack-part-1).

- Openings, sign-offs, praise, and closing summaries. Start with the point and stop when it is made.
- Inflated words. Write "use" for "utilize" or "leverage", "help" for "facilitate", and "is" for "serves as".
- Stock AI words such as delve, crucial, pivotal, foster, enhance, landscape, tapestry, testament, underscore, and vibrant. Use the concrete word.
- "Not just X, but Y" and other contrast framing. State the point.
- Groups of three forced by rhythm. Use the natural count.
- Trailing "-ing" phrases such as "ensuring..." or "highlighting...". Name the actor and the action, or cut the phrase.
- Arrows, dropped articles, and verbless fragments. Write whole sentences.

## Punctuation

- Separate ideas with periods and commas. Where a dash might go, start a new sentence. Em dash and en dash characters never appear.
- Use a colon only before a list or an example.
- Use straight quotes, sentence-case headings, and no decorative emoji.
- Use bold, headings, and lists only when they make the text easier to scan.

## Edit pass

1. Check that the first sentence orients the reader.
2. Cut each word and sentence that adds no meaning, evidence, needed tone, or context.
3. Fix unclear pronouns, modifiers, conditions, and list groupings.
4. Replace every AI tell. Use [ai-tells.md](#cstack-part-1) for documents, PRs, skills, and rewrites.
5. Search for em dash and en dash characters and replace each one.
6. Read once at normal speed. Revise anything that sounds scripted, stiff, or vague.

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


<a id="cstack-part-1"></a>

# AI tells

The full catalog for documents, PRs, skills, and rewrites. Each entry names the pattern and its fix. Adapted from unslop in PStack by Lauren Tan, MIT, https://github.com/cursor/plugins/tree/main/pstack/skills/unslop.

After fixing every match, ask what still makes the text read as machine-written, and fix that too.

## Content

- **Trailing "-ing" phrases** such as "highlighting...", "ensuring...", "reflecting...", or "fostering...". Name the actor and the action, or delete the phrase.
- **Vague attributions** such as "experts believe" or "industry reports suggest". Name the source or delete the claim.
- **Generic conclusions** such as "the future looks bright". State the specific plan or fact.
- **Feelings in place of mechanisms.** "SQL you can read" names a feeling. "`.toSQL()` returns the exact string sent to the database" names the mechanism. If a sentence could appear unchanged in another project's docs, it says nothing about this one, so cut it.

## Language

- **Stock AI words.** Additionally, crucial, delve, enduring, enhance, fostering, garner, interplay, intricate, landscape, pivotal, showcase, tapestry, testament, underscore, vibrant. Use the plain word.
- **Fancy ways to say "is"**, such as "serves as", "stands as", "boasts", or "features". Write "is" or "has".
- **Inflated words.** "Utilize" and "leverage" become "use". "Facilitate" becomes "help". "Numerous" becomes "many". "In the event that" becomes "if".
- **Contrast framing** such as "not just X, but Y". State the point.
- **Forced groups of three.** Use the natural count.
- **Synonym cycling**, where one thing gets four names in a paragraph. Pick one name and repeat it.
- **False ranges** such as "from X to Y" when X and Y are not on one scale. List the items.
- **Abstract metaphor nouns** such as substrate, wedge, vector, locus, nexus, primitive, harness as a metaphor, surface as in "API surface", bedrock, scaffolding, paradigm, north star, or flywheel. Use the concrete word. "Substrate" becomes "base". "Wedge in" becomes "add". "Vector" becomes "way".
- **Mannered prose**, such as aphorisms, rhetorical fragments, personified code, and figurative verbs like "rides along". Say the literal thing.
- **Weak verbs propped up by adverbs.** "Runs quickly" becomes "is fast" or the number. "Significantly improves" becomes the measured change.
- **Passive voice** that hides the actor. "Queries are validated" becomes "the compiler validates queries". Keep passive only when the actor is unknown or does not matter.

## Style

- **Dashes.** Em dashes, en dashes, and hyphens used as dashes become a period or a comma.
- **Mid-sentence colons** used as connectors. Keep a colon only before a list or an example, and let the point stand without the setup.
- **Bold on every proper noun or acronym.** Bold only what the reader must not miss.
- **Inline-header lists**, where a bold label and colon restate the line, as in "**Performance:** Performance improved". Write the line as prose. A bold lead-in that ends in a period and is followed by new detail is fine.
- **Title Case Headings.** Use sentence case.
- **Decorative emoji** in headings and bullets. Remove them.
- **Curly quotes.** Use straight quotes.

## Conversation

- **Chatbot phrases** such as "I hope this helps!", "Let me know if...", "Of course!", or "Certainly!". Remove them.
- **Sycophancy** such as "Great question!" or "You're absolutely right!". Respond to the substance.
- **Filler phrases.** "In order to" becomes "to". "Due to the fact that" becomes "because". "It is important to note that" is deleted.
- **Stacked hedges** such as "could potentially possibly". Use one hedge, such as "may".

## Density

- **Dense sentences** that make the reader backtrack. Split them or drop clauses.
- **Over-compression**, meaning dropped articles, verbless fragments, arrows, and unexplained abbreviations. "Parser rejects bad date → exit 2, no write" becomes "The parser rejects a bad date, exits with code 2, and writes nothing."

## Source and adaptation

Source: https://github.com/Camgineer/cstack/blob/b1327c5f31882576571fae060043591806b8e001/skills/simple-as-prose/SKILL.md

Skill and AI-tells text recovered unchanged. References and both MIT notices are embedded for OpenMausBot. Audience routing is defined by the activation block.

## License notice

MIT License

Copyright (c) 2026 Camgineer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## License notice

MIT License

Copyright (c) 2026 Lauren Tan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
