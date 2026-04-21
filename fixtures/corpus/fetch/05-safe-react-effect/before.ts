import { useEffect, useState } from "react";

interface Project {
  id: string;
  name: string;
  ownerId: string;
}

const API_BASE = "https://api.example.com/v1";

export function useProject(projectId: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(`${API_BASE}/projects/${projectId}`, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed to load project: ${response.status}`);
        }
        const data = (await response.json()) as Project;
        setProject(data);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }
        setError(err as Error);
      }
    }

    load();

    return () => {
      controller.abort();
    };
  }, [projectId]);

  return { project, error };
}
