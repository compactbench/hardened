declare const loaders: Array<() => Promise<string>>;

export function loadAll() {
  return Promise.all(loaders.map((load) => load()));
}
