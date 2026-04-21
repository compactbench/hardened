import { describe, expect, it } from "vitest"
import { validateRuleModule } from "@hardened/core"

describe("rule metadata validation", () => {
  it("throws with the rule file when required metadata is missing", () => {
    expect(() =>
      validateRuleModule(
        {
          id: "risk/missing-description",
          category: "risk",
          severity: "error",
          match: () => [],
        },
        "packages/rules-risk/src/missing-description.ts",
      ),
    ).toThrow(
      /packages\/rules-risk\/src\/missing-description\.ts.*description/,
    )
  })

  it("accepts a complete rule shape", () => {
    const rule = {
      id: "risk/example",
      category: "risk",
      severity: "warning",
      description: "Example rule.",
      match: () => [],
    }

    expect(validateRuleModule(rule, "example.ts")).toBe(rule)
  })
})
