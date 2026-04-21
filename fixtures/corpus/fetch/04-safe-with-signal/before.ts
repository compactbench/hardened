const API_BASE = "https://api.example.com/v1";

export async function getOrderWithTimeout(orderId: string, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE}/orders/${orderId}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`getOrder(${orderId}) failed: ${response.status}`);
    }

    return response.json() as Promise<{ id: string; total: number; currency: string }>;
  } finally {
    clearTimeout(timer);
  }
}
