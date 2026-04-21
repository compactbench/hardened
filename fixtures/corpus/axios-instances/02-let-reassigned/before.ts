import axios, { AxiosInstance } from "axios";

let client: AxiosInstance | undefined;

function initClient(token: string) {
  client = axios.create({
    baseURL: "https://api.billing.example.com",
    headers: { authorization: `Bearer ${token}` },
  });
}

export async function chargeInvoice(invoiceId: string, amountCents: number) {
  if (!client) {
    initClient(process.env.BILLING_TOKEN ?? "");
  }
  return client!.post(`/invoices/${invoiceId}/charge`, {
    amountCents,
    currency: "USD",
  });
}
