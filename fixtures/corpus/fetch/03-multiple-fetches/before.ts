const API_BASE = "https://api.example.com/v1";

interface User {
  id: string;
  email: string;
  name: string;
}

interface Post {
  id: string;
  authorId: string;
  title: string;
  body: string;
}

export async function listUsers(): Promise<User[]> {
  const response = await fetch(`${API_BASE}/users`);
  return response.json();
}

export async function getPostsForUser(userId: string): Promise<Post[]> {
  const response = await fetch(`${API_BASE}/users/${userId}/posts`, {
    headers: { Accept: "application/json" },
  });
  return response.json();
}

export async function deletePost(postId: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/posts/${postId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`deletePost(${postId}) failed: ${response.status}`);
  }
}
