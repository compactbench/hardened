import http from "node:http";
import type { IncomingMessage } from "node:http";

export function callUpstreamWithTimeout(path: string, onResponse: (res: IncomingMessage) => void) {
  const req = http.request(
    {
      host: "upstream.example.com",
      port: 80,
      path,
      method: "GET",
      timeout: 10000,
    },
    onResponse,
  );

  req.on("timeout", () => {
    req.destroy(new Error("upstream timeout"));
  });

  req.on("error", (err) => {
    console.error("callUpstreamWithTimeout error", err);
  });

  req.end();
}
