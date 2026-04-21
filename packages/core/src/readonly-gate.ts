// Operator-controlled write gate. When HARDENED_CORPUS_READONLY=1 (or =true),
// commands that write to disk refuse to run and exit 1.

/** True when HARDENED_CORPUS_READONLY is "1" or "true". */
export function isReadonlyCorpusEnabled(): boolean {
  const v = process.env.HARDENED_CORPUS_READONLY
  return v === "1" || v === "true"
}

/** Throw if HARDENED_CORPUS_READONLY is set. Call at the top of any write command. */
export function assertWriteAllowed(commandLabel: string): void {
  if (!isReadonlyCorpusEnabled()) return
  throw new Error(
    `Refusing to run '${commandLabel}': HARDENED_CORPUS_READONLY is set.\n` +
      `  unset HARDENED_CORPUS_READONLY to allow the command, or use 'hardened risk scan' (read-only).`,
  )
}
