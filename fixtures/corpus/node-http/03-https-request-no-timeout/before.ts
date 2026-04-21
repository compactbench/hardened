import https from "node:https";
import type { IncomingMessage } from "node:https";

export function postAuditEvent(payload: string, onResponse: (res: IncomingMessage) => void) {
  const req = https.request(
    {
      host: "audit.example.com",
      port: 443,
      path: "/v1/events",
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(payload),
      },
    },
    onResponse,
  );

  req.on("error", (err) => {
    console.error("postAuditEvent error", err);
  });

  req.write(payload);
  req.end();
}
