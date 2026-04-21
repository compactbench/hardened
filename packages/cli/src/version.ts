import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const pkgPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../package.json",
)

export const CLI_VERSION = (
  JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string }
).version
