import axios from "axios";

interface RepoSummary {
  fullName: string;
  stars: number;
  openIssues: number;
}

export class GithubRepoService {
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
  }

  async fetchRepo(owner: string, repo: string): Promise<RepoSummary> {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { authorization: `Bearer ${this.token}` },
    });
    return {
      fullName: response.data.full_name,
      stars: response.data.stargazers_count,
      openIssues: response.data.open_issues_count,
    };
  }
}
