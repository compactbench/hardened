import http from "node:http";
import type { IncomingMessage } from "node:http";

export function pingInternalService(path: string, onResponse: (res: IncomingMessage) => void) {
  const req = http.request(
    {
      host: "internal.svc.local",
      port: 8080,
      path,
      method: "GET",
    },
    onResponse,
  );

  req.on("error", (err) => {
    console.error("pingInternalService error", err);
  });

  req.end();
}
