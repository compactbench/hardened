const axios = {
  get: async (url: string) => ({ url }),
};

export async function loadLocalMock() {
  return axios.get("/local/mock");
}
