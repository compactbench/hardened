import axios from "axios";

const DEFAULT_TIMEOUT_MS = 5000;

export async function fetchPricingCatalog(region: string) {
  return axios.get(`https://pricing.example.com/catalog/${region}`, {
    timeout: DEFAULT_TIMEOUT_MS,
  });
}

export async function submitAuditLog(entry: { actor: string; action: string }) {
  return axios.post("https://audit.internal/logs", entry, {
    timeout: 3000,
    headers: { "x-audit-source": "hardened-suite" },
  });
}
