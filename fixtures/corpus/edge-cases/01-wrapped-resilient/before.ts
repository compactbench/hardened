import axios from "axios";

declare function resilient<T>(
  fn: () => Promise<T>,
  opts?: { timeout?: number; retries?: number }
): Promise<T>;

const API_BASE = "https://api.example.com/v1";

export async function fetchUserProfile(userId: string) {
  const url = `${API_BASE}/users/${userId}`;
  return await resilient(() => axios.get(url), { timeout: 10000 });
}

export async function fetchOrg(orgId: string) {
  return await resilient(
    () => axios.get(`${API_BASE}/orgs/${orgId}`),
    { timeout: 5000, retries: 3 }
  );
}
