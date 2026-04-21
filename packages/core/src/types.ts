import type { Node, Project, SourceFile } from "ts-morph"

export type Category = "risk" | "config" | "schema"
export type Severity = "error" | "warning" | "info"
export type SeverityOrOff = Severity | "off"

export interface Rule {
  id: string
  category: Category
  severity: Severity
  description: string
  match(ctx: MatchContext): Match[]
  fix?(match: Match, ctx: FixContext): Fix | null
}

export interface BackoffDefaults {
  timeout: number
  retries: number
  backoff: "exponential" | "linear" | "constant"
}

export interface ResolvedConfig {
  rules: Record<string, SeverityOrOff>
  ignore: string[]
  runtime: {
    defaults: BackoffDefaults
  }
}

export type UserConfig = Partial<{
  rules: Record<string, SeverityOrOff>
  ignore: string[]
  runtime: Partial<{
    defaults: Partial<BackoffDefaults>
  }>
}>

export interface MatchContext {
  file: SourceFile
  project: Project
  config: ResolvedConfig
}

export interface FixContext {
  config: ResolvedConfig
}

export interface Match {
  ruleId: string
  file: string
  line: number
  column: number
  severity: Severity
  message: string
  node: Node
  meta?: Record<string, unknown>
}

export interface ImportSpec {
  from: string
  names: string[]
}

export interface DependencySpec {
  name: string
  version: string
  type?: "runtime" | "dev"
}

export interface Edit {
  file: string
  range: [start: number, end: number]
  replacement: string
}

export interface Fix {
  edits: Edit[]
  addImports?: ImportSpec[]
  addDependencies?: DependencySpec[]
}

export interface FixResult {
  filesChanged: string[]
  fixesApplied: number
  skipped: Match[]
  addedDependencies: Array<{ name: string; version: string }>
}
