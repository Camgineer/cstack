# Explanation reference

Write an explanation that lets a reader unfamiliar with this code understand it well enough to start work. Use the original question and the exploration findings. Reconcile overlaps and check conflicting claims in the source. Fill material gaps where access permits; otherwise name them.

Use the parts of this structure that help answer the question:

- Overview. Explain what the subsystem does and its purpose in one or two paragraphs. Distinguish a known design rationale from an inference.
- Key concepts. Define the types, services, and abstractions the reader needs.
- How it works. Trace the trigger, actions, data movement, and decision points. Use prose and concrete function names. Include a small code excerpt only when it explains something the prose cannot.
- Where things live. Give the file map needed to begin work here.
- Gotchas. Explain surprising behavior, pitfalls, and supported historical context. Omit this part if there is nothing useful to add.

Add a Mermaid diagram when interactions or data transformations are easier to understand visually. Skip it when prose already explains the flow.

Say which function calls which other function. Explain the cause of complexity. Keep simple behavior brief. Use an analogy only when it clarifies the mechanism. Keep all unresolved questions and evidence limits visible in the final explanation.
