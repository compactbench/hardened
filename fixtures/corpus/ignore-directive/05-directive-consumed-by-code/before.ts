import axios from "axios";

export async function loadLegacy() {
  // hardened-ignore-next-line
  const id = "not-a-finding";
  return axios.get(`/legacy/${id}`);
}
