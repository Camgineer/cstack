---
name: unslop
description: Cut AI tells from any writing. Must always apply.
license: MIT
metadata:
  source: "Adapts unslop from PStack by Lauren Tan, https://github.com/cursor/plugins/tree/main/pstack/skills/unslop. Rules 34 to 39, the fact check, Strength, and When not to act adapt humanizer by Siqi Chen, https://github.com/blader/humanizer, which draws on Wikipedia's Signs of AI writing."
---

Read [the runtime contract](../poteto-mode/references/runtime.md) before executing this workflow.


# Unslop

Edit text to remove AI patterns.

## Process

1. Scan for the patterns below and weigh each match by [strength](#strength).
2. Rewrite. Preserve meaning, match intended tone.
3. Compare the rewrite with the original. It adds no fact, name, number, date, quote, or claim the original lacks, and drops none unless a rule calls for cutting it. When a sentence needs a detail you do not have, ask for it or write a simpler sentence.

## Patterns to detect and fix

Rule numbers are stable ids that other skills cite. A removed rule leaves a gap.

### Content

3. **Superficial -ing phrases.** "highlighting...", "ensuring...", "reflecting...", "showcasing...", "fostering...". Delete or expand with real sources.
5. **Vague attributions.** "Experts believe", "Industry reports suggest", "Some critics argue". Name the source or delete.

### Language

7. **AI vocabulary.** Additionally, crucial, delve, enduring, enhance, fostering, garner, interplay, intricate, landscape (abstract), pivotal, showcase, tapestry (abstract), testament, underscore, vibrant. Replace with plain words.
8. **Fancy ways to say "is".** "serves as", "stands as", "boasts", "features". Just say "is" or "has".
9. **"Not just X, but Y."** State the point directly instead.
10. **Rule of three.** Forcing ideas into groups of three. Use the natural number.
11. **Synonym cycling.** Protagonist, main character, central figure, hero all in one paragraph. Pick one, repeat it.
12. **False ranges.** "from X to Y" where X and Y aren't on a meaningful scale. List topics directly.

### Style

13. **Em dash overuse.** Avoid em dashes entirely. Use periods or commas only (no parentheses, no en dashes, no hyphen-as-dash substitutes). If a thought needs separation, end the sentence or use a comma.
14. **Colon overuse.** Colons are fine before a list or example. Not as mid-sentence connectors. "If you're coming from traditional automation: instead of registering event handlers, you describe conditions" adds nothing with the colon. Rewrite to let the point stand on its own without comparison framing. "Describing when the scheduler should fire works best as plain English." Same meaning, no crutch punctuation.
15. **Boldface overuse.** Don't bold every proper noun or acronym.
16. **Inline-header lists.** The tell is a bold label and colon that restates the line: "**Performance:** Performance improved...". Convert those to prose. A bold lead-in that ends in a period, names the item, and is followed by genuinely new detail ("**Schema in TypeScript.** Tables live in one file.") is fine, not a tell.
17. **Title case headings.** Use sentence case.
18. **Decorative emojis.** Remove from headings and bullets.
19. **Curly quotes.** Replace with straight quotes.

### Communication artifacts

20. **Chatbot phrases.** "I hope this helps!", "Let me know if...", "Of course!", "Certainly!", "Found the smoking gun!" Remove.
22. **Sycophantic tone.** "Great question! You're absolutely right!" Respond directly.

### Filler

23. **Filler phrases.** "In order to" becomes "To". "Due to the fact that" becomes "Because". "It is important to note that" gets deleted.
24. **Excessive hedging.** "could potentially possibly be argued that it might" becomes "may".
25. **Generic conclusions.** "The future looks bright." State specific plans or facts.

### Jargon

26. **Abstract metaphor nouns.** Substrate, wedge, vector, locus, vantage, nexus, primitive (as noun), harness (as metaphor), surface (as in "API surface"), bedrock, scaffolding (as metaphor), modality, paradigm, gold-plating, ratchet (as metaphor), evacuate (for moving code), endgame, north star, flywheel. These read as technical but usually have a plainer concrete word. "Substrate" becomes "base". "Wedge in" becomes "add". "Vector" becomes "way" or "method". "Gold-plating" becomes "more than the job needs". "Ratchet" becomes the mechanism's real name or "a limit that only tightens". "Evacuate" becomes "move out". "Endgame" becomes "the last phase". Pick the concrete word.

### Plain speech

27. **Say what it does, not how it feels.** "the database stays close at hand", "SQL you can read", "types that follow your schema" name a feeling. The fix names the mechanism or a number: "`.toSQL()` returns the exact string sent to the database", "a column rename fails the build". Ask what the sentence tells the reader to do or know, then write that. If you can't restate it as a concrete instruction, fact, or number, cut it. One more check: if the sentence could appear unchanged in another project's docs, it says nothing about this one. Cut it.
28. **Shorten or split dense sentences.** If the reader has to backtrack to parse a sentence, break it in two or drop clauses. One idea per sentence.
29. **Active voice.** Prefer it. Catch "is/are/was/were + past participle" and name the actor: "queries are validated" becomes "the compiler validates queries", "the file is parsed by the loader" becomes "the loader parses the file". Passive is fine only when the actor is unknown or genuinely doesn't matter.
30. **Cut adverbs, or use a stronger verb.** "runs quickly" becomes "is fast" or the number. "significantly improves" becomes the measured delta. An adverb propping up a weak verb means the verb is wrong.
31. **Prefer the plain word.** "utilize" becomes "use", "leverage" becomes "use", "facilitate" becomes "help", "numerous" becomes "many", "in the event that" becomes "if". The fancier synonym is rarely clearer.
32. **Mannered prose.** Metaphor or flourish where a literal phrase exists: aphorisms ("wire it or delete it"), rhetorical fragments for effect, personified code ("the plan holds it"), figurative verbs ("rides along", "stands on"), stock framing phrases. "A dial worth turning" becomes "a parameter worth varying". Say what you mean. Rule 26 covers the metaphor nouns.
33. **Over-compression.** Dropped articles, verbless fragments, symbol-speak, and abbreviations that make the reader decode instead of read. "Parser rejects bad date → exit 2, no write" becomes "The parser rejects a bad date, exits with code 2, and writes nothing." Write whole sentences with their articles and verbs, and spell out arrows and abbreviations.

### Staging and framing

34. **One-line closers.** A short sentence or one-line paragraph that restates what came before: "That is the real win.", "That distinction matters.", "Let that sink in.", or a line after an example that names what it showed. Cut it. Keep it when it adds a fact or consequence the example does not show. Rule 32 covers fragments written for effect.
35. **Sayings that sound deep.** "The real question is", "at its core", "what really matters", "fundamentally", "the heart of the matter", "X is the language of Y", "X becomes a trap". The frame dresses an ordinary point as a hidden truth. State the specific claim.
36. **Staged run-ups.** "Here's the thing", "Honestly?", "Look,", "Let's dive in", "Let's break this down", "Here's what you need to know", "Real talk". Start with the point. "Honestly" inside an ordinary sentence is fine; the tell is a standalone opener before a routine claim.
37. **Arguing with no one.** "To be clear", "I'm not saying", "This isn't about", "A tempting approach would be", "You might think... but". The text rebuts an objection or rejects an option nobody raised. Cut the rebuttal and state the claim. Keep an objection the text attributes or answers in full, and an option the reader would actually weigh.
38. **Writing about the document instead of its subject.** "This was added to replace", "compiled from", "anything unconfirmed is flagged rather than guessed", "the table below compares". Describe the subject. Mention a previous version only in change logs, release notes, and migration guides. Keep a source credit the reader can follow and a caveat that changes what the reader does.
39. **Re-explaining what the reader knows.** A reply that restates the problem, diagnosis, or evidence the other person already has before reaching the decision. Lead with the decision and keep only the reasoning the reader lacks. Apply this rule when you can see the conversation or the text is plainly a reply.

## Strength

Weak tells justify a rewrite only when several cluster in one passage: 19, 24, 29, and a single sentence describing the page under 38. Every other rule is a strong tell, and one sighting justifies the rewrite.

## When not to act

Leave a matched phrase as written inside quoted text, a title or proper name, or a passage that discusses the phrase rather than uses it.
