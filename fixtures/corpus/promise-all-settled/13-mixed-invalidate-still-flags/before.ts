// Mixed fan-out: invalidateQueries alongside an unrelated async call.
// Should flag because the non-safe element makes this a general fan-out.

declare const queryClient: {
  invalidateQueries(opts: { queryKey: readonly unknown[] }): Promise<void>
}
declare function sendNotification(channel: string): Promise<void>

export async function afterMutation() {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["users"] }),
    sendNotification("admin"),
  ])
}
