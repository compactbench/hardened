declare function loadItem(item: string): Promise<string>;

export function createLoaders(items: string[]) {
  const loaders: Array<() => Promise<string>> = [];
  for (const item of items) {
    const run = async () => await loadItem(item);
    loaders.push(run);
  }
  return loaders;
}
