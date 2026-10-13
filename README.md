# CStack

The plugin is an optional engineering toolkit plus task guides for coding agents. Use it with or without an orchestrator. Nothing runs and no skill body loads until you or your agent reaches for a skill. Model-invocable skill descriptions let the agent discover what is available.

The plugin aims to shorten the time to a mergeable PR and keep that time short as a project ages. This is a design goal, not a measured result.

## Install in your host

Choose your host's native plugin path. In the commands below, replace `<repository-url>` with this repository's Git clone URL. Replace `<plugin>` with the `name` value in [tools/metadata.json](tools/metadata.json).

### Claude Code

Run these commands in your terminal:

```bash
claude plugin marketplace add <repository-url>
claude plugin install <plugin>@<plugin> --scope user
```

Start a new Claude Code session. Confirm the installation with `claude plugin list`, or open `/plugin` and its **Installed** tab. User scope makes the plugin available across your projects on this machine. See [Install and manage plugins](https://code.claude.com/docs/en/discover-plugins).

The repository supplies [.claude-plugin/marketplace.json](.claude-plugin/marketplace.json) and [.claude-plugin/plugin.json](.claude-plugin/plugin.json). The layout follows Claude Code's [manifest reference](https://code.claude.com/docs/en/plugins/manifest-reference).

### Codex

Add the repository as a marketplace from your terminal:

```bash
codex plugin marketplace add <repository-url>
```

The command accepts a Git repository URL or a local checkout path. The repository supplies [.agents/plugins/marketplace.json](.agents/plugins/marketplace.json) and [.codex-plugin/plugin.json](.codex-plugin/plugin.json). OpenAI documents this manifest as a supported compatibility format. See [Build plugins](https://developers.openai.com/plugins/build/plugins#add-a-marketplace-from-the-cli).

Start `codex`, enter `/plugins`, select the plugin from its marketplace, and install it. Start a new session to use its skills. See [Plugins in Codex CLI](https://learn.chatgpt.com/docs/plugins#plugin-directory-in-codex-cli).

### Cursor

Use Cursor's local plugin directory with [.cursor-plugin/plugin.json](.cursor-plugin/plugin.json):

```bash
mkdir -p ~/.cursor/plugins/local
git clone <repository-url> ~/.cursor/plugins/local/<plugin>
```

Restart Cursor, or run **Developer: Reload Window**. Open **Customize** and confirm the plugin's skills appear.

Local plugin imports must be allowed. On Teams and Enterprise, an administrator controls **Allow Local Plugin Imports**. A marketplace installation with the same name takes precedence over the local copy. Clone into the local directory rather than symlinking a checkout elsewhere. Cursor skips external symlink targets. See [Test plugins locally](https://cursor.com/docs/plugins#test-plugins-locally).

### Other hosts and skills-only installation

For another harness, copy the complete [skills/](skills/) folder into that harness's skill directory. Keep each skill's reference files and `agents/openai.yaml` with it. Check whether the harness honors the invocation policy before using the task guides.

For a skills-only installation in a project, run this from the project's root:

```bash
npx skills add <repository-url> --skill '*' --agent claude-code codex cursor --yes
```

This command was checked with `skills` 1.7.2. It installs all 40 skills under `.agents/skills` and creates Claude Code links under `.claude/skills`. Reference files and invocation metadata are included. It installs skills rather than registering a plugin. See the [skills CLI](https://github.com/vercel-labs/skills).

Codex and Cursor discover `.agents/skills`. See [Codex skill locations](https://learn.chatgpt.com/docs/build-skills#where-to-save-skills) and [Cursor skill directories](https://cursor.com/docs/skills#skill-directories).

## Use a skill

Describe your task, or choose a skill explicitly. The plugin has two invocation kinds:

- **Model-invocable skills** expose descriptions to the agent. The agent may load one unasked when it matches your task. You can also invoke one yourself.
- **User-invoked task guides** have `disable-model-invocation: true`. Only your typed command loads one. In Codex, generated `agents/openai.yaml` files express the same policy as `allow_implicit_invocation: false`.

These policies follow [Claude Code's invocation controls](https://code.claude.com/docs/en/skills#control-who-invokes-a-skill), [Codex's invocation metadata](https://learn.chatgpt.com/docs/build-skills#optional-metadata), and [Cursor's automatic invocation control](https://cursor.com/docs/skills#disabling-automatic-invocation).

For example, invoke `how` to explain code or `feature` to work through a feature:

| Host | Explain code | Start the feature task guide |
| --- | --- | --- |
| [Claude Code](https://code.claude.com/docs/en/discover-plugins#install-a-plugin) | `/<plugin>:how` | `/<plugin>:feature` |
| [Codex CLI](https://learn.chatgpt.com/docs/build-skills#how-codex-uses-skills) | `$how` | `$feature` |
| [Cursor](https://cursor.com/docs/skills#how-skills-work) | `/how` | `/feature` |

The 29 model-invocable descriptions total 472 words against the plugin's 500-word discovery budget. Names and the 12 task-guide descriptions are excluded. This count does not measure speed or guarantee that an agent chooses the right skill. Skill bodies and their reference files load when needed.

Task guides end with verified work on the current branch. Your environment owns agent assignments, branches, PRs, reviews, CI, and merges.

### Model-invocable toolkit

| Skill | When to use it |
| --- | --- |
| [`align`](skills/align/SKILL.md) | Use before a substantial change to agree scope, design, acceptance criteria, and verification in a signed spec. |
| [`architect`](skills/architect/SKILL.md) | Use when code needs a new module, public interface, or design choice. Sketch types and callers before implementation. |
| [`benchmark-checklist`](skills/benchmark-checklist/SKILL.md) | Use before running a benchmark or reporting a measured speedup or regression. Check limits, errors, tuning, and repeatability. |
| [`blast-radius`](skills/blast-radius/SKILL.md) | Use when assessing what a change could break beyond its diff. Run code to prove the safety assumptions. |
| [`bro`](skills/bro/SKILL.md) | Use when asked to restate the last reply in plain language. |
| [`control-cli`](skills/control-cli/SKILL.md) | Use to reproduce, verify, or profile interactive CLI behavior through a repeatable terminal harness. |
| [`control-ui`](skills/control-ui/SKILL.md) | Use to reproduce, verify, or profile web, IDE, or Electron behavior through a local browser harness. |
| [`correct`](skills/correct/SKILL.md) | Use when agents repeat a mistake. Prevent it through architecture, types, or checks before adding instructions. |
| [`create-verification-skill`](skills/create-verification-skill/SKILL.md) | Use when an app lacks repeatable user-path verification, or its verification skill or feature map needs updating. |
| [`csharp-best-practices`](skills/csharp-best-practices/SKILL.md) | Use when reading or editing C#. Apply Godot lifecycle discipline, boundary validation, and behavior tests at public seams. |
| [`design-ui`](skills/design-ui/SKILL.md) | Use before building, changing, or critiquing UI appearance. Apply project tokens, cover states, and inspect screenshots. |
| [`deslop`](skills/deslop/SKILL.md) | Use when cleaning AI-generated code from a branch diff before commit. |
| [`domain-modeling`](skills/domain-modeling/SKILL.md) | Use when defining domain terms, editing a glossary, or recording an architecture decision. |
| [`feel`](skills/feel/SKILL.md) | Use when building, reviewing, or verifying motion and sound on a visual or terminal interface. |
| [`grill-with-docs`](skills/grill-with-docs/SKILL.md) | Use when stress-testing a plan or design with the person. Settle decisions and terms before building. |
| [`how`](skills/how/SKILL.md) | Use for code walkthroughs, runtime flow, and module ownership or layering questions. Trace claims to source. |
| [`no-comments`](skills/no-comments/SKILL.md) | Use when asked to remove unnecessary code comments and fix the design problems they conceal. |
| [`principles`](skills/principles/SKILL.md) | Use when designing, implementing, debugging, or verifying a change. Read the reference for the current decision. |
| [`recall`](skills/recall/SKILL.md) | Use when resuming work or reconstructing recent context. Check history and live state within the requested scope. |
| [`reflect`](skills/reflect/SKILL.md) | Use when drawing durable lessons from a session or retrospective. Route proven lessons to guidance or structural checks. |
| [`show-me`](skills/show-me/SKILL.md) | Use when explaining a change, showing a design, or presenting options. Show the smallest useful code, diff, diagram, or view. |
| [`show-me-your-work`](skills/show-me-your-work/SKILL.md) | Use for long or unattended work that needs a decision trail. Log choices, reasons, evidence, and results. |
| [`simple-as-prose`](skills/simple-as-prose/SKILL.md) | Use when writing or revising replies, documents, UI copy, comments, or other prose. Make the next action clear. |
| [`tdd`](skills/tdd/SKILL.md) | Use for requested test-first work or a bug with a cheap local regression test. Prove failure before fixing. |
| [`teach`](skills/teach/SKILL.md) | Use when asked to understand a change or subsystem. Combine how it works with why it exists. |
| [`technical-writing`](skills/technical-writing/SKILL.md) | Use when drafting or reviewing technical documents, PR descriptions, or commit messages. Match structure and sentences to the reader. |
| [`typescript-best-practices`](skills/typescript-best-practices/SKILL.md) | Use when reading or editing TypeScript. Apply boundary validation, total types, and exhaustive variants. |
| [`why`](skills/why/SKILL.md) | Use for design rationale, regressions, postmortems, or thresholds. Search historical evidence and distinguish facts from inference. |
| [`writing-for-agents`](skills/writing-for-agents/SKILL.md) | Use when writing prompts, skills, personas, references, or guidance an agent reads. State triggers and completion criteria. |

### User-invoked task guides

| Skill | When to use it |
| --- | --- |
| [`authoring-a-skill`](skills/authoring-a-skill/SKILL.md) | Use when the user asks for authoring a skill. Follow the task from evidence and scope through verification on the current branch. |
| [`bug-fix`](skills/bug-fix/SKILL.md) | Use when the user asks for bug fix. Follow the task from evidence and scope through verification on the current branch. |
| [`eval`](skills/eval/SKILL.md) | Use when the user asks for eval. Follow the task from evidence and scope through verification on the current branch. |
| [`feature`](skills/feature/SKILL.md) | Use when the user asks for feature. Follow the task from evidence and scope through verification on the current branch. |
| [`hillclimb`](skills/hillclimb/SKILL.md) | Use when the user asks for hillclimb. Follow the task from evidence and scope through verification on the current branch. |
| [`investigation`](skills/investigation/SKILL.md) | Use when the user asks for investigation. Follow the task from evidence and scope through verification on the current branch. |
| [`perf-issue`](skills/perf-issue/SKILL.md) | Use when the user asks for perf issue. Follow the task from evidence and scope through verification on the current branch. |
| [`prototype`](skills/prototype/SKILL.md) | Use when the user asks for prototype. Follow the task from evidence and scope through verification on the current branch. |
| [`refactoring`](skills/refactoring/SKILL.md) | Use when the user asks for refactoring. Follow the task from evidence and scope through verification on the current branch. |
| [`runtime-forensics`](skills/runtime-forensics/SKILL.md) | Use when the user asks for runtime forensics. Follow the task from evidence and scope through verification on the current branch. |
| [`trace-forensics`](skills/trace-forensics/SKILL.md) | Use when the user asks for trace forensics. Follow the task from evidence and scope through verification on the current branch. |
| [`visual-parity`](skills/visual-parity/SKILL.md) | Use when the user asks for visual parity. Follow the task from evidence and scope through verification on the current branch. |

## Check an installation

An installation keeps several copies: the host's installed record, its marketplace clone, and its cache folders. They can disagree, and an app may show the version of any of them. From a checkout, run `bash tools/doctor.sh` to print every copy this machine has, with versions, and flag cache folders that no longer match the installed version. The script only reads; it changes nothing.

## Remove setup from before 1.0.0

Updating the plugin does not remove personal rules, delivered links, or environment settings from an older installation. The cleanup below follows the [deleted installer and its sibling files at the last pre-1.0.0 revision](https://github.com/Camgineer/cstack/tree/43c6b4785ca586d96f61a9ce9e161c7a59c33486/hooks).

1. In **Intent Settings**, under **Agent Behavior**, remove the personal-rule paragraph that tells the agent to read or invoke `<plugin>-mode` before any other step. Remove its appended exemption text with that paragraph. Keep your other rules.
2. Remove `CSTACK_MODE` from your shell profile and cloud environment settings wherever you added it. Run `unset CSTACK_MODE` in an open shell, then start new sessions. The old hook read this variable. It did not write your shell profile.
3. Inspect `~/.intent/skills/` for links delivered by the old installer, including `<plugin>-mode`. Its record is `~/.local/share/<plugin>-install-record.json`, or `$XDG_DATA_HOME/<plugin>-install-record.json` if you set an absolute data directory. Compare each recorded `path` and `target` with the link's current target using `readlink`. Remove only matching installer links. Keep your own skills and changed links. If the record is missing, inspect the targets and remove only links into the old plugin copy.
4. If you ran the old specialist setup, read `~/.local/share/<plugin>-setup-record.json`, or its counterpart under `$XDG_DATA_HOME`. The record holds original files for `~/.intent/specialists/`. Before deleting the old plugin copy, use its recorded `pluginRoot` to inspect the undo and then restore the files:

   ```bash
   node "<old-plugin-root>/hooks/intent-setup.mjs" revert --report-only
   node "<old-plugin-root>/hooks/intent-setup.mjs" revert
   ```

   Keep the record until any later-edited files and their saved originals are resolved.
5. Uninstall older native plugin installations, then install the current plugin using the instructions above. For Claude Code, use the **Installed** tab in `/plugin`. For Codex, use `/plugins` and select **Uninstall plugin**. For Cursor, manage the existing installation in **Customize** before reloading the local copy. See [Claude Code plugin management](https://code.claude.com/docs/en/discover-plugins#manage-installed-plugins), [Codex plugin removal](https://learn.chatgpt.com/docs/plugins#remove-a-plugin), and [Cursor plugin management](https://cursor.com/docs/plugins#managing-installed-plugins).

   The old bundle registered `hooks/mode.sh` and `hooks/read-own.sh` through `hooks/hooks.json`, plus Cursor's `hooks/cursor.json`. If you copied those hook entries into host settings, remove only entries that call those two scripts. Keep unrelated hooks. The installer used native host commands. It did not directly write those copied entries.
6. After removing the links and restoring specialist files, remove the old Intent plugin copy under `~/.local/share/<plugin>/`, or `$XDG_DATA_HOME/<plugin>/`. You can then remove resolved install and setup records. The old mode's saved choices are under `~/.local/state/<plugin>/<plugin>-mode/`, or `$XDG_STATE_HOME/<plugin>/<plugin>-mode/`. Those choices can also be removed.

Install the current toolkit through the host instructions above. For Intent or another harness without this native plugin path, copy `skills/` into its supported skill directory.

## Develop and verify

Use the Bun version pinned in [tools/package.json](tools/package.json). From a checkout, install locked dependencies before running checks:

```bash
bun install --cwd tools --frozen-lockfile --ignore-scripts
bun run --cwd tools check:toolkit
bun run --cwd tools check:hosts
bun run --cwd tools typecheck
bun run --cwd tools test
```

`check:toolkit` checks descriptions, the discovery budget, frontmatter, Markdown links, invocation policy, and forbidden process or host patterns. `check:hosts` checks generated files against their sources. `typecheck` checks the tooling's TypeScript. `test` runs both `test:unit` and `test:integration`. GitHub Actions runs these checks on pull requests and pushes to main.

For Linux x86_64 environments with Node and npm available, run `bash tools/setup.sh`. It installs pinned Bun under `/workspace/.plugin-tools`, installs dependencies, and runs typecheck, host checks, and tests. Run `check:toolkit` separately. Add `/workspace/.plugin-tools/bin` to PATH, or set `SETUP_TOOL_ROOT` to choose another installation directory.

### Maintain metadata and the catalog

The source layout is:

| Path | Role |
| --- | --- |
| `skills/` | Shared skills, task guides, and their references. |
| `tools/` | Repository checks, host generation, setup, and release tooling. |
| `.claude-plugin/`, `.codex-plugin/`, `.agents/plugins/`, `.cursor-plugin/` | Generated host manifests and marketplace catalogs. |
| `skills/*/agents/openai.yaml` | Generated Codex metadata and invocation policy. |
| `tests/unit/`, `tests/integration/` | Tooling tests through CLI, filesystem, and Git fixtures. |
| `contrib/` | Optional vendor-specific sources. No manifest loads them. |

Edit plugin metadata in `tools/metadata.json` and invocation policy in skill frontmatter. Regenerate host files with `bun run --cwd tools sync:hosts`. Keep version changes for the release workflow.

To regenerate the catalog tables from frontmatter, run this from the checkout root:

```bash
bun -e '
import { readdirSync, readFileSync } from "node:fs";
const skills = readdirSync("skills").sort().map(name => {
	const path = `skills/${name}/SKILL.md`;
	const frontmatter = readFileSync(path, "utf8").split("---")[1];
	return { path, ...Bun.YAML.parse(frontmatter) };
});
for (const manual of [false, true]) {
	console.log(manual ? "User-invoked task guides" : "Model-invocable toolkit");
	console.log("| Skill | When to use it |\n| --- | --- |");
	for (const s of skills.filter(s => (s["disable-model-invocation"] === true) === manual))
		console.log(`| [\`${s.name}\`](${s.path}) | ${s.description} |`);
}
'
```

## Sources and license

The plugin builds on [PStack by Lauren Tan (poteto)](https://github.com/cursor/plugins/tree/main/pstack). The imported baseline is PStack 0.15.13 at [`cursor/plugins@2cbf585`](https://github.com/cursor/plugins/tree/2cbf58508f40de470d7490b55c51d71241928fa2/pstack). The original 0.15.5 import remains in Git history at `c31f7ace991843f5576398ad025969465251192c`.

[MIT](LICENSE). Upstream license notices and source provenance remain with imported material. `align`, `grill-with-docs`, and `domain-modeling` adapt [mattpocock/skills](https://github.com/mattpocock/skills). `show-me` adapts [humanlayer/skills](https://github.com/humanlayer/skills). `deslop`, `control-ui`, and `control-cli` adapt [Cursor Team Kit](https://github.com/cursor/plugins/tree/main/cursor-team-kit). Each keeps its upstream MIT license and an `origin.json` beside its `SKILL.md`.
