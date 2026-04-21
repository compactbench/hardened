declare const job: { execute(): Promise<void> };

export function scheduleJob() {
  job.execute();
}
