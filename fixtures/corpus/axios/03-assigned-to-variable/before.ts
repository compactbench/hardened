import axios from "axios";

export function getWeatherPromise(city: string) {
  const pendingForecast = axios.get(`https://weather.example.com/api/forecast?city=${encodeURIComponent(city)}`);
  return pendingForecast;
}
