// CI performance gate. Fails if the 1k-file scan exceeds THRESHOLD_MULTIPLIER
// times the tracked baseline in benchmarks/perf/results.md.

import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { spawnSync } from "node:child_process"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { performance } from "node:perf_hooks"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "..", "..")
const cliBin = resolve(repoRoot, "packages", "cli", "dist", "bin.js")
const resultsPath = resolve(here, "results.md")

const FILE_COUNT = 1000
const THRESHOLD_MULTIPLIER = 2.0
const WRITE_BATCH = 256
const SPAWN_MAX_BUFFER = 64 * 1024 * 1024

const TEMPLATES = [
  (i) => `import axios from "axios"
export const safeFetch${i} = (id: string) =>
  axios.get(\`/api/v1/items/\${id}\`, { timeout: 5_000 })
`,
  (i) => `import axios from "axios"
export const unsafeFetch${i} = (id: string) =>
  axios.get(\`/api/v1/items/\${id}\`)
`,
  (i) => `export const loadUser${i} = (userId: string) =>
  fetch(\`/api/users/\${userId}\`)
`,
  (i) => `import axios from "axios"
export async function syncRecord${i}(id: string, payload: Record<string, unknown>) {
  const prior = await axios.get(\`/api/records/\${id}\`)
  return axios.post("/api/records", { ...payload, priorEtag: prior.data.etag })
}
`,
]

async function main() {
  const baseline = await readBaselineMs()
  const threshold = Math.round(baseline * THRESHOLD_MULTIPLIER)
  const elapsed = await runBenchmark(FILE_COUNT)

  console.log(
    `1k benchmark: ${elapsed} ms (baseline ${baseline} ms, gate ${threshold} ms)`,
  )

  if (elapsed > threshold) {
    console.error(
      `Performance gate failed: ${elapsed} ms exceeds ${THRESHOLD_MULTIPLIER}x baseline (${threshold} ms).`,
    )
    process.exit(1)
  }
}

async function readBaselineMs() {
  const text = await readFile(resultsPath, "utf8")
  const row = text
    .split(/\r?\n/)
    .find((line) => /^\|\s*1,000\s*\|/.test(line))
  if (!row) {
    throw new Error(`Could not find 1,000-file baseline in ${resultsPath}`)
  }

  const cells = row.split("|").map((cell) => cell.trim())
  const elapsedCell = cells[2] ?? ""
  const match = elapsedCell.match(/^([\d,]+)\s+ms$/)
  if (!match) {
    throw new Error(`Could not parse 1,000-file baseline from row: ${row}`)
  }

  return Number(match[1].replace(/,/g, ""))
}

async function runBenchmark(fileCount) {
  const tmp = await mkdtemp(join(tmpdir(), `hardened-bench-gate-${fileCount}-`))
  try {
    await mkdir(join(tmp, "src"), { recursive: true })

    for (let start = 0; start < fileCount; start += WRITE_BATCH) {
      const end = Math.min(start + WRITE_BATCH, fileCount)
      await Promise.all(
        Array.from({ length: end - start }, (_, k) => {
          const i = start + k
          return writeFile(join(tmp, "src", `file${i}.ts`), TEMPLATES[i % 4](i))
        }),
      )
    }

    const spawnOpts = {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: SPAWN_MAX_BUFFER,
    }

    const warmup = spawnSync(
      "node",
      [cliBin, "risk", "scan", "--cwd", tmp, "--json"],
      spawnOpts,
    )
    assertScanExit("warmup", warmup)

    const startedAt = performance.now()
    const result = spawnSync(
      "node",
      [cliBin, "risk", "scan", "--cwd", tmp, "--json"],
      spawnOpts,
    )
    assertScanExit("measured run", result)
    return Math.round(performance.now() - startedAt)
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
}

function assertScanExit(label, result) {
  if (result.status !== null && result.status !== 0 && result.status !== 1) {
    throw new Error(`${label} failed with exit ${result.status}\n${result.stderr}`)
  }
}

await main()
