const API_BASE = "https://api.example.com/v1";

export async function getUser(id: string) {
  const response = await fetch(`${API_BASE}/users/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to load user ${id}: ${response.status}`);
  }
  return response.json() as Promise<{ id: string; email: string; name: string }>;
}
