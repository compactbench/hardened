import got from "got";

const API_BASE = "https://api.example.com/v1";

export async function fetchCustomer(customerId: string) {
  return got.get(`${API_BASE}/customers/${customerId}`, {
    timeout: { request: 5000 },
  });
}

export async function updateCustomer(customerId: string, patch: { email?: string }) {
  return got.patch(`${API_BASE}/customers/${customerId}`, {
    json: patch,
    timeout: { request: 3000, connect: 1000 },
  });
}
