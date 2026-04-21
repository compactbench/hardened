declare function loadItem(item: string): Promise<string>;

export async function loadAll(items: string[]) {
  return Promise.all(items.map((item) => loadItem(item)));
}
