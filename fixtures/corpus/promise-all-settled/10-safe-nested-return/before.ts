declare const loaders: Array<() => Promise<string>>;

export function createLoader() {
  return () => Promise.all(loaders.map((load) => load()));
}
