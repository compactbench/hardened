// Classic N+1 antipattern: one HTTP call per id, serialized.
// These fetches are independent and could run in parallel.
interface User {
  id: string;
  name: string;
}

async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`https://api.example.com/users/${id}`);
  return res.json() as Promise<User>;
}

export async function loadUsers(ids: string[]): Promise<User[]> {
  const users: User[] = [];
  for (const id of ids) {
    const user = await fetchUser(id);
    users.push(user);
  }
  return users;
}
