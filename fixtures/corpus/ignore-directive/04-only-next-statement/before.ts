import axios from "axios";

export async function loadLegacy() {
  // hardened-ignore-next-line
  // first call intentionally unbounded
  await axios.get("/legacy/ignored");
  await axios.get("/legacy/flagged");
}
