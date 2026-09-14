# Coding standards

This file is the global baseline for code planning, implementation, refactoring, testing, and review. A repository `CODING_STANDARDS.md` may add policy without copying this baseline. Additive repository rules need no override ceremony. A conflicting repository rule cites the overridden global heading and states the project-specific reason in this form: `Override \`always.example\`: <project-specific reason>.` Current approved user decisions and ticket requirements govern the intended outcome and authorized scope. Repository tooling owns mechanical rules it enforces. Surface unresolved conflicts before Ready or editing. If this mandatory global file is missing or unreadable, stop technical planning and code editing with a clear configuration error. Repository overlays are optional.

`must` marks a hard requirement. `judge` requires reasoned judgment. Read `always.*` for every code task. Read `testing.*` when tests or verification are in scope.

## always.domain must
Use one term for each domain concept. Prefer the repository's approved domain language. Names state the role, effect, units, state, ownership, or failure that another reader must understand. Public names, schemas, events, and state names receive design review when alternatives change meaning.

## always.authority must
Give each fact, rule, and mutable state one owner. Keep knowledge that changes together in one place. Similar syntax with independently changing meaning is not duplication. Importing or calling a module does not transfer ownership.

## always.models must
Model entities, states, transitions, invariants, and failure outcomes explicitly when behavior depends on them. Prefer representations that prevent invalid states. Parse untrusted or loosely typed data at a boundary before domain logic uses it.

## always.object_map must
Before implementing a nontrivial application or domain system, draw the smallest useful object and flow map. The map names concepts, owners, relationships, messages, state transitions, invariants, and external effects. Prefer classes as the primary semantic units when they give behavior, state, policy, or navigation a clear home. A data-only value object or method-only policy, strategy, service, or Facade is valid when the concept is real. Use composition for assembly. Use inheritance only for stable substitutable hierarchies. Keep leaf calculations as functions when a class adds no concept or ownership. Reject fake inheritance and concept-free forwarding. The code and map must tell the same ownership story.

## always.shape judge
Choose a function, type, class, module, or data table because it matches the domain and lifecycle. Use classes for identity, state, invariants, lifecycle, substitutable behavior, or framework contracts. Prefer composition. Use inheritance only for real substitutability. Do not add an abstraction for a hypothetical second implementation.

## always.boundaries must
Separate domain rules from transport, storage, framework, and vendor contracts. Validate external input once at the boundary. Keep business logic independent of I/O where practical. Public interfaces state the facts callers need.

## always.reader_load judge
Each layer must hide meaningful work, state, policy, or recovery. Remove pass-through wrappers and repeated interfaces. Keep related rules together when splitting them would force readers to trace one concept across files. A new reader should be able to find where a fact comes from and what can change it.

## always.contracts must
Public interfaces state valid inputs, units, ordering, returned values, state changes, external effects, errors, retries, cancellation, compatibility, and performance limits when they matter. State each fact once next to its owner. Callers and tests use the public interface.

## always.effects must
Name who commits, rolls back, retries, cancels, cleans up, and recovers partial work. Retried effects need idempotency, uniqueness, deduplication, reconciliation, or an explicit non-retry contract. Bound concurrency and establish ownership of shared mutable resources.

## always.outcomes must
Keep success, expected absence, invalid input, internal failure, and external failure distinguishable when callers respond differently. Preserve useful causes when translating errors. Error messages state what failed and what action can resolve it when known.

## always.operations must
When behavior needs production diagnosis or recovery, emit useful structured logs, metrics, traces, or state transitions at the owning boundary. Distinguish normal, degraded, retried, and failed outcomes. Name operational ownership and recovery actions when they matter. Redact secrets and sensitive data from every signal and retained artifact.

## always.secrets must
Credentials and secrets never enter source control, prompts intended for durable storage, logs, traces, errors, test output, command output, tickets, commits, or review text. Use approved secret storage and redact evidence.

## always.comments must
Comments preserve information the code cannot show, such as rationale, external constraints, protocol quirks, and measured tradeoffs. Do not narrate the code. Update comments with the behavior they explain.

## always.scope must
Every change supports the approved ticket or a required compatibility obligation. Cleanup may improve code already in the affected path when it removes duplication, a shallow layer, a misleading name, a hidden rule, or a needless branch. Keep unrelated work separate.

## always.evidence must
Match proof to the claim. Verify behavior at the narrowest meaningful public boundary, then widen checks in proportion to risk and blast radius. Formatter, linter, compiler, and typechecker results are mechanical evidence, not behavioral or design proof.

## testing.risk must
Every test names a material contract or failure it protects against. Use the cheapest boundary with enough fidelity to detect that failure. Do not add tests for coverage counts, branch counts, or implementation churn alone.

## testing.behavior must
Test public behavior and observable effects. Build expected results from the contract or controlled input, not from the implementation or actual result. Prefer stable whole-value comparisons. Reach private helpers through their public owner unless the private behavior is itself a required boundary.

## testing.reliability must
Tests own or declare their inputs, state, time, randomness, external services, cleanup, and failure responsibility. Avoid fixed sleeps. Poll asynchronous outcomes with bounded timeouts. A skipped, flaky, environment-dependent, or wrong-runtime check is not passing proof.

## testing.change must
Map existing coverage before adding, changing, or removing tests. A code change alone does not justify a new test. Add or extend a check only for a meaningful detection gap. Prefer behavior over implementation details. Consolidate redundant coverage without weakening protection. Review test additions and removals for their unique value and maintenance cost.
