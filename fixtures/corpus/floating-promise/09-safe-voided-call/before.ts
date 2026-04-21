declare const job: { execute(): Promise<void> };

export function scheduleJob() {
  void job.execute();
}
