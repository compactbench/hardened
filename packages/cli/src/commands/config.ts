import { Command } from "commander"

// v2 placeholder. When `@hardened/rules-config` ships, this file wires up
// `scan` / `fix` subcommands against those rules, mirroring `risk.ts`.
export const configStub = new Command("config")
  .description(
    "[coming in v2] Extract hardcoded URLs and magic numbers into a config layer.",
  )
  .action(() => {
    console.log("hardened config — coming in v2.")
    console.log("Track progress: see docs/vision.md")
    process.exit(0)
  })
