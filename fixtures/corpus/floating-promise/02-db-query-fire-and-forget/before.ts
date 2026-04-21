import { db } from "./db";
import { logger } from "./logger";

// Nightly log pruning triggered from a cron handler. The query returns a
// promise but nothing awaits it, so a deadlock or connection error will
// silently disappear.
export function pruneOldLogs(): void {
  logger.info("pruning logs older than 30 days");
  db.query("DELETE FROM logs WHERE created_at < NOW() - INTERVAL '30 days'");
}

export class AuditWriter {
  record(event: string, userId: string): void {
    db.query("INSERT INTO audit (event, user_id) VALUES ($1, $2)", [event, userId]);
  }
}
