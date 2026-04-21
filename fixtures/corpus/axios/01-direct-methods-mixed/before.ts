import axios from "axios";

const API_BASE = "https://api.example.com/v1";

export async function listUsers() {
  return axios.get(`${API_BASE}/users`);
}

export async function createUser(payload: { email: string; name: string }) {
  return axios.post(`${API_BASE}/users`, payload);
}

export async function replaceUser(id: string, payload: { email: string; name: string }) {
  return axios.put(`${API_BASE}/users/${id}`, payload);
}

export async function deleteUser(id: string) {
  return axios.delete(`${API_BASE}/users/${id}`);
}
