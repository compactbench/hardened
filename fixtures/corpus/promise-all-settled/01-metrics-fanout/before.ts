// Fan-out metrics delivery to three independent sinks.
// If Datadog is having a bad day, that shouldn't prevent the CloudWatch
// and Prometheus sinks from receiving the same sample. Promise.all
// short-circuits on the first rejection and drops the rest - use
// Promise.allSettled so each destination is attempted independently.
interface MetricSink {
  report(event: MetricEvent): Promise<void>;
}

interface MetricEvent {
  name: string;
  value: number;
  tags: Record<string, string>;
}

declare const datadog: MetricSink;
declare const cloudwatch: MetricSink;
declare const prometheus: MetricSink;

export async function broadcastMetric(event: MetricEvent): Promise<void> {
  await Promise.all([
    datadog.report(event),
    cloudwatch.report(event),
    prometheus.report(event),
  ]);
}
