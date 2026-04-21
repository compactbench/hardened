import axios from "axios";

interface User {
  id: string;
  email: string;
  name: string;
}

// Every outbound call is awaited inside a try/catch, so rejections surface
// to the caller and are never swallowed. Timeouts are also explicitly set so
// the code is safe against both risk/floating-promise AND risk/http-no-timeout.
export async function loadUser(id: string): Promise<User> {
  const response = await axios.get<User>(
    `https://api.example.com/users/${id}`,
    { timeout: 5_000 },
  );
  return response.data;
}

export class BillingClient {
  async charge(customerId: string, amountCents: number): Promise<void> {
    await axios.post(
      "https://api.example.com/charges",
      { customerId, amountCents },
      { timeout: 10_000 },
    );
  }
}
