# Map mode

Before charting, complete align's [Ground](SKILL.md#1-ground) step, including the path that removes today's block. Use a map when the remaining way to the destination is foggy and the effort is too big for one session. The map settles the remaining decisions; it builds nothing. The pull to just do the work is the sign you have reached the edge of the map. It ends when no ticket is left, and the Full spec is drafted from it.

## The map

The map is one file at a path the operator picks. It is an index, not a store. A decision lives in its ticket, and the map gives a one-line gist and a link.

```markdown
# Map: <name>

## Destination

What reaching the end looks like: the spec, decision, or change this effort is finding its way to. One or two lines.

## Notes

The domain, the skills every session reads, and standing preferences for this effort.

## Decisions so far

- [<ticket name>](link): <one-line gist of the answer>

## Not yet specified

In-scope fog: questions you can tell are coming but cannot phrase sharply yet.

## Out of scope

Work ruled beyond the destination, each with its reason. It never comes back unless the destination is redrawn.
```

## Tickets

A ticket is one sharp question, sized for one session, with the tickets that block it. Keep tickets as sections of the map file or as files beside it. Write it as soon as you can state the question precisely, even if you cannot answer it yet. Until then it stays fog under **Not yet specified**. Refer to tickets by name, never by a bare number.

| Type | Who | Resolves by |
| --- | --- | --- |
| Research | Agent alone | A delegated investigator finds the fact with the **how** or **why** skill. |
| Prototype | With the operator | A cheap sketch to react to, per `../cstack-mode/playbooks/prototype.md`. |
| Grilling | With the operator | A **grill-with-docs** round. The default type. |
| Task | Either | Work that unblocks a decision, such as provisioning access. The answer records what was done. |

On a ticket worked with the operator, the operator answers for themselves. Never answer your own question.

## Sessions

**Chart.** Settle the destination first with a Grill round, because it fixes the scope. Then grill breadth-first across the whole space. If no fog appears, drop the map and return to the Full tier. Otherwise write the map, the tickets you can state now, and their blocking edges, and delegate every Research ticket in parallel. Charting resolves no other ticket.

**Work.** Load the map, not every ticket. Take the ticket the operator names, or the first unblocked one. Resolve one ticket per session, plus any Research tickets. Record the answer on the ticket, add its gist to **Decisions so far**, graduate any fog the answer made sharp into new tickets, and move tickets the answer put past the destination to **Out of scope**.
