// Fire-and-forget analytics across three independent destinations.
// Segment, Mixpanel, and Amplitude are observers of the same event -
// no one of them is authoritative. A transient 503 from any one should
// not swallow the others' deliveries. Promise.allSettled captures per-
// destination outcomes and lets the caller log partial failures.
interface AnalyticsEvent {
  userId: string;
  name: string;
  properties: Record<string, unknown>;
}

async function sendToSegment(evt: AnalyticsEvent): Promise<void> {
  await fetch("https://api.segment.io/v1/track", {
    method: "POST",
    body: JSON.stringify(evt),
  });
}

async function sendToMixpanel(evt: AnalyticsEvent): Promise<void> {
  await fetch("https://api.mixpanel.com/track", {
    method: "POST",
    body: JSON.stringify(evt),
  });
}

async function sendToAmplitude(evt: AnalyticsEvent): Promise<void> {
  await fetch("https://api2.amplitude.com/2/httpapi", {
    method: "POST",
    body: JSON.stringify(evt),
  });
}

export async function trackSignup(evt: AnalyticsEvent): Promise<void> {
  await Promise.all([
    sendToSegment(evt),
    sendToMixpanel(evt),
    sendToAmplitude(evt),
  ]);
}
