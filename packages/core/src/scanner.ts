import { Project } from "ts-morph"
import micromatch from "micromatch"
import type { Match, ResolvedConfig, Rule } from "./types.js"
import { isIgnoredLine } from "./ignore.js"

export interface ScannerOpts {
  rules: Rule[]
  config: ResolvedConfig
  cwd?: string
  tsConfigPath?: string
}

export class Scanner {
  private readonly project: Project

  constructor(private readonly opts: ScannerOpts) {
    const cwd = opts.cwd ?? process.cwd()
    if (opts.tsConfigPath) {
      this.project = new Project({ tsConfigFilePath: opts.tsConfigPath })
    } else {
      this.project = new Project({
        compilerOptions: { allowJs: true, target: 99 },
      })
      this.project.addSourceFilesAtPaths([
        `${cwd}/**/*.{ts,tsx,js,jsx,mjs,cjs}`,
        `!${cwd}/**/node_modules/**`,
        `!${cwd}/**/dist/**`,
        `!${cwd}/**/build/**`,
      ])
    }
  }

  async run(): Promise<Match[]> {
    const matches: Match[] = []
    const rules = this.opts.rules.filter(
      (r) => this.opts.config.rules[r.id] !== "off",
    )

    for (const file of this.project.getSourceFiles()) {
      const path = file.getFilePath()
      if (this.isIgnored(path)) continue

      for (const rule of rules) {
        const fileMatches = rule.match({
          file,
          project: this.project,
          config: this.opts.config,
        })
        for (const match of fileMatches) {
          if (isIgnoredLine(file, match.line)) continue
          const override = this.opts.config.rules[match.ruleId]
          if (override && override !== "off") {
            matches.push({ ...match, severity: override })
          } else {
            matches.push(match)
          }
        }
      }
    }

    return matches
  }

  private isIgnored(path: string): boolean {
    if (this.opts.config.ignore.length === 0) return false
    return micromatch.isMatch(path, this.opts.config.ignore, { dot: true })
  }
}
