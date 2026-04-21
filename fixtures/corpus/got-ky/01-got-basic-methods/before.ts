import got from "got";

const API_BASE = "https://api.example.com/v1";

export async function listInvoices() {
  return got.get(`${API_BASE}/invoices`);
}

export async function createInvoice(body: { customerId: string; amount: number }) {
  return got.post(`${API_BASE}/invoices`, { json: body });
}
