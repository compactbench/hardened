// While-loop processing items one at a time.
// Each process() call is independent of the others, so this is
// a missed parallelism opportunity (Promise.all or p-map would fit).
interface Job {
  id: string;
  payload: unknown;
}

async function process(job: Job): Promise<void> {
  await fetch(`https://worker.internal/run/${job.id}`, {
    method: "POST",
    body: JSON.stringify(job.payload),
  });
}

export async function runAll(items: Job[]): Promise<void> {
  let i = 0;
  while (i < items.length) {
    await process(items[i]);
    i++;
  }
}
