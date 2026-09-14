# Develop and try C-Stack

## Manual local install

Review source and hook permissions first. Run these yourself when ready:

```sh
codex plugin marketplace add /Users/cameron/repos/cstack
codex plugin add cstack@cstack-local
```

Start a fresh task and confirm the C-Stack hook receipt. Do not keep two enabled copies of the same PStack, Team Kit, or Matt Pocock workflow in the trial task. Invoke `$cstack:setup-bot` with a purpose and ask for guided setup.

## Development updates

Commit source changes after checks. Push to the private origin for backup. Refresh the local marketplace and reinstall C-Stack using supported plugin commands. Test in a fresh task. A push to main does not prove an installed plugin or existing bot updated.

## User-run acceptance

- Confirm default Poteto context, explicit disable, ordinary turn remaining disabled, explicit re-enable, and resume.
- Confirm the bot's saved real task ID against native task state.
- Delegate one bounded job and inspect its result and board entry.
- Talk to the lead while useful worker execution continues; retain timing evidence for the agreed 30-second target.
- Resume from a recorded checkpoint without duplicate execution.

Offline tests do not establish these Desktop behaviors.
