# CStack

CStack adapts [pstack](https://github.com/cursor/plugins/tree/main/pstack), by Lauren Tan (poteto), for OpenMausBot. It preserves upstream reasoning and attribution while replacing platform-specific assumptions.

The first pilot contains one complete adapted workflow, How, and two required writing skills:

- Simple as Prose applies to every human-facing reply and artifact.
- Writing for Agents applies whenever text is written or edited for an agent.
- Both apply when the audience overlaps.

The rest of pstack remains available as source material for the port. The pilot does not represent the complete kit.

## Review the pilot

The [preset package](dist/openmausbot/cstack-pilot-0.1.0.openmaus.json) is prepared for review. It contains the activation instructions and three self-contained skills, including their references and licenses. [Setup and removal](docs/installation.md) cover new and existing bots. [The pilot record](docs/pilot.md) tracks source changes, checks, and remaining live tests.

The package passes the pinned OpenMausBot parser and local packaging checks. It has not been imported into the live app or evaluated on a pilot bot. Automatic activation, writing quality, and removal behavior remain unverified.

## Build and check

Use Node 24. No dependencies are needed to build the package or run its local tests.

```sh
node scripts/build_openmausbot.mjs
node scripts/build_openmausbot.mjs --check
node tests/openmausbot.test.mjs
```

The builder writes only `dist/openmausbot/`. Edit the sources listed in [the package definition](openmausbot/pilot.json), then rebuild. Each generated skill matches the text carried in the preset. The manifest records input and output hashes. See [the verification record](docs/evals/pilot-static.md) to repeat the native parser check.

## Sources and status

[The original pstack README](docs/upstream/README.md) documents the imported Cursor kit. [Provenance](docs/upstream/PROVENANCE.md) records the import and writing-skill sources. [OpenMausBot compatibility](docs/openmausbot.md) separates the inspected platform contract from pending live checks.

The original [MIT license](LICENSE) is preserved. The writing skills retain their own MIT notices.
