// Safe: React Query refetch fan-out. Same semantics as invalidateQueries —
// if a refetch fails, the caller wants the error to propagate. Rule should
// recognize refetchQueries as a known-safe fan-out callee alongside
// invalidateQueries. No finding expected.

declare const queryClient: {
  refetchQueries(opts: { queryKey: readonly unknown[] }): Promise<void>
  prefetchQuery(opts: { queryKey: readonly unknown[] }): Promise<void>
}

export async function refreshData() {
  await Promise.all([
    queryClient.refetchQueries({ queryKey: ["dashboard"] }),
    queryClient.prefetchQuery({ queryKey: ["alerts"] }),
    queryClient.refetchQueries({ queryKey: ["metrics"] }),
  ])
}
