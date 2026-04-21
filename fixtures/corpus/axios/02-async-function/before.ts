import axios from "axios";

interface Invoice {
  id: string;
  amount: number;
  currency: string;
}

export async function fetchInvoice(invoiceId: string): Promise<Invoice> {
  const response = await axios.get(`https://billing.internal/invoices/${invoiceId}`);
  return response.data as Invoice;
}
