// Intentionally unsafe code.
// `hardened risk scan` should report findings for every call below.
// `hardened risk fix` should wrap each one with `resilient(...)` and safe defaults.

import axios from "axios"

export async function getOrder(orderId: string) {
  return axios.get(`/api/orders/${orderId}`)
}

export async function listProducts() {
  return axios.get("/api/products")
}

export async function createPayment(amount: number, userId: string) {
  return axios.post("/api/payments", { amount, userId })
}

export async function updateProfile(userId: string, patch: Record<string, unknown>) {
  return axios.put(`/api/users/${userId}`, patch)
}

export async function deleteSession(sessionId: string) {
  return axios.delete(`/api/sessions/${sessionId}`)
}

// Already-safe — `hardened` should NOT touch this one.
export async function safeGet(id: string) {
  return axios.get(`/api/widgets/${id}`, { timeout: 5000 })
}

// Explicitly opted out — `hardened` should NOT touch the axios call below.
export async function specialCase(id: string) {
  // hardened-ignore-next-line
  return axios.get(`/api/legacy/${id}`)
}

// Raw fetch without AbortSignal — should surface a warning.
export async function loadUserData(userId: string) {
  return fetch(`/api/users/${userId}/data`)
}
