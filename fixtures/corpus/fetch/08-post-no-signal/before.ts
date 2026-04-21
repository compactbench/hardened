export async function saveProfile(profile: Record<string, unknown>) {
  return fetch("/api/profile", {
    method: "POST",
    body: JSON.stringify(profile),
  });
}
