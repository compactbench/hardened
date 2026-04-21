import axios from "axios";

// Periodic health check emitted on a timer. The caller does not read the
// response or attach an error handler, so any rejection becomes an
// unhandled promise rejection.
export function startHealthPinger(intervalMs: number): NodeJS.Timeout {
  return setInterval(() => {
    axios.get("https://api.example.com/api/health");
  }, intervalMs);
}

export function pingOnce(): void {
  axios.get("https://api.example.com/api/health");
}
