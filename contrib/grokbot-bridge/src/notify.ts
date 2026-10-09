export type NotifyInput = {
  message: string;
  project: string;
  thread: string;
};

export type WebhookConfig = {
  webhookUrl: string;
  secret: string;
};

export type NotifyResult =
  | { ok: true; status: number }
  | { ok: false; status?: number; error: string };

export async function notifyGrokbot(
  config: WebhookConfig,
  input: NotifyInput,
  fetchFn: typeof fetch = fetch,
): Promise<NotifyResult> {
  let response: Response;
  try {
    response = await fetchFn(config.webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.secret}`,
      },
      body: JSON.stringify({
        ...input,
        source: "claude-projects",
        sent_at: new Date().toISOString(),
      }),
    });
  } catch (error) {
    return { ok: false, error: `Grok Bot webhook unreachable: ${(error as Error).message}` };
  }

  if (!response.ok) {
    return { ok: false, status: response.status, error: `Grok Bot webhook responded ${response.status}` };
  }
  return { ok: true, status: response.status };
}
