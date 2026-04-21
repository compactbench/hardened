import got from "got";

// got.extend({...}) instance without a timeout. Per-call usage should flag,
// mirroring the axios.create() instance-client pattern.

const client = got.extend({
  prefixUrl: "https://api.example.com/v1",
  headers: { "x-client": "hardened-fixture" },
});

export async function listTeams() {
  return client.get("teams");
}

export async function createTeam(body: { name: string; ownerId: string }) {
  return client.post("teams", { json: body });
}
