# AI tells

The full catalog for documents, PRs, skills, and rewrites. Each entry names the pattern and its fix. Adapted from unslop in PStack by Lauren Tan, MIT, https://github.com/cursor/plugins/tree/main/pstack/skills/unslop. The staging and framing entries, Strength, and When not to act adapt humanizer by Siqi Chen, MIT, https://github.com/blader/humanizer, which draws on Wikipedia's Signs of AI writing.

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
- **Abstract metaphor nouns** such as substrate, wedge, vector, locus, nexus, primitive, harness as a metaphor, surface as in "API surface", bedrock, scaffolding, modality, paradigm, gold-plating, ratchet, evacuate, endgame, north star, or flywheel. Use the concrete word. "Substrate" becomes "base". "Wedge in" becomes "add". "Vector" becomes "way". "Gold-plating" becomes "more than the job needs". "Ratchet" becomes the mechanism's real name or "a limit that only tightens". "Evacuate" becomes "move out". "Endgame" becomes "the last phase".
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

## Staging and framing

- **One-line closers** that restate what came before, such as "That is the real win.", "That distinction matters.", or a line after an example that names what it showed. Cut them. Keep one only when it adds a fact or consequence the example does not show.
- **Sayings that sound deep**, such as "the real question is", "at its core", "what really matters", "fundamentally", or "X becomes a trap". State the specific claim.
- **Staged run-ups**, such as "Here's the thing", "Honestly?", "Look,", "Let's dive in", or "Here's what you need to know". Start with the point. "Honestly" inside an ordinary sentence is fine.
- **Arguing with no one**, such as "To be clear", "I'm not saying", "This isn't about", or "You might think... but", when nobody raised the objection or option. Cut the rebuttal and state the claim. Keep an objection the text attributes or answers in full, and an option the reader would actually weigh.
- **Writing about the document instead of its subject**, such as "this was added to replace", "compiled from", or "the table below compares". Describe the subject. Mention a previous version only in change logs, release notes, and migration guides. Keep a source credit the reader can follow and a caveat that changes what the reader does.
- **Re-explaining what the reader knows.** A reply that restates the problem, diagnosis, or evidence the reader already has before reaching the decision. Lead with the decision and keep only the reasoning the reader lacks.

## Strength

Curly quotes, stacked hedges, passive voice, and a single sentence about the page itself are weak tells. Rewrite for them only when several cluster in one passage. Every other entry is a strong tell, and one sighting justifies the rewrite.

## When not to act

Leave a matched phrase as written inside quoted text, a title or proper name, or a passage that discusses the phrase rather than uses it.
