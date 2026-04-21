import ky from "ky";

const API_BASE = "https://api.example.com/v1";

export async function submitFeedback(body: { userId: string; rating: number; note?: string }) {
  return ky.post(`${API_BASE}/feedback`, { json: body }).json<{ id: string }>();
}

export async function deleteFeedback(feedbackId: string) {
  return ky.delete(`${API_BASE}/feedback/${feedbackId}`);
}
