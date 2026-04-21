import { Command } from "commander"
import { Fixer, Scanner, assertWriteAllowed, loadConfig } from "@hardened/core"
import { riskRules } from "@hardened/rules-risk"
import { reportTerminal } from "../reporters/terminal.js"
import { reportJson } from "../reporters/json.js"
import { reportSarif } from "../reporters/sarif.js"
import { generatePR } from "../pr/generate.js"

export const riskCommand = new Command("risk").description(
  "Find and fix production reliability risks (timeouts, retries, AbortSignal gaps).",
)

riskCommand
  .command("scan")
  .description("Report risky code patterns without changing anything.")
  .option("--json", "output findings as JSON")
  .option("--sarif [file]", "output findings as SARIF 2.1.0 (to file or stdout)")
  .option("--cwd <dir>", "working directory", process.cwd())
  .option("--tsconfig <path>", "path to tsconfig.json")
  .action(async (opts) => {
    const config = await loadConfig(opts.cwd)
    const scanner = new Scanner({
      rules: riskRules,
      config,
      cwd: opts.cwd,
      tsConfigPath: opts.tsconfig,
    })
    const findings = await scanner.run()
    if (opts.sarif !== undefined) {
      // `--sarif` with no arg writes to stdout; `--sarif path.sarif` writes to the file.
      const outputPath = typeof opts.sarif === "string" ? opts.sarif : undefined
      const text = reportSarif({
        findings,
        cwd: opts.cwd,
        outputPath,
      })
      if (!outputPath) {
        process.stdout.write(text)
      } else {
        const count = findings.length
        process.stderr.write(
          `✓ Wrote SARIF to ${outputPath} (${count} finding${count === 1 ? "" : "s"})\n`,
        )
      }
    } else if (opts.json) {
      reportJson(findings)
    } else {
      reportTerminal(findings)
    }
    const hasError = findings.some((f) => f.severity === "error")
    process.exit(hasError ? 1 : 0)
  })

riskCommand
  .command("fix")
  .description("Apply auto-fixes for risky patterns.")
  .option("--pr", "apply fixes on a new branch and open a draft GitHub PR")
  .option("--dry-run", "show what would be fixed without writing")
  .option("--cwd <dir>", "working directory", process.cwd())
  .option("--tsconfig <path>", "path to tsconfig.json")
  .action(async (opts) => {
    assertWriteAllowed(opts.pr ? "risk fix --pr" : "risk fix")
    const config = await loadConfig(opts.cwd)
    const scanner = new Scanner({
      rules: riskRules,
      config,
      cwd: opts.cwd,
      tsConfigPath: opts.tsconfig,
    })
    const findings = await scanner.run()

    if (opts.pr) {
      try {
        await generatePR({
          cwd: opts.cwd,
          findings,
          rules: riskRules,
          config,
        })
      } catch (err) {
        console.error(
          `\n✗ PR generation failed:\n  ${err instanceof Error ? err.message : String(err)}`,
        )
        process.exit(1)
      }
      return
    }

    const fixer = new Fixer({
      findings,
      rules: riskRules,
      config,
      dryRun: !!opts.dryRun,
    })
    const result = await fixer.apply()

    console.log(
      `Applied ${result.fixesApplied} fix${result.fixesApplied === 1 ? "" : "es"} ` +
        `across ${result.filesChanged.length} file${result.filesChanged.length === 1 ? "" : "s"}. ` +
        `${result.skipped.length} finding${result.skipped.length === 1 ? "" : "s"} had no auto-fix.`,
    )

    if (result.addedDependencies.length > 0) {
      console.log("\nAdd these dependencies to your project:")
      for (const dep of result.addedDependencies) {
        console.log(`  npm install ${dep.name}@${dep.version}`)
      }
    }
  })
