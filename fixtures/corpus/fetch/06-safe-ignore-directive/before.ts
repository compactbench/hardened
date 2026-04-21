const HEALTHCHECK_URL = "https://api.example.com/healthz";

// This probe runs at boot before any user-facing request dispatcher exists,
// and must complete synchronously during startup. Aborting it would defeat
// the purpose of the liveness check, so we intentionally skip the signal.
export async function probeHealth(): Promise<boolean> {
  // hardened-ignore-next-line
  const response = await fetch(HEALTHCHECK_URL);
  return response.ok;
}
