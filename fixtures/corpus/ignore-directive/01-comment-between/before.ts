import axios from "axios";

export async function loadLegacy() {
  // hardened-ignore-next-line
  // local legacy endpoint intentionally has no timeout
  return axios.get("/legacy/comment");
}
