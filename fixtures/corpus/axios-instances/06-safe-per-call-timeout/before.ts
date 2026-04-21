import axios, { AxiosInstance } from "axios";

const DEFAULT_TIMEOUT_MS = 5000;

const api: AxiosInstance = axios.create({
  baseURL: "https://api.example.com/v1",
  headers: { "x-client": "hardened-fixture" },
});

export async function fetchUserProfile(userId: string) {
  return api.get(`/users/${userId}`, {
    timeout: DEFAULT_TIMEOUT_MS,
  });
}

export async function updateUserEmail(userId: string, email: string) {
  return api.patch(`/users/${userId}`, { email }, {
    timeout: 3000,
    headers: { "if-match": "*" },
  });
}
