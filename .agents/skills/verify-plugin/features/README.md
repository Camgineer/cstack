# Plugin command verification map

Read [Launch and Doctor](../SKILL.md) before driving. Every recipe runs from `skills/cstack-mode/scripts` in the launch shell. Use its `verifyReceipts` directory so commands and full output survive fixture cleanup.

## Features

| ID | Feature | Entry points covered |
| --- | --- | --- |
| install | [Install and update](install.md) | Report, noninteractive update, selected-host install, source override, failed-host retry. |
| delivery | [Intent delivery](intent-delivery.md) | Checkout delivery, fetched-package delivery, ownership preservation, interrupted delivery. |
| setup | [Seat setup](seat-setup.md) | Report, unapproved and approved apply, revert report, revert, interrupted apply recovery. |
| mode | [Persistent mode](persistent-mode.md) | Typed on/off, shell on/off/status, environment default, restored sessions, Cursor hooks. |
| receipts | [Check receipts](check-receipts.md) | Record, check, exact-head gate, stale/failed receipt refusal, isolated storage. |

## Proof contract

The fixture executes production commands and asserts visible output plus stored state. Read each feature's expected observations alongside its saved transcript. External host CLIs and `intentd` are process-boundary stand-ins. These recipes prove command behavior in fixtures. They do not install into a real account or prove host discovery, hook trust, specialist delegation, or model behavior.

Report every recipe run and the head it ran on. A skipped entry point stays unverified. Cleanup removes fixture state; receipts and logs remain under the launch's `tmp/` run directory. Use a fresh launch after surprising residue or a changed checkout.
