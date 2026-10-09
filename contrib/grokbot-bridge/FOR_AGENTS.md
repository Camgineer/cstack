# grokbot-bridge

A remote MCP server with one tool, `notify_grokbot(message, project, thread)`. It POSTs the note as JSON to a webhook URL, so a Claude Project thread can push a blocker, a question, or finished work to a bot.

## Contract

- Endpoint: `POST /mcp/<BRIDGE_TOKEN>`. Any other path returns 404. Transport is MCP Streamable HTTP with JSON responses, stateless.
- Tool: `notify_grokbot`. Required: `message` (1 to 4000 characters). Optional: `project`, `thread` (at most 200 characters each). Unknown arguments are rejected.
- Webhook request: `POST <GROKBOT_WEBHOOK_URL>` with `authorization: Bearer <GROKBOT_WEBHOOK_SECRET>` and body `{"message","project","thread","source":"claude-projects"}`. Missing optional fields are `null`. Timeout is 10 seconds.
- Failures return a tool result with `isError: true`. The secret never appears in a result.

## Environment

| Variable | Purpose |
| --- | --- |
| `BRIDGE_TOKEN` | Path token that the connector URL carries. Required. |
| `GROKBOT_WEBHOOK_URL` | Webhook URL. Required. |
| `GROKBOT_WEBHOOK_SECRET` | Bearer secret for the webhook. Required. Never commit it. |
| `PORT` | Port for `src/serve.ts`. Default 8787. |

## Commands

- Test: `cd contrib/grokbot-bridge && bun test`. The test starts a fake webhook and the bridge on local ports, so it needs no real URL or secret.
- Run locally: `bun src/serve.ts`, with the variables above set.
- Deploy to Cloudflare Workers: `npx wrangler@4 secret put BRIDGE_TOKEN`, then the same for `GROKBOT_WEBHOOK_URL` and `GROKBOT_WEBHOOK_SECRET`, then `npx wrangler@4 deploy`. The entry point is `src/worker.ts`, and config is in `wrangler.toml`.

`contrib/` is not loaded by any manifest and CI does not run this test. Run it by hand.
