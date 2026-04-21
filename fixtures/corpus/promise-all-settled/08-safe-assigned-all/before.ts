declare const loaders: Array<() => Promise<string>>;

export async function loadAll() {
  const values = await Promise.all(loaders.map((load) => load()));
  return values.join(",");
}
