import axios, { AxiosInstance } from "axios";

declare function resilient<T>(
  fn: () => Promise<T>,
  opts?: { timeout?: number; retries?: number }
): Promise<T>;

const api: AxiosInstance = axios.create({
  baseURL: "https://api.example.com/v1",
  headers: { accept: "application/json" },
});

export async function fetchOrg(orgId: string) {
  return await resilient(() => api.get(`/orgs/${orgId}`), { timeout: 10000 });
}

export async function renameOrg(orgId: string, name: string) {
  return await resilient(
    () => api.patch(`/orgs/${orgId}`, { name }),
    { timeout: 5000, retries: 3 }
  );
}
