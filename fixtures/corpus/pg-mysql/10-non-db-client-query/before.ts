import { QueryClient } from "@tanstack/react-query";

const client = new QueryClient();

export async function loadCachedValue(key: string) {
  return client.query({ queryKey: [key], queryFn: async () => key });
}
