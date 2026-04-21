import axios from "axios";

export async function loadLegacy() {
  // hardened-ignore-next-line

  return axios.get("/legacy/blank");
}
