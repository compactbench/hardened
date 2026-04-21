const API_BASE = "https://api.example.com/v1";

export interface CreateUserPayload {
  email: string;
  name: string;
}

export async function createUser(payload: CreateUserPayload, token: string) {
  const response = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`createUser failed: ${response.status}`);
  }

  return response.json() as Promise<{ id: string } & CreateUserPayload>;
}
