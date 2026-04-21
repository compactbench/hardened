import axios, { AxiosInstance } from "axios";

// Client-level timeout only; per-call usage without override should flag.
const api: AxiosInstance = axios.create({
  baseURL: "https://api.inventory.example.com",
  timeout: 5000,
  headers: { "x-client": "hardened-fixture" },
});

export async function getStockLevel(sku: string) {
  return api.get(`/items/${sku}/stock`);
}

export async function reserveStock(sku: string, quantity: number) {
  return api.post(`/items/${sku}/reserve`, { quantity });
}
