import axios, { AxiosInstance } from "axios";

interface Repo {
  fullName: string;
  stars: number;
}

export class GithubService {
  private readonly api: AxiosInstance = axios.create({
    baseURL: "https://api.github.com",
    headers: { accept: "application/vnd.github+json" },
  });

  async fetchRepo(owner: string, repo: string): Promise<Repo> {
    const res = await this.api.get(`/repos/${owner}/${repo}`);
    return {
      fullName: res.data.full_name,
      stars: res.data.stargazers_count,
    };
  }

  async starRepo(owner: string, repo: string) {
    return this.api.put(`/user/starred/${owner}/${repo}`, {});
  }
}
