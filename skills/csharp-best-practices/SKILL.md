---
name: csharp-best-practices
description: "Use when reading or editing C#. Apply Godot lifecycle discipline, boundary validation, and behavior tests at public seams."
metadata:
  upstream-paths: '["**/*.cs"]'
---

# C# best practices

Apply the [type-system-discipline](../principles/type-system-discipline.md) and [boundary-discipline](../principles/boundary-discipline.md) references first.

Every rule here was mined from Project Treasure's real PR and review record in October 2026. A rule with no incident behind it stays out until evidence arrives. The Evidence column names where each rule earned its place.

| Rule | Summary | Evidence |
|------|---------|----------|
| Stop before you free | Call `SetProcess(false)` and `SetPhysicsProcess(false)` before `QueueFree()`. Resolve a node's last physics contacts before freeing it, so a freed node never runs one more step. | PR #5, PR #57 |
| Ownership drives processing | Derive a node's processing flags from its current owner in one method. Call that method whenever ownership changes, never only in `_Ready`. | PR #55, PR #5 |
| Side effects on change only | Apply ownership and replication side effects only when the value actually changes. Replication mode `Always` reassigns every update and repeats the side effects with it. | PR #55 |
| Events ride separately | Replicate one-time events, such as death, separately from the state snapshot. A snapshot keeps the latest state and can swallow an event that shares its frame. | PR #56 |
| Input lives in the input layer | Read input only in the input layer and pass intent on to systems. A system that polls input directly fires while menus are open. | PR #55 |
| No mutual recursion in state steps | A state's `Step` never calls back into the state that called it. Hand control on with the return path disabled, or return the result instead. | PR #53, PR #5 |
| Order-independent modifiers | Movement modifiers combine with multiplication or another order-independent operation, never by assignment. Assignment makes the result depend on run order. | PR #44, PR #45, ADR 0008 |
| Immutable movement states | Model each activity as an immutable record that takes a step value and returns a result value. Reviewers trace findings through this shape. | ADR 0004, PR #44, PR #45, PR #53 |
| Sealed record variants | Model variants as an `abstract record` with `sealed record` cases, and branch with switch expressions. | Blockout requests, movement states, PR #53, PR #56 |
| Small values as record structs | Model small values and steps as `readonly record struct`. | 11 types across main, PR #53, PR #56 |
| Validate at the network boundary | Check an RPC's sender and payload where it arrives: the sender's authority, `Enum.IsDefined` for raw enum values. Save data gets the same treatment when a save system exists. | `Reach.RequestTake`, PR #57 |
| Collision masks name every target | Every collision mask lists every layer the thing must hit, using the project's layer constants. A mask that scans only the world misses dropped items. | PR #57 |
| Combined effects computed together | Compute a combined effect, such as lethality, from all applicable parts together. Per-part checks call two nonfatal parts safe when together they kill. | PR #56 |
| Selection by identity | Track a UI selection by identity, such as a peer ID, never by list index. Lists change under a selection when someone disconnects. | PR #55 |
| Tests at a public seam | Behavior tests assert literal expected values through the public entry point, and a regression test must fail on the old code. | PR #36, #44, #45, #46, #47, #52, #5 |
| Pin test config, prove shipped config | A behavior test pins its own config values. A separate test proves the shipped config values reach the intended outcome. Test-only values once hid a shipped value that could never complete the move it tuned. | PR #53, PR #47, ADR 0030 |
| Test the in-between frames | Test the frames inside an eased transition, not only the settled value. A camera clipped through a ceiling between frames that both looked fine. | PR #52 |
| Wait for a condition | In tests, wait until a condition holds, with a frame cap. Never wait a fixed frame count; landing took one frame longer than the test assumed. | PR #5, PR #7 |
| Readability limits | Keep methods within cognitive complexity 15, cyclomatic complexity 10, and 40 statements in a 120-line span. Extract meaningful operations, never helpers that only lower the count. | PR #30, ADR 0036 |
| Glossary names | Name types and folders from the project glossary. Folder names are gate-checked; type names are review-checked. | PR #2, PR #5, PR #30 |
| Namespaces mirror folders | Namespaces match the folder path, with the source roots adding no segment. The compiler rule cannot check this; the project script does. | PR #22, PR #48 |
| Scene-set fields use `null!` | Write `= null!` on node and export fields the scene always sets, so the compiler stays quiet and the guarantee stays visible. | AGENTS.md since PR #22, 21 uses |
| Generated names, not strings | Use `SignalName`, `MethodName`, `PropertyName`, and `static readonly StringName` for Godot names, never string literals. | AGENTS.md since PR #22 |

## Not rules

These patterns sound like best practice and have no Treasure evidence. Leave them out until an incident or a repeated success earns them a row.

- **Typed ID types for peers, rooms, or relics.** No such types exist in the code. Peer IDs are plain `int`, and no incident shows two kinds of ID being mixed up. The TypeScript skill's branded types do not carry over on their own.
- **Avoiding casts.** The code uses casts throughout, and no review or gate ever flagged one. The TypeScript skill's cast rule does not carry over on its own.
- **Wiring nodes with `[Export]` instead of `GetNode` paths.** The project's house-style doc asks for this and the code does not follow it, with no incident either way. That conflict needs a decision, not a rule.
