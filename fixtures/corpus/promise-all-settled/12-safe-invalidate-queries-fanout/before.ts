// Safe: React Query cache invalidation fan-out. Promise.all is correct here
// because an invalidation failure should propagate, not be silently hidden
// by Promise.allSettled. hardened should NOT flag this.

declare const queryClient: {
  invalidateQueries(opts: { queryKey: readonly unknown[] }): Promise<void>
}

export async function afterMutation() {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["users"] }),
    queryClient.invalidateQueries({ queryKey: ["projects", 42] }),
    queryClient.invalidateQueries({ queryKey: ["stats"] }),
  ])
}
