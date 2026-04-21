import axios from "axios";

interface UserResponse {
  data?: {
    user?: {
      id: string;
      name: string;
      email: string;
    };
  };
}

const API_BASE = "https://api.example.com/v1";

export async function getUserName(userId: string): Promise<string | undefined> {
  const url = `${API_BASE}/users/${userId}`;
  const name = (await axios.get<UserResponse>(url)).data?.user?.name;
  return name;
}
