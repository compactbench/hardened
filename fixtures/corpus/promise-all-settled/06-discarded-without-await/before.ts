declare const sinks: Array<{ flush(): Promise<void> }>;

export function flushSinks() {
  Promise.all(sinks.map((sink) => sink.flush()));
}
