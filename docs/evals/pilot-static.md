# Pilot package verification

Checked on 2026-10-02 with Node v24.21.0. This is a repository and parser check, not a live bot evaluation.

| Check | Result |
|---|---|
| Deterministic generation and checked-in output comparison | Pass |
| Six packaging tests, including missing reference, missing license, path escape, and size rejection | Pass |
| Native OpenMausBot parser accepts the complete package without stripping or changing fields | Pass |
| Native skill scan across all three bundled skills | Pass, no warnings |
| Native rejection of an absent assigned skill and inconsistent description | Pass |
| Required references and MIT notices present; standalone generated skills match preset text | Pass |
| Simple as Prose source hashes match the recovered origin record | Pass |
| Existing upstream files preserved, except the root README whose text is copied to docs/upstream | Pass |
| Documentation relative links | Pass |
| Evaluation fixture ground truth | Six assertions passed; no bot involved |
| Live import, activation, writing quality, identity preservation, updates, and removal | Not run |

The package SHA-256 is `789af29d046644ebe2c1138066feb7c8cfae9ff4e24ef404457ee169a04bb136`. Rebuilding after an instruction change requires a new check and an updated record.

## Repeat the checks

```sh
node scripts/build_openmausbot.mjs --check
node tests/openmausbot.test.mjs
node scripts/validate_openmausbot.mjs /path/to/OpenMausBot dist/openmausbot/cstack-pilot-0.1.0.openmaus.json
```

For the third command, use the parser files from OpenMausBot commit `033fd71fdc1b61a094c77942abd6f8efc93b52c0` with its dependencies available. [platform-lock.json](../../openmausbot/platform-lock.json) lists the five source files, exact SHA-256 values, and dependency versions. The validator rejects different parser source bytes before loading them. It imports only the parser and its direct dependencies, without starting the app or changing bot settings.

This run used an isolated directory at `/tmp/cstack-native-check` with those five files, Node's TypeScript support, and `zod@4.4.3`, `yaml@2.9.0`, and `croner@10.0.1`. The dependencies were installed with npm lifecycle scripts disabled. The repository build itself uses only Node's standard library.

The validator prints the package hash, skill byte sizes, and passed checks. The largest skill in this build is 14,759 bytes; the pinned platform limit is 262,144 bytes per skill. Passing that limit says nothing about a model's ability to follow the text. [The live cases](pilot-live.md) test that separately.

No independent reviewer was used. The live app revision has not been established, and no installed skill or bot configuration changed.
