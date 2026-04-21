import ky from "ky";

const API_BASE = "https://api.example.com/v1";

export async function fetchDashboardWidgets(userId: string) {
  return ky
    .get(`${API_BASE}/users/${userId}/widgets`, {
      timeout: 5000,
    })
    .json<Array<{ id: string; kind: string }>>();
}

export async function saveDashboardLayout(userId: string, layout: unknown) {
  return ky.put(`${API_BASE}/users/${userId}/layout`, {
    json: layout,
    timeout: 2000,
  });
}
