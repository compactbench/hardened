import axios from "axios";

const API_HOST = "https://api.example.com";
const API_VERSION = "v2";

export async function getUserOrder(userId: string, orderId: number) {
  return axios.get(
    `${API_HOST}/${API_VERSION}/users/${userId}/orders/${orderId}?include=items`
  );
}

export async function searchProducts(region: string, query: string) {
  const locale = region.toLowerCase();
  return axios.get(`${API_HOST}/${API_VERSION}/${locale}/search?q=${encodeURIComponent(query)}`);
}
