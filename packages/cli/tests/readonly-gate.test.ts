import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { assertWriteAllowed, isReadonlyCorpusEnabled } from "@hardened/core"

// HARDENED_CORPUS_READONLY is the operator-controlled write gate. These tests
// lock the two behaviors that matter: (1) the env var's accepted literal
// values ("1" and "true") and (2) the thrown error names the command and
// tells the user how to unset it.
describe("HARDENED_CORPUS_READONLY gate", () => {
  const ORIGINAL = process.env.HARDENED_CORPUS_READONLY

  beforeEach(() => {
    delete process.env.HARDENED_CORPUS_READONLY
  })

  afterEach(() => {
    if (ORIGINAL === undefined) {
      delete process.env.HARDENED_CORPUS_READONLY
    } else {
      process.env.HARDENED_CORPUS_READONLY = ORIGINAL
    }
  })

  it("is disabled when the env var is unset", () => {
    expect(isReadonlyCorpusEnabled()).toBe(false)
    expect(() => assertWriteAllowed("risk fix")).not.toThrow()
  })

  it("is enabled when the env var is '1'", () => {
    process.env.HARDENED_CORPUS_READONLY = "1"
    expect(isReadonlyCorpusEnabled()).toBe(true)
    expect(() => assertWriteAllowed("risk fix")).toThrow(/HARDENED_CORPUS_READONLY/)
  })

  it("is enabled when the env var is 'true'", () => {
    process.env.HARDENED_CORPUS_READONLY = "true"
    expect(isReadonlyCorpusEnabled()).toBe(true)
    expect(() => assertWriteAllowed("init")).toThrow(/HARDENED_CORPUS_READONLY/)
  })

  it("is NOT enabled on loose truthy values — avoids accidental opt-in via typo", () => {
    for (const v of ["yes", "True", "TRUE", "on", "YES", " 1", "1 ", "0"]) {
      process.env.HARDENED_CORPUS_READONLY = v
      expect(isReadonlyCorpusEnabled()).toBe(false)
    }
  })

  it("error message names the command the user tried to run", () => {
    process.env.HARDENED_CORPUS_READONLY = "1"
    expect(() => assertWriteAllowed("risk fix --pr")).toThrow(
      /Refusing to run 'risk fix --pr'/,
    )
    expect(() => assertWriteAllowed("init")).toThrow(/Refusing to run 'init'/)
  })

  it("error message tells the user how to proceed", () => {
    process.env.HARDENED_CORPUS_READONLY = "1"
    try {
      assertWriteAllowed("risk fix")
      expect.fail("expected throw")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      expect(message).toContain("unset HARDENED_CORPUS_READONLY")
      expect(message).toContain("hardened risk scan")
    }
  })
})
