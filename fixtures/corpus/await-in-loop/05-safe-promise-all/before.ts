// Correct parallel shape: map to promises, then await Promise.all.
// There is no await inside a loop body here - .map is a pure transform
// that returns Promise<User>[], and the single await is on the outer
// Promise.all. This is the target pattern the await-in-loop rule wants
// users to reach.
interface User {
  id: string;
  name: string;
}

async function fetchUser(id: string): Promise<User> {
  const res = await fetch(`https://api.example.com/users/${id}`);
  return res.json() as Promise<User>;
}

export async function loadUsers(ids: string[]): Promise<User[]> {
  const results = await Promise.all(ids.map((id) => fetchUser(id)));
  return results;
}
