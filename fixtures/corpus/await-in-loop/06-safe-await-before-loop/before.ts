declare function loadSeed(): Promise<string>;

export async function printWithSeed(items: string[]) {
  const seed = await loadSeed();
  for (const item of items) {
    console.log(seed, item);
  }
}
