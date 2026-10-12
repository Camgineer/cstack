# Architect runner prompt

Use this reference during Phase B. Read the **architect** skill's design criteria, use the task and Phase A grounding, and sketch the types, function signatures, and module map. Record the rationale with [`rationale-template.md`](rationale-template.md).

Compare the sketches on these axes.

- Caller's usage first. Write the README-style usage and two or three real call sites before the types, then derive the type sketch from them. The usage is the spec. The two must agree, so reconcile the sketch to the usage, not the reverse.
- Data structures first. Get the core types right and the code becomes obvious. Trace each dominant access pattern through the proposed structure. If the answer is "we'll add a map / index / cache later," the structure is wrong.
- Interface depth. Compare the capability hidden behind the public surface relative to the size of that surface. Prefer a simple interface that pulls complexity into the callee, even when the implementation becomes less simple. Do not put transport or wire types on the public API. Parse into domain types behind the interface.
- Shared state: if two actors might both write, ask "what happens?" If the answer isn't "nothing," default to per-actor state with a merge at the read boundary, per the [separate-before-serializing-shared-state](../../principles/separate-before-serializing-shared-state.md) reference.
- Make boundaries visible. `not implemented` errors for bodies, `// TODO` pseudocode for tricky logic, doc comments stating intent and invariants. A reader should trace data from input to output by reading types and signatures alone.
- Encode invariants in types: hard-to-misuse types > runtime checks > prose comments, per the [encode-lessons-in-structure](../../principles/encode-lessons-in-structure.md) reference.
- Validate at boundaries, trust types inside, per the [boundary-discipline](../../principles/boundary-discipline.md) reference. Business logic as pure functions. The shell stays thin.
- Single source of truth per invariant. Derive instead of sync.
- Idempotent state transitions where applicable, per the [make-operations-idempotent](../../principles/make-operations-idempotent.md) reference. Ask what happens if the operation runs twice or crashes halfway.
- Short call chains. If tracing the flow needs more than three files, flatten the hierarchy, per the [laziness-protocol](../../principles/laziness-protocol.md) and [minimize-reader-load](../../principles/minimize-reader-load.md) references.

Try distinct constraints, such as "at most three entry points", "make the most common call trivial", "build around the dominant data structure", or "ports and adapters at every remote dependency". Design to each fully, and say in the rationale where it cost depth.
