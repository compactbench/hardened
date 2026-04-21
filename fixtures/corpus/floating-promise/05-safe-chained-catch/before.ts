import axios from "axios";
import { logger } from "./logger";

function handleErr(err: unknown): void {
  logger.error({ err }, "telemetry delivery failed");
}

// Telemetry is intentionally fire-and-forget, but every call has an attached
// .catch handler so rejections are logged instead of floating. Timeouts are
// also set so the code is safe against both risk/floating-promise AND
// risk/http-no-timeout.
export function emitEvent(name: string, payload: Record<string, unknown>): void {
  axios
    .post(
      "https://telemetry.example.com/events",
      { name, payload },
      { timeout: 5_000 },
    )
    .catch(handleErr);
}

export class MetricsReporter {
  flush(batch: unknown[]): void {
    axios
      .post(
        "https://telemetry.example.com/batch",
        { batch },
        { timeout: 10_000 },
      )
      .catch((err) => logger.warn({ err }, "metrics flush failed"));
  }
}
