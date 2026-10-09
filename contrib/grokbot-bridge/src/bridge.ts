// A remote MCP server (Streamable HTTP, stateless JSON responses) with one tool that forwards a note to a webhook.
// It uses only Fetch API globals, so the same handler runs on Bun, Node 18+, and Cloudflare Workers.

export type Env = Record<string, string | undefined>;

const SERVER_INFO = { name: "grokbot-bridge", version: "0.1.0" };
const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
const MAX_MESSAGE_LENGTH = 4000;
const MAX_LABEL_LENGTH = 200;
const WEBHOOK_TIMEOUT_MS = 10_000;
const MIN_TOKEN_LENGTH = 32;

export const NOTIFY_TOOL = {
  name: "notify_grokbot",
  description:
    "Send a note to the team's Grok Bot webhook. Use it for blockers, questions that need a person, and finished work from a Claude Project thread.",
  inputSchema: {
    type: "object",
    properties: {
      message: { type: "string", minLength: 1, maxLength: MAX_MESSAGE_LENGTH, description: "The text to send." },
      project: { type: "string", maxLength: MAX_LABEL_LENGTH, description: "The project the thread belongs to." },
      thread: { type: "string", maxLength: MAX_LABEL_LENGTH, description: "The thread title or link." },
    },
    required: ["message"],
    additionalProperties: false,
  },
};

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc?: unknown;
  id?: JsonRpcId;
  method?: unknown;
  params?: Record<string, unknown>;
};

export type WebhookConfig = { webhookUrl: string; webhookSecret: string };

export type ConfigResult = { ok: true; config: WebhookConfig } | { ok: false; problem: string };

// Reads and checks the env vars. The bridge refuses to run on a bad config, so no note is sent to an unsafe URL or behind a guessable path.
export function readConfig(env: Env): ConfigResult {
  const { BRIDGE_TOKEN: token, GROKBOT_WEBHOOK_URL: webhookUrl, GROKBOT_WEBHOOK_SECRET: webhookSecret } = env;
  if (!token || !webhookUrl || !webhookSecret) {
    return { ok: false, problem: "BRIDGE_TOKEN, GROKBOT_WEBHOOK_URL and GROKBOT_WEBHOOK_SECRET must be set." };
  }
  if (token.length < MIN_TOKEN_LENGTH) {
    return { ok: false, problem: `BRIDGE_TOKEN must be at least ${MIN_TOKEN_LENGTH} characters.` };
  }
  if (!isSecureWebhookUrl(webhookUrl)) {
    return { ok: false, problem: "GROKBOT_WEBHOOK_URL must be an https URL." };
  }
  return { ok: true, config: { webhookUrl, webhookSecret } };
}

function isSecureWebhookUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  // Plain http is allowed only for a local webhook, so tests and local runs can use one.
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  return url.protocol === "https:" || (local && url.protocol === "http:");
}

export async function handle(request: Request, env: Env, fetchWebhook: typeof fetch = fetch): Promise<Response> {
  const token = env.BRIDGE_TOKEN ?? "";
  if (!token || new URL(request.url).pathname !== `/mcp/${token}`) {
    return text("Not found.", 404);
  }
  const loaded = readConfig(env);
  if (!loaded.ok) {
    return text(`Bridge is not configured. ${loaded.problem}`, 500);
  }
  if (request.method !== "POST") {
    return text("Method not allowed.", 405, { allow: "POST" });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error." } }, 400);
  }

  const messages: unknown[] = Array.isArray(body) ? body : [body];
  const replies: object[] = [];
  for (const message of messages) {
    const reply = await dispatch(message as JsonRpcRequest, loaded.config, fetchWebhook);
    if (reply) replies.push(reply);
  }
  if (replies.length === 0) {
    return new Response(null, { status: 202 });
  }
  return json(Array.isArray(body) ? replies : replies[0]);
}

async function dispatch(message: JsonRpcRequest, webhook: WebhookConfig, fetchWebhook: typeof fetch): Promise<object | null> {
  // A message without an id is a notification, and gets no reply.
  if (message.id === undefined) return null;
  const id = message.id;
  switch (message.method) {
    case "initialize":
      return result(id, {
        protocolVersion: negotiateVersion(message.params?.protocolVersion),
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });
    case "ping":
      return result(id, {});
    case "tools/list":
      return result(id, { tools: [NOTIFY_TOOL] });
    case "tools/call":
      return callTool(id, message.params ?? {}, webhook, fetchWebhook);
    default:
      return rpcError(id, -32601, `Method not found: ${String(message.method)}`);
  }
}

async function callTool(
  id: JsonRpcId,
  params: Record<string, unknown>,
  webhook: WebhookConfig,
  fetchWebhook: typeof fetch,
): Promise<object> {
  if (params.name !== NOTIFY_TOOL.name) {
    return rpcError(id, -32602, `Unknown tool: ${String(params.name)}`);
  }
  const args = (params.arguments ?? {}) as Record<string, unknown>;
  const problem = checkArguments(args);
  if (problem) return result(id, toolError(problem));

  const payload = {
    message: (args.message as string).trim(),
    project: args.project ?? null,
    thread: args.thread ?? null,
    source: "claude-projects",
  };
  try {
    const response = await fetchWebhook(webhook.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${webhook.webhookSecret}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
    if (!response.ok) {
      return result(id, toolError(`The Grok Bot webhook answered ${response.status}.`));
    }
  } catch (error) {
    return result(id, toolError(`The Grok Bot webhook could not be reached: ${errorName(error)}.`));
  }
  return result(id, { content: [{ type: "text", text: "Sent to Grok Bot." }], isError: false });
}

function checkArguments(args: Record<string, unknown>): string | null {
  const allowed = new Set(["message", "project", "thread"]);
  const unknown = Object.keys(args).find((key) => !allowed.has(key));
  if (unknown) return `Unknown argument: ${unknown}.`;
  if (typeof args.message !== "string" || args.message.trim() === "") return "message must be a non-empty string.";
  if (args.message.length > MAX_MESSAGE_LENGTH) return `message must be at most ${MAX_MESSAGE_LENGTH} characters.`;
  for (const key of ["project", "thread"] as const) {
    const value = args[key];
    if (value !== undefined && (typeof value !== "string" || value.length > MAX_LABEL_LENGTH)) {
      return `${key} must be a string of at most ${MAX_LABEL_LENGTH} characters.`;
    }
  }
  return null;
}

function negotiateVersion(requested: unknown): string {
  return typeof requested === "string" && PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0];
}

function toolError(message: string) {
  return { content: [{ type: "text", text: message }], isError: true };
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "unknown error";
}

function result(id: JsonRpcId, value: object) {
  return { jsonrpc: "2.0", id, result: value };
}

function rpcError(id: JsonRpcId, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

function text(body: string, status: number, headers: Record<string, string> = {}): Response {
  return new Response(body, { status, headers });
}
