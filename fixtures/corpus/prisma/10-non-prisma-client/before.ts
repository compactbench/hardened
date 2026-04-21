const client = {
  user: {
    findMany: async () => [],
  },
};

export async function listUsers() {
  return client.user.findMany();
}
