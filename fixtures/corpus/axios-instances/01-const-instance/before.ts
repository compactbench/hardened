import axios, { AxiosInstance } from "axios";

const api: AxiosInstance = axios.create({
  baseURL: "https://api.example.com/v1",
  headers: { "x-client": "hardened-fixture" },
});

export async function listProjects() {
  return api.get("/projects");
}

export async function archiveProject(projectId: string) {
  return api.post(`/projects/${projectId}/archive`, { archivedBy: "admin" });
}
