// Safe: React Query conditional invalidation. Common idiom where the
// last element is `cond ? invalidateQueries(...) : Promise.resolve()`.
// The rule should unwrap the ternary and recognize both branches as
// safe fan-out elements. No finding expected.

declare const queryClient: {
  invalidateQueries(opts: { queryKey: readonly unknown[] }): Promise<void>
}
declare const quoteRequestId: string | undefined

export async function afterMutation() {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["loads"] }),
    queryClient.invalidateQueries({ queryKey: ["bids"] }),
    quoteRequestId
      ? queryClient.invalidateQueries({ queryKey: ["quote", quoteRequestId] })
      : Promise.resolve(),
  ])
}
