import { validateRuleModules, type Rule } from "@hardened/core"
import { httpNoTimeout } from "./http-no-timeout.js"
import { fetchNoAbortSignal } from "./fetch-no-abort-signal.js"
import { floatingPromise } from "./floating-promise.js"
import { awaitInLoop } from "./await-in-loop.js"
import { promiseAllNoSettled } from "./promise-all-no-settled.js"
import { dbNoQueryTimeout } from "./db-no-query-timeout.js"
import { prismaNoTimeout } from "./prisma-no-timeout.js"

export const riskRules: Rule[] = validateRuleModules([
  { file: "packages/rules-risk/src/http-no-timeout.ts", rule: httpNoTimeout },
  {
    file: "packages/rules-risk/src/fetch-no-abort-signal.ts",
    rule: fetchNoAbortSignal,
  },
  {
    file: "packages/rules-risk/src/floating-promise.ts",
    rule: floatingPromise,
  },
  { file: "packages/rules-risk/src/await-in-loop.ts", rule: awaitInLoop },
  {
    file: "packages/rules-risk/src/promise-all-no-settled.ts",
    rule: promiseAllNoSettled,
  },
  {
    file: "packages/rules-risk/src/db-no-query-timeout.ts",
    rule: dbNoQueryTimeout,
  },
  {
    file: "packages/rules-risk/src/prisma-no-timeout.ts",
    rule: prismaNoTimeout,
  },
])

export {
  httpNoTimeout,
  fetchNoAbortSignal,
  floatingPromise,
  awaitInLoop,
  promiseAllNoSettled,
  dbNoQueryTimeout,
  prismaNoTimeout,
}
