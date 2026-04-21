declare const subscribers: Array<{ notify(): Promise<void> }>;

export async function notifySubscribers() {
  await Promise.all(subscribers.map((subscriber) => subscriber.notify()));
  console.log("notifications queued");
}
