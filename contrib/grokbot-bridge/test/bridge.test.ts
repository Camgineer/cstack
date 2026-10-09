import { afterEach, expect, test } from "bun:test";
import { handle, type Env } from "../src/bridge.ts";

const TOKEN = "path-token-for-tests-0123456789abcdef";
const SECRET = "webhook-secret-for-tests";

type Received = { method: string; authorization: string | null; body: unknown };

const servers: { stop: (force?: boolean) => void }[] = [];

afterEach(() => {
  for (const server of servers.splice(0)) server.stop(true);
});

function startWebhook(status = 200) {
  const received: Received[] = [];
  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      received.push({
        method: request.method,
        authorization: request.headers.get("authorization"),
        body: await request.json(),
      });
      return new Response("accepted", { status });
    },
  });
  servers.push(server);
  return { url: `http://localhost:${server.port}/hook`, received };
}

function startBridge(webhookUrl: string, token = TOKEN) {
  const env: Env = { BRIDGE_TOKEN: token, GROKBOT_WEBHOOK_URL: webhookUrl, GROKBOT_WEBHOOK_SECRET: SECRET };
  const server = Bun.serve({ port: 0, fetch: (request) => handle(request, env) });
  servers.push(server);
  return `http://localhost:${server.port}/mcp/${token}`;
}

function rpc(endpoint: string, body: unknown) {
  return fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify(body),
  });
}

function callNotify(args: Record<string, unknown>) {
  return { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "notify_grokbot", arguments: args } };
}

test("one notify_grokbot call reaches the webhook with the message and the bearer secret", async () => {
  const webhook = startWebhook();
  const endpoint = startBridge(webhook.url);

  const response = await rpc(endpoint, callNotify({ message: "Blocked on the deploy key", project: "Demo", thread: "Fix login" }));
  const reply = await response.json();

  expect(response.status).toBe(200);
  expect(reply.result).toEqual({ content: [{ type: "text", text: "Sent to Grok Bot." }], isError: false });
  expect(webhook.received).toEqual([
    {
      method: "POST",
      authorization: `Bearer ${SECRET}`,
      body: { message: "Blocked on the deploy key", project: "Demo", thread: "Fix login", source: "claude-projects" },
    },
  ]);
});

test("the endpoint answers only at its path token", async () => {
  const webhook = startWebhook();
  const endpoint = startBridge(webhook.url);
  const wrongPath = endpoint.replace(TOKEN, "guessed-token");

  const response = await rpc(wrongPath, callNotify({ message: "hello" }));

  expect(response.status).toBe(404);
  expect(webhook.received).toEqual([]);
});

test("a webhook failure comes back as a tool error that does not echo the secret", async () => {
  const webhook = startWebhook(500);
  const endpoint = startBridge(webhook.url);

  const reply = await (await rpc(endpoint, callNotify({ message: "finished the migration" }))).json();

  expect(reply.result.isError).toBe(true);
  expect(reply.result.content[0].text).toBe("The Grok Bot webhook answered 500.");
  expect(JSON.stringify(reply)).not.toContain(SECRET);
  expect(webhook.received).toHaveLength(1);
});

test("an empty message is rejected before the webhook is called", async () => {
  const webhook = startWebhook();
  const endpoint = startBridge(webhook.url);

  const reply = await (await rpc(endpoint, callNotify({ message: "   " }))).json();

  expect(reply.result).toEqual({ content: [{ type: "text", text: "message must be a non-empty string." }], isError: true });
  expect(webhook.received).toEqual([]);
});

test("the bridge refuses to answer when the webhook URL is not https", async () => {
  const endpoint = startBridge("http://example.com/hook");

  const response = await rpc(endpoint, callNotify({ message: "hello" }));

  expect(response.status).toBe(500);
  expect(await response.text()).toBe("Bridge is not configured. GROKBOT_WEBHOOK_URL must be an https URL.");
});

test("the bridge refuses to answer when the path token is shorter than 32 characters", async () => {
  const webhook = startWebhook();
  const endpoint = startBridge(webhook.url, "short-token");

  const response = await rpc(endpoint, callNotify({ message: "hello" }));

  expect(response.status).toBe(500);
  expect(await response.text()).toBe("Bridge is not configured. BRIDGE_TOKEN must be at least 32 characters.");
  expect(webhook.received).toEqual([]);
});

test("tools/list advertises notify_grokbot with message required", async () => {
  const webhook = startWebhook();
  const endpoint = startBridge(webhook.url);

  const reply = await (await rpc(endpoint, { jsonrpc: "2.0", id: 2, method: "tools/list" })).json();

  expect(reply.result.tools.map((tool: { name: string }) => tool.name)).toEqual(["notify_grokbot"]);
  expect(reply.result.tools[0].inputSchema.required).toEqual(["message"]);
});
