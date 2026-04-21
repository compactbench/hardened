import axios from "axios";

// Method calls on instances created via axios.create({...}) should flag
// per-call when no timeout is passed, even if the instance was configured
// with a client-level default.

const api = axios.create({
  baseURL: "https://api.example.com/v1",
  headers: { "x-client": "hardened-fixture" },
});

export async function listProjects() {
  return api.get("/projects");
}

export async function archiveProject(projectId: string) {
  return api.post(`/projects/${projectId}/archive`, { archivedBy: "admin" });
}
