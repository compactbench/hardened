import type { SourceFile } from "ts-morph"

const IGNORE_NEXT_LINE_RE = /\/\/\s*hardened-ignore-next-line\b/
const IGNORE_FILE_RE = /\/\/\s*hardened-ignore-file\b/

export function isIgnoredLine(file: SourceFile, line: number): boolean {
  const text = file.getFullText()
  if (IGNORE_FILE_RE.test(text)) return true

  const lines = text.split("\n")
  return getIgnoreNextStatementLines(lines).has(line)
}

function getIgnoreNextStatementLines(lines: string[]): Set<number> {
  const ignored = new Set<number>()

  for (let index = 0; index < lines.length; index++) {
    if (!IGNORE_NEXT_LINE_RE.test(lines[index] ?? "")) continue

    let inBlockComment = false
    for (let next = index + 1; next < lines.length; next++) {
      const commentOnly = isBlankOrCommentOnlyLine(
        lines[next] ?? "",
        inBlockComment,
      )
      inBlockComment = commentOnly.inBlockComment
      if (commentOnly.isBlankOrCommentOnly) continue

      // Lines are 1-indexed in ts-morph locations.
      ignored.add(next + 1)
      break
    }
  }

  return ignored
}

function isBlankOrCommentOnlyLine(
  line: string,
  inBlockComment: boolean,
): { isBlankOrCommentOnly: boolean; inBlockComment: boolean } {
  let text = line.trim()
  if (text === "") {
    return { isBlankOrCommentOnly: true, inBlockComment }
  }

  if (inBlockComment) {
    const end = text.indexOf("*/")
    if (end === -1) {
      return { isBlankOrCommentOnly: true, inBlockComment: true }
    }
    text = text.slice(end + 2).trim()
    if (text === "" || text.startsWith("//")) {
      return { isBlankOrCommentOnly: true, inBlockComment: false }
    }
  }

  while (text.startsWith("/*")) {
    const end = text.indexOf("*/", 2)
    if (end === -1) {
      return { isBlankOrCommentOnly: true, inBlockComment: true }
    }
    text = text.slice(end + 2).trim()
    if (text === "") {
      return { isBlankOrCommentOnly: true, inBlockComment: false }
    }
  }

  if (text.startsWith("//")) {
    return { isBlankOrCommentOnly: true, inBlockComment: false }
  }

  return { isBlankOrCommentOnly: false, inBlockComment: false }
}
