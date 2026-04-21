export function loadProfile(signal: AbortSignal) {
  return fetch("/api/profile", { signal });
}
