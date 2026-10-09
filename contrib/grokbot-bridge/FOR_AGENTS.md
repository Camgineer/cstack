# grokbot-bridge for agents

A hosted MCP server with one tool, `notify_grokbot(message, project, thread)`. It POSTs the note as JSON to a Grok Bot webhook over HTTPS. The Grok Bot secret is sent as a bearer token. Claude.ai connects to it as a custom connector.

## Files

- `src/notify.ts` builds and sends the webhook request. It returns a result instead of throwing.
- `src/app.ts` exposes the MCP endpoint at `/mcp/<BRIDGE_PATH_TOKEN>`. Any other path returns 404.
- `src/main.ts` reads env vars, rejects a non-HTTPS webhook URL and a path token under 32 characters, and serves on `PORT`.
- `test/notify-call.test.ts` runs a real MCP client against the handler and checks that one call reaches a fake webhook.

## Env vars

Set these at runtime. Never commit them. `.env.example` lists the names.

- `GROKBOT_WEBHOOK_URL`: the Grok Bot webhook URL, HTTPS.
- `GROKBOT_SECRET`: sent as `Authorization: Bearer`.
- `BRIDGE_PATH_TOKEN`: at least 32 random characters. It is the only auth on the MCP endpoint, so it is part of the connector URL.
- `PORT`: optional, default 8787.

## Commands

- `bun install --frozen-lockfile` from this directory.
- `bun test` runs the suite.
- `bun run start` serves the bridge.

## Assumptions to verify

- The Grok Bot webhook takes a JSON body and a bearer header. The request body is `{message, project, thread, source, sent_at}`. Confirm both against the Grok Bot docs before the first live send.
