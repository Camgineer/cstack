---
name: grill-with-docs
description: "Use when stress-testing a plan or design with the person. Settle decisions and terms before building."
license: MIT
metadata:
  source: "Merges grill-with-docs and grilling from mattpocock/skills, https://github.com/mattpocock/skills"
---

# Grill with Docs

Settle the decisions that determine scope, behavior, design, and verification. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Run two companion skills for the whole session, every round:

- The **show-me** skill puts each question in front of the user as the thing itself. A question about a signature shows the signature. A question about flow shows the call tree. A choice between options shows each option as code, a diff, or a diagram, side by side. Prose frames the question in a line or two; the view carries it. Follow [show-dont-tell](../principles/show-dont-tell.md).
- The **domain-modeling** skill keeps the language sharp. Challenge terms against `GLOSSARY.md`, write each term into it the moment it resolves, and offer an ADR when a decision qualifies.

## Set up the documents

Keep one long-lived spec with a waiting list for open decisions. Use a shared document when available for a separate grill document titled `Grill: <topic>`, linked from the spec. Each grill covers one round or one slice and holds open questions only. When a shared document is unavailable, ask in the reply alone. Use an existing spec or create an untracked working file for settled decisions.

Tell people how to answer in chat or by commenting on a question's heading or sentence. Put an index of open questions at the top, with each question's number, owner, and title. Give every listed question its own section with its owner. An asked question has a view and its recommendation first. A held question names the question or fact it waits on and gets its view and recommendation when it is asked.

With more than one person, assign each person a distinct marker and tell them the mapping once. Start each question with its owner's marker. Use all the owners' markers for a joint decision. With one person, name them as the owner. Keep question numbers unchanged across every grill of one spec. Never reuse a settled number within that spec.

## Rounds

Work the design tree in rounds. The **frontier** holds decisions whose prerequisites are settled. Ask a frontier question when the work it blocks is next. A **held question** waits on a named question or fact in the same grill. Keep it open with that prerequisite until it can be asked. List questions for a later slice in the spec against that slice, outside the current grill. Give that slice its own small grill when its work is next.

Ask each round in the grill document and in the reply. Keep each question with its context, and keep questions for different owners distinct.

Lead each question with your recommendation and its reason. List only other options you can back with a real reason. One strong option is enough. Show each option at the highest fidelity you can produce fastest, such as code, a diff, a table, a diagram, or a mockup. When only running something settles the choice, build a small local sketch and show the result.

Use this format in both the document and the reply:

````
### <owner marker or name> Q1. <question title>

Recommended. <Option and why it wins.>

<One or two sentences framing the decision.>

```<lang>
<The view of the options.>
```

- <Other option and its reason.>
````

Add each new question to the grill document before showing it in the reply. When a decision changes an open question, update that question in the document in the same turn as the reply that says so. Make small edits. After each write, read the document back and check that every heading appears once and code fences come in pairs.

## Settle an answer

An answer in chat or in the document settles the same question. Check who answered and which question they answered. Another person's agreement does not settle the owner's question. Record that agreement in the spec and keep the question open for its owner.

Once you read a person's comment and record its content in the spec, reply in its thread, then resolve it, because the grill document holds any question still waiting on an owner. If the comment does not settle the question, say what you recorded and what remains for its owner.

When the owner answers, do these in the same turn:

1. Write the decision into the spec with its question number, who decided it, and when.
2. Reply where the answer was given and in each thread on that question, following the comment handling above.
3. Remove the settled question's index entry and section from the grill document. Keep comment anchors until their threads are closed, using the host's route.
4. Recompute the frontier. Update any affected open question in the document, then show the change in the reply.

A partial or ambiguous answer keeps the question open. State what remains for its owner. A joint question stays open until every owner answers.

When the last question settles, leave no question in the grill document and mark it done. The spec keeps the decisions and agreements. Clear the settled questions from its waiting list.

## Pending owner

While an owner has not picked, build only the parts every option shares. When those parts are built and the owner has still not answered, keep their question open and record the recommended option as waiting on them in the spec. Continue reversible work on that option within existing authorization. If an owner says they are away, apply this exception at once. Sign-off gates and work that needs the owner's authority still wait.

## First round

When the user brings a solution rather than a problem, such as "add a cache" or "build a dashboard", treat the solution as evidence of a problem. The first round works back to that problem, and it becomes the root of the design tree. Ask it in the round format:

- Name the signal that prompted the solution: the complaint, metric, incident, or request behind it.
- Offer each framing of the underlying problem you can back with a reason, each pointing to a different build, shown side by side.
- Show each load-bearing assumption in a table with the risk if it is wrong, the cheapest test that checks it, and its evidence status: none, anecdotal, or measured.

An assumption with evidence status none gets its test before its design. Recommend the test, and keep the design questions that depend on it off the frontier until the result is in.

## Facts versus decisions

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (code, files, tools, history), look it up yourself and answer with evidence. Ask the user only for what you cannot look up. Don't block on it: a running investigation is an unsettled prerequisite, so only the questions downstream of it wait; ask the other questions whose blocked work is next. Put decisions to their owners. Continue work only as **Pending owner** allows.

## Outside decider

When a decision belongs to someone outside the session, grill the send, not the subject. Ask the user who it goes to, what that person knows, and what the user needs back. Then write a questionnaire for that person: a one-paragraph context, then single-idea questions ordered most important first, each with the decider's name as its owner and the round format. Add a one-line why only where a question could be misread. Hand the questionnaire to the user to send, list the waiting branches as open, and keep their dependent questions off the frontier until the answers come back. When the user relays an answer, record both the decider and who relayed it. Apply **Settle an answer** to the relayed decision.

## Done

A grill is done only when every branch of its round or slice's design tree is visited, nothing is left silently assumed, and every question in that grill is settled. When a grill document exists, leave it with no question and mark it done. Put every resolved term in `GLOSSARY.md` and offer every qualifying decision as an ADR. Held questions in this grill keep it open. When all remaining questions are held, report what each waits on and pause the round. A finished grill does not authorize the build. Get the plan's required owners to confirm shared understanding before work beyond the existing authorization described in **Pending owner**.
