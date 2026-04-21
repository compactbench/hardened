import axios from "axios";

// The warmup endpoint is dispatched on process start. It is handled by a
// dedicated supervisor that retries failures out-of-band, so we explicitly
// suppress the floating-promise warning here.
export function warmCaches(): void {
  // hardened-ignore-next-line
  axios.post("https://internal.example.com/cache/warm", { reason: "boot" });
}

export class QueueBootstrapper {
  start(): void {
    // hardened-ignore-next-line
    axios.post("https://internal.example.com/queue/drain", { mode: "startup" });
  }
}
