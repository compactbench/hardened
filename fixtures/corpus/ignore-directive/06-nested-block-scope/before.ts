import axios from "axios";

export async function loadLegacy(enabled: boolean) {
  if (enabled) {
    // hardened-ignore-next-line
    // nested block comment line
    await axios.get("/legacy/nested-ignored");
  }

  await axios.get("/legacy/nested-flagged");
}
