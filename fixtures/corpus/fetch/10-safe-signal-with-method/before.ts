export async function saveProfile(profile: Record<string, unknown>) {
  const controller = new AbortController();
  return fetch("/api/profile", {
    method: "POST",
    body: JSON.stringify(profile),
    signal: controller.signal,
  });
}
