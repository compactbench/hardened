declare const sinks: Array<{ flush(): Promise<void> }>;

export async function flushSinks() {
  await Promise.allSettled(sinks.map((sink) => sink.flush()));
}
