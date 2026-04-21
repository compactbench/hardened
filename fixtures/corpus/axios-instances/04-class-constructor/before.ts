import axios, { AxiosInstance } from "axios";

interface StripeChargeResponse {
  id: string;
  status: string;
}

export class PaymentsClient {
  private readonly api: AxiosInstance;

  constructor(apiKey: string) {
    this.api = axios.create({
      baseURL: "https://api.stripe.com/v1",
      headers: { authorization: `Bearer ${apiKey}` },
    });
  }

  async createCharge(amountCents: number, source: string): Promise<StripeChargeResponse> {
    const res = await this.api.post("/charges", {
      amount: amountCents,
      currency: "usd",
      source,
    });
    return { id: res.data.id, status: res.data.status };
  }

  async refundCharge(chargeId: string) {
    return this.api.post("/refunds", { charge: chargeId });
  }
}
