import axios from "axios";

interface WebhookPayload {
  event: string;
  deliveredAt: string;
  data: Record<string, unknown>;
}

export async function forwardWebhook(targetUrl: string, payload: WebhookPayload): Promise<boolean> {
  try {
    const res = await axios.post(targetUrl, payload, {
      headers: { "content-type": "application/json" },
    });
    return res.status >= 200 && res.status < 300;
  } catch (err) {
    console.error("webhook delivery failed", err);
    return false;
  }
}
