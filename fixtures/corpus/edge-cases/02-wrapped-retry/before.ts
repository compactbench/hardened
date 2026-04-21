import axios from "axios";

declare function retry<T>(
  fn: () => Promise<T>,
  opts?: { attempts?: number; backoffMs?: number }
): Promise<T>;

interface SignupPayload {
  email: string;
  name: string;
}

const API_BASE = "https://api.example.com/v1";

export async function signup(body: SignupPayload) {
  const url = `${API_BASE}/signup`;
  return await retry(() => axios.post(url, body));
}

export async function resetPassword(email: string) {
  return await retry(
    () => axios.post(`${API_BASE}/auth/reset`, { email }),
    { attempts: 4, backoffMs: 250 }
  );
}
