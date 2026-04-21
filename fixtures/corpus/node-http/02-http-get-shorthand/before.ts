import http from "node:http";
import type { IncomingMessage } from "node:http";

export function fetchHealthcheck(url: string, onResponse: (res: IncomingMessage) => void) {
  http.get(url, onResponse);
}
