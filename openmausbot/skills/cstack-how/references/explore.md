# Exploration reference

Gather facts for the original question and the assigned exploration angle. Read implementations, trace code paths, and map components. For a delegated slice, focus on that angle; the lead combines it with the others.

Find relevant files and symbols with the available search and read tools. Read the code rather than guessing from names.

1. Find the entry point. Identify the user action, API call, scheduled job, or other event that triggers the behavior.
2. Trace the flow. Follow the call chain, read each relevant function, and track how data changes.
3. Map the key abstractions. Read the central types, interfaces, services, and classes. Explain what each represents and its role.
4. Find the boundaries. Identify where the subsystem meets others and what crosses each boundary.
5. Look for non-obvious behavior. Note surprising cases, possible historical artifacts, and details a newcomer could misunderstand. Label inferred history as inference.

Continue until each relevant path is traced or its gap is explicit. Name an untraceable connection instead of filling it with a guess.

Record the findings with exact paths, symbols, and line numbers where available:

- Components found, with each name, path, and role.
- Flow, with the functions involved, their calls, and the data passed.
- Files read, so the explanation can cite the actual sources.
- Boundaries, including inputs and outputs.
- Non-obvious behavior and likely misunderstandings.
- Open questions and anything that could not be traced.
