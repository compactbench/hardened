const foo = {
  query: async (value: string) => ({ value }),
};

export async function runLocalQuery() {
  return foo.query("not sql");
}
