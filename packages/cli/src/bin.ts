#!/usr/bin/env node
import { Command } from "commander"
import { riskCommand } from "./commands/risk.js"
import { configStub } from "./commands/config.js"
import { schemaStub } from "./commands/schema.js"
import { initCommand } from "./commands/init.js"

const program = new Command("hardened")
  .description("Find and fix unbounded TypeScript I/O before it ships.")
  .version("0.1.0")

program.addCommand(initCommand)
program.addCommand(riskCommand)
program.addCommand(configStub)
program.addCommand(schemaStub)

program.parseAsync().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
