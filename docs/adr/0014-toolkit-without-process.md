# A toolkit without a process layer

The plugin supplies tools and task guides. The person and their environment own who does the work and what happens to the branch. Installing the plugin starts no workflow, runs no plugin hook, and loads no skill body unasked.

## Process test

A skill is process if it decides who does the work or what happens to the branch. It is a tool if it helps the agent already doing the work do it better. Process goes. Tools stay.

## Consequences

Task guides end when the work is verified on the current branch. Read-only helpers may assist analysis when the harness supports them; the current agent can do those passes itself. Writing delegation and branch, review, CI, and merge management belong to the surrounding environment.

Each supported host installs through its native plugin manifest. Other harnesses can discover a copied `skills/` folder. The plugin ships no installer or automatic session behavior. Principles live as reference files within the `principles` skill. Repository tooling generates the host manifests and each skill's invocation policy from metadata and frontmatter.
