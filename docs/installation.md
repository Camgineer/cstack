# Install and remove the CStack pilot

This procedure targets the file-preset implementation inspected at OpenMausBot commit `033fd71fdc1b61a094c77942abd6f8efc93b52c0`. The package has passed that parser. The live steps below have not been run. Check the deployed app during the pilot and record any difference.

## Before installation

Use a selected pilot bot with a defined role and a controlled code fixture. Review [the activation block](../openmausbot/activation.md) and the three [generated skills](../dist/openmausbot/skills/). Reading source files does not install them.

Record the package release and hash from [the manifest](../dist/openmausbot/manifest.json). For an existing bot, save its current instructions and the names, contents, enabled state, and ownership of any colliding skills. Keep that backup private and outside the distribution. Record the bot's role, model, access, and connected tools so the pilot can verify preservation.

Confirm access to native controls that install skill text, inspect full text, and enable it for the target bot. Check whether skills are bot-specific or shared. Stop a conflicting skill replacement for review; a matching name does not establish CStack ownership. The new-bot and existing-bot paths below are alternatives.

## New bot

1. In Templates, Import, select [cstack-pilot-0.1.0.openmaus.json](../dist/openmausbot/cstack-pilot-0.1.0.openmaus.json). Verify that the preview shows one CStack preset and the three named skills. Add the preset.
2. In New bot, choose CStack pilot as the starting role. Give the bot its name, purpose, model, and access. Retain both marked activation blocks alongside its role instructions. The preset supplies only these instructions and skills; it leaves the bot identity fields open.
3. Create the bot. Inspect its saved instructions and skill list. File-preset skills arrive switched off. Review and enable `simple-as-prose`, `writing-for-agents`, and `cstack-how`.
4. Verify that each enabled skill contains its embedded references and license notices. Start a fresh conversation and run [the pilot cases](evals/pilot-live.md). Record actual tool evidence and output before calling installation successful.

If an assistant is asked to create or configure a bot, it follows OpenMausBot's native Chief of Staff setup path. These user-interface steps do not authorize an assistant to bypass that path. Installation requires a separate user request after repository review.

## Existing bot

1. Inspect the bot's saved instructions and skill inventory. Capture the private backup described above. Verify access to native skill and profile controls for that bot.
2. Add the three generated `SKILL.md` files from `dist/openmausbot/skills/` through the native skill controls. When using a supported agent skill tool, submit the full generated text. Inspect its result for applied versus pending state. A source-repository install could select the unbundled files, so this pilot uses the generated text explicitly.
3. Review and enable the installed skills. If the deployment uses the shared library, establish which assignments belong to this bot before changing state. If a name already exists with different content, prepare a diff and obtain the user's choice before replacement. Reuse an identical existing skill and record that it predates CStack.
4. Append the two marked blocks from `openmausbot/activation.md` to the existing standing instructions. Review the complete merged result so the bot's role and rules survive. Use the authorized native profile mechanism; a local SOUL file edit does not establish a profile update.
5. Read back the saved profile and full skills. Verify that the role, model, permissions, and unrelated configuration still match the backup. Open a fresh conversation and run the pilot cases.

A pending native proposal remains pending until the app reports it applied. A permissions failure is a blocker for that step. No whole-preset operation for existing bots is assumed.

## Updates

Treat a new file-preset release as a new starting option for new bots. Existing bots keep their installed copies. For each existing bot, compare its current CStack blocks and skills with the recorded installed hashes, then prepare a diff against the new release. Preserve user edits and require an explicit choice for conflicts. Apply the reviewed changes through native controls, read them back, and repeat affected cases in a fresh conversation.

The marker names identify the writing policy and How workflow separately. The receipt records the exact installed versions and hashes; repository files are not an installation receipt. This pilot has no automatic updater.

## Disable or remove

To disable the How pilot while keeping the required writing rules, remove only the `CSTACK HOW PILOT` block from standing instructions and disable or remove the CStack-owned `cstack-how` skill. Keep the `CSTACK WRITING` block and both writing skills. Start a fresh conversation and verify that the bot no longer loads or claims to use `cstack-how`. It may still explain code using its normal process.

To remove the starting option, use Remove from New bot on the imported preset. This does not remove installed bot content.

For an explicitly requested full rollback on an isolated test bot, restore the pre-pilot instruction snapshot and remove or restore only the skill copies the installation receipt identifies. Preserve pre-existing writing skills, unrelated instructions, and user edits. A full rollback that would remove the user's standing writing policy needs that explicit scope. In shared-library mode, remove the target bot's assignment rather than globally disabling a skill. Verify the saved state and use a fresh conversation; old conversations may still contain previously read instructions.

## Receipt

Record these values privately for each installation: bot ID, date, app revision if available, package ID and release, package SHA-256, pre-install backup location, installed block text, skill text hashes and prior ownership, applied or pending status, read-back evidence, and live case results. Keep private bot data and sign-in material outside this repository.
