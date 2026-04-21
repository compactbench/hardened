import { writeFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { relative, sep } from "node:path"
import type { Match } from "@hardened/core"

// Minimal SARIF 2.1.0 shape — enough for GitHub code-scanning ingestion.
// Full spec: https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
interface SarifLog {
  $schema: string
  version: "2.1.0"
  runs: SarifRun[]
}

interface SarifRun {
  tool: {
    driver: {
      name: string
      version: string
      informationUri: string
      rules: SarifRuleDescriptor[]
    }
  }
  results: SarifResult[]
}

interface SarifRuleDescriptor {
  id: string
  name: string
  shortDescription: { text: string }
  fullDescription?: { text: string }
  defaultConfiguration: { level: "error" | "warning" | "note" }
  helpUri?: string
}

interface SarifResult {
  ruleId: string
  level: "error" | "warning" | "note"
  message: { text: string }
  partialFingerprints: {
    primaryLocationLineHash: string
  }
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string }
      region: { startLine: number; startColumn: number }
    }
  }>
}

const TOOL_VERSION = "0.1.0"
const TOOL_URI = "https://github.com/compactbench/hardened"

export interface SarifReporterOptions {
  /** Matches to include in the report. */
  findings: Match[]
  /** Path to write the SARIF file. If omitted, returns the string form. */
  outputPath?: string
  /** Base directory — paths in the report become relative to this. */
  cwd: string
}

// Severity → SARIF level mapping. 'info' maps to 'note', which is the
// correct SARIF term for non-warning informational findings.
function levelFor(severity: Match["severity"]): "error" | "warning" | "note" {
  switch (severity) {
    case "error":
      return "error"
    case "warning":
      return "warning"
    case "info":
      return "note"
  }
}

export function buildSarif(opts: SarifReporterOptions): SarifLog {
  const ruleMap = new Map<string, SarifRuleDescriptor>()
  // Per (rule, file) occurrence index for fingerprint disambiguation.
  const occurrencesSeen = new Map<string, number>()

  const results: SarifResult[] = []
  for (const m of opts.findings) {
    const level = levelFor(m.severity)

    if (!ruleMap.has(m.ruleId)) {
      const slug = m.ruleId.replace(/\//g, "-")
      ruleMap.set(m.ruleId, {
        id: m.ruleId,
        name: slug,
        shortDescription: { text: m.ruleId },
        defaultConfiguration: { level },
        helpUri: `${TOOL_URI}/blob/main/docs/errors/${slug}.md`,
      })
    }

    const relativePath = toPosixRelative(opts.cwd, m.file)
    const occurrenceKey = `${m.ruleId}::${relativePath}`
    const occurrenceIndex = occurrencesSeen.get(occurrenceKey) ?? 0
    occurrencesSeen.set(occurrenceKey, occurrenceIndex + 1)

    results.push({
      ruleId: m.ruleId,
      level,
      message: { text: m.message },
      partialFingerprints: {
        primaryLocationLineHash: buildStableFingerprint(
          opts.cwd,
          m,
          occurrenceIndex,
        ),
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: relativePath },
            region: {
              startLine: m.line,
              startColumn: m.column,
            },
          },
        },
      ],
    })
  }

  return {
    $schema:
      "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "hardened",
            version: TOOL_VERSION,
            informationUri: TOOL_URI,
            rules: [...ruleMap.values()],
          },
        },
        results,
      },
    ],
  }
}

export function reportSarif(opts: SarifReporterOptions): string {
  const log = buildSarif(opts)
  const text = JSON.stringify(log, null, 2) + "\n"
  if (opts.outputPath) {
    writeFileSync(opts.outputPath, text)
  }
  return text
}

// Convert an absolute file path into a POSIX-style path relative to cwd.
// SARIF artifactLocation.uri wants forward slashes even on Windows, so the
// file-based CodeQL uploader can match paths against the checked-in source.
function toPosixRelative(cwd: string, absPath: string): string {
  const rel = relative(cwd, absPath)
  return rel.split(sep).join("/")
}

function buildStableFingerprint(
  cwd: string,
  finding: Match,
  occurrenceIndex: number,
): string {
  const input = [
    finding.ruleId,
    toPosixRelative(cwd, finding.file),
    getLogicalContext(finding.node),
    getStableNodeText(finding.node) || finding.message,
    String(occurrenceIndex),
  ].join("\n")

  return createHash("sha256").update(input).digest("hex").slice(0, 32)
}

function getStableNodeText(node: unknown): string {
  try {
    const text = (node as { getText?: () => string }).getText?.()
    return text ? text.replace(/\s+/g, " ").trim() : ""
  } catch {
    return ""
  }
}

function getLogicalContext(node: unknown): string {
  let current = node as
    | {
        getParent?: () => unknown
        getKindName?: () => string
        getName?: () => string | undefined
      }
    | undefined

  while (current?.getParent) {
    const kind = current.getKindName?.() ?? ""
    const name = current.getName?.()
    if (
      name &&
      (kind === "FunctionDeclaration" ||
        kind === "MethodDeclaration" ||
        kind === "ClassDeclaration" ||
        kind === "FunctionExpression")
    ) {
      return `${kind}:${name}`
    }

    current = current.getParent() as typeof current
  }

  return ""
}
