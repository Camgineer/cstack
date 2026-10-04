# Design red flags

Screen every candidate before synthesis. A red flag is a reason to revise or reject the shape.

## Shallow module

A shallow module exposes a large interface while hiding little complexity. Judge depth by the capability and policy hidden behind the public surface relative to the size of that surface. Prefer a simple interface backed by substantial behavior.

Do not confuse a deep module with a deep call chain. A deep call chain scatters understanding across layers. A deep module concentrates capability behind one interface.

Look for these signs:

- Callers coordinate several methods to complete one operation.
- Public options expose internal stages or implementation choices.
- Learning the interface does not save the caller from learning the implementation.

## Information leakage

Information leakage makes multiple modules depend on the same internal decision. A representation, policy, or protocol detail appears in more than one place, so changing it requires coordinated edits.

Public re-exports of transport or wire types are leakage. Parse external data into domain types behind the interface. Keep storage schemas, framework objects, and protocol details private.

## Temporal decomposition

Temporal decomposition organizes modules by execution order instead of the knowledge they own. Separate load, validate, transform, and save stages often repeat one representation and its invariants across several boundaries.

Group code around domain knowledge and ownership. Methods that run at different times can still belong to one module when they protect the same decisions.

## Pass-through method

A pass-through method forwards the same arguments to another method with the same shape. It adds a layer without hiding complexity.

Remove it or move responsibility to the module that can complete the operation. Keep a forwarding boundary only when it adds policy, adaptation, or a distinct abstraction.

## Hypothetical seam

A seam with one adapter is indirection, not a seam. Two adapters, typically production and test, make it real. Remove a port or interface that nothing varies across. Keep a module's internal seams private, even when its own tests use them.

Run the deletion test on each module. Imagine it deleted. If its complexity vanishes, it was a pass-through. If the complexity reappears across its callers, it earns its place.

## Untestable dependency

Classify every dependency of a module, because the category decides how its tests cross the seam:

- **In-process.** Pure computation or in-memory state. Test through the interface directly, with no adapter.
- **Local stand-in.** A dependency with a local substitute, such as an embedded database or an in-memory filesystem. Run the stand-in in the tests and keep the seam internal.
- **Remote but owned.** Your own service across a network. Put a port at the seam, with a network adapter in production and an in-memory adapter in tests.
- **True external.** A third-party service. Inject it as a port and give tests a mock adapter.

A candidate whose tests must reach past its interface, or mock an in-process dependency, has the wrong shape. Tests at a deepened interface replace the tests on the shallow modules it absorbed.
