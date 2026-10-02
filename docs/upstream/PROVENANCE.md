# Upstream provenance

- Project: pstack, by Lauren Tan (poteto).
- Source recorded in the imported manifest: <https://github.com/cursor/plugins/tree/main/pstack>.
- Imported version: `0.15.5`, as recorded in `.cursor-plugin/plugin.json`.
- Local import commit: `c31f7ace991843f5576398ad025969465251192c`, titled `chore: import PStack 0.15.5 unchanged`.
- License: MIT; the original copyright notice is retained in [LICENSE](../../LICENSE).
- CStack repository: <https://github.com/Camgineer/cstack>.

The source URL and version above describe the local import metadata. The original upstream commit and byte-for-byte correspondence with the remote source have not been independently verified.

The imported README is preserved as [README.md](README.md), with relative link prefixes adjusted for its new directory. The original is also available at the local import commit. The imported guide, skills, agent definitions, automation pack, and Cursor manifest remain reference material until individually adapted and evaluated.

## Selected writing skills

- Simple as Prose was recovered from CStack commit [`b1327c5f31882576571fae060043591806b8e001`](https://github.com/Camgineer/cstack/tree/b1327c5f31882576571fae060043591806b8e001/skills/simple-as-prose). Its [origin record](../../skills/simple-as-prose/origin.json) retains the legacy repository, commit, and source hashes. Both `SKILL.md` and `ai-tells.md` match those recorded SHA-256 values. The Camgineer MIT notice is included; its AI-tells reference also credits Lauren Tan's pstack unslop skill and carries the root MIT notice in the generated bundle.
- Writing for Agents was recovered from CStack commit [`856e06ea398243305f14bc7d42eb02b77e7ddef2`](https://github.com/Camgineer/cstack/tree/856e06ea398243305f14bc7d42eb02b77e7ddef2/skills/writing-for-agents). Its [origin record](../../skills/writing-for-agents/origin.json) retains Matt Pocock's upstream commit `d81f3a183412e71a5b1e84ca21bc1a35eea03a60`, source hashes, and the prior port's installer record. This recovery adds no installer run. The skill body is retained; the mechanics reference now describes OpenMausBot. Matt Pocock's MIT notice remains alongside it.

The recovered records distinguish historical Codex adaptations from this pilot. Codex discovery metadata and hooks are not included in the OpenMausBot package.

## How adaptation

The pilot derives from `skills/how/SKILL.md`, `skills/how/references/explorer-prompt.md`, and `skills/how/references/explainer-prompt.md` at the local import commit above. All three originals remain unchanged. [The pilot record](../pilot.md) maps their behavior to the adapted files and names the execution changes. The standalone upstream How skill names no separate principle-skill dependency; this pilot does not claim to implement the larger poteto-mode wrapper.

The generated package includes source links, adaptation notes, required references, and full applicable MIT notices. [Its manifest](../../dist/openmausbot/manifest.json) records every build input and generated output hash.
