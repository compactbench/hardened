export async function maybeLoad(enabled: boolean) {
  if (enabled) {
    return fetch("/api/enabled");
  }
  return null;
}
