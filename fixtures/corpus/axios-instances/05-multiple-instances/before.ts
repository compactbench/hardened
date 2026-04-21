import axios, { AxiosInstance } from "axios";

// Safe client: every call passes a per-request timeout.
const safeApi: AxiosInstance = axios.create({
  baseURL: "https://api.search.example.com",
});

// Unsafe client: no per-call timeout anywhere.
const unsafeApi: AxiosInstance = axios.create({
  baseURL: "https://api.analytics.example.com",
});

export async function runSearch(term: string) {
  return safeApi.get(`/search?q=${encodeURIComponent(term)}`, {
    timeout: 4000,
  });
}

export async function recordPageView(userId: string, path: string) {
  return unsafeApi.post("/events/pageview", {
    userId,
    path,
    occurredAt: new Date().toISOString(),
  });
}
