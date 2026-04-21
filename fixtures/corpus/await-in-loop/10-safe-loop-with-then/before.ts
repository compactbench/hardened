declare function loadItem(item: string): Promise<string>;

export function loadAll(items: string[]) {
  const pending: Array<Promise<string>> = [];
  for (const item of items) {
    pending.push(loadItem(item).then((value) => value.toUpperCase()));
  }
  return pending;
}
