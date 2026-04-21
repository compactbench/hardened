import { Command } from "commander"

// v3 placeholder. When `@hardened/rules-schema` ships, this file wires up
// `check` / `fix` / `rename` subcommands against those rules.
export const schemaStub = new Command("schema")
  .description(
    "[coming in v3] Enforce consistent naming across DB, backend, and frontend.",
  )
  .action(() => {
    console.log("hardened schema — coming in v3.")
    console.log("Track progress: see docs/vision.md")
    process.exit(0)
  })
