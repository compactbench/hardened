export function warmCache(signal: AbortSignal) {
  fetch("/api/cache/warm", { signal });
}
