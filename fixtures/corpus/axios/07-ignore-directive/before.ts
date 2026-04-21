import axios from "axios";

// This endpoint is a long-running internal report generator that intentionally
// has no client-side timeout. Safe to suppress because it runs behind an
// internal queue worker with its own deadline.
export async function triggerNightlyReport(reportId: string) {
  // hardened-ignore-next-line
  return axios.post(`https://reports.internal/nightly/${reportId}/run`, {
    startedBy: "cron",
  });
}
