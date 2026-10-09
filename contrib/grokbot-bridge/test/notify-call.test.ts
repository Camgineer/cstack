import { afterEach, describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createBridgeHandler } from "../src/app.ts";

const servers: { stop(force: boolean): void }[] = [];
afterEach(() => {
  for (const server of servers.splice(0)) server.stop(true);
});

function startFakeWebhook(received: { auth: string | null; body: unknown }[]) {
  const webhook = Bun.serve({
    port: 0,
    async fetch(request) {
      received.push({ auth: request.headers.get("authorization"), body: await request.json() });
      return Response.json({ ok: true });
    },
  });
  servers.push(webhook);
  return webhook;
}

function startBridge(webhookPort: number) {
  const bridge = Bun.serve({
    port: 0,
    fetch: createBridgeHandler({
      webhookUrl: `http://localhost:${webhookPort}/grokbot/webhook`,
      secret: "test-secret",
      pathToken: "t".repeat(32),
    }),
  });
  servers.push(bridge);
  return bridge;
}

describe("notify_grokbot", () => {
  test("one tool call over MCP reaches the Grok Bot webhook with the secret", async () => {
    const received: { auth: string | null; body: unknown }[] = [];
    const webhook = startFakeWebhook(received);
    const bridge = startBridge(webhook.port);

    const client = new Client({ name: "bridge-test", version: "0.0.0" });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(`http://localhost:${bridge.port}/mcp/${"t".repeat(32)}`)),
    );
    const result = await client.callTool({
      name: "notify_grokbot",
      arguments: { message: "blocked on the schema decision", project: "CStack", thread: "thread-1" },
    });
    await client.close();

    expect(result.isError).toBeFalsy();
    expect(received).toEqual([
      {
        auth: "Bearer test-secret",
        body: expect.objectContaining({
          message: "blocked on the schema decision",
          project: "CStack",
          thread: "thread-1",
          source: "claude-projects",
        }),
      },
    ]);
  });

  test("a request to the wrong path is refused and never reaches the webhook", async () => {
    const received: { auth: string | null; body: unknown }[] = [];
    const webhook = startFakeWebhook(received);
    const bridge = startBridge(webhook.port);

    const response = await fetch(`http://localhost:${bridge.port}/mcp/wrong-token`, { method: "POST" });

    expect(response.status).toBe(404);
    expect(received).toEqual([]);
  });
});
