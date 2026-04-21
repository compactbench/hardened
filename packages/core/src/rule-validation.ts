import type { Rule } from "./types.js"

const VALID_CATEGORIES = new Set(["risk", "config", "schema"])
const VALID_SEVERITIES = new Set(["error", "warning", "info"])

export interface RuleModuleDescriptor {
  file: string
  rule: unknown
}

export function validateRuleModules(
  modules: RuleModuleDescriptor[],
): Rule[] {
  return modules.map(({ file, rule }) => validateRuleModule(rule, file))
}

export function validateRuleModule(rule: unknown, file: string): Rule {
  const problems: string[] = []

  if (!isRecord(rule)) {
    throw new Error(
      `hardened: invalid rule module ${file}: default export must be a rule object`,
    )
  }

  if (!isNonEmptyString(rule.id)) {
    problems.push("id must be a non-empty string")
  }
  if (!isNonEmptyString(rule.category) || !VALID_CATEGORIES.has(rule.category)) {
    problems.push("category must be one of risk, config, schema")
  }
  if (!isNonEmptyString(rule.severity) || !VALID_SEVERITIES.has(rule.severity)) {
    problems.push("severity must be one of error, warning, info")
  }
  if (!isNonEmptyString(rule.description)) {
    problems.push("description must be a non-empty string")
  }
  if (typeof rule.match !== "function") {
    problems.push("match must be a function")
  }
  if ("fix" in rule && rule.fix !== undefined && typeof rule.fix !== "function") {
    problems.push("fix must be a function when provided")
  }

  if (problems.length > 0) {
    const ruleName = isNonEmptyString(rule.id) ? ` (${rule.id})` : ""
    throw new Error(
      `hardened: invalid rule module ${file}${ruleName}: ${problems.join("; ")}`,
    )
  }

  return rule as unknown as Rule
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}
