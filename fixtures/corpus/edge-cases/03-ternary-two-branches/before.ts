import axios from "axios";

const PRIMARY = "https://api-primary.example.com/v1/health";
const FALLBACK = "https://api-fallback.example.com/v1/health";

export async function pingHealth(flag: boolean) {
  const urlA = PRIMARY;
  const urlB = FALLBACK;
  const res = flag ? axios.get(urlA) : axios.get(urlB);
  return res;
}
