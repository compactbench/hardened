import axios from "axios";

export async function sendAuditEvent(event: { timeout: number; name: string }) {
  return axios.post("/audit/events", {
    timeout: event.timeout,
    name: event.name,
  });
}
