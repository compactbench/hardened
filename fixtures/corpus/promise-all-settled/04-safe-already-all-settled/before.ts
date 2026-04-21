// Already using Promise.allSettled - the author explicitly opted into
// per-promise outcome tracking. Nothing to flag here; this is exactly
// what the rule would suggest.
interface Webhook {
  url: string;
  secret: string;
}

interface DeliveryResult {
  webhookUrl: string;
  ok: boolean;
}

async function deliver(hook: Webhook, payload: unknown): Promise<void> {
  const res = await fetch(hook.url, {
    method: "POST",
    headers: { "X-Signature": hook.secret },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`delivery failed: ${res.status}`);
  }
}

export async function fanOut(
  hooks: Webhook[],
  payload: unknown,
): Promise<DeliveryResult[]> {
  const outcomes = await Promise.allSettled(
    hooks.map((h) => deliver(h, payload)),
  );
  return outcomes.map((o, i) => ({
    webhookUrl: hooks[i].url,
    ok: o.status === "fulfilled",
  }));
}
