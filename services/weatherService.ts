
import { WeatherData } from "../types";

const getWeatherCondition = (code: number): string => {
  if (code === 0) return "Clear sky";
  if (code >= 1 && code <= 3) return "Partly cloudy";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95 && code <= 99) return "Thunderstorm";
  return "Unknown";
};

export const fetchCityWeather = async (cityName: string): Promise<WeatherData | null> => {
  try {
    // 1. Get coordinates for the city
    const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`);
    const geoData = await geoResponse.json();
    
    if (!geoData.results || geoData.results.length === 0) {
      return null;
    }
    
    const { latitude, longitude, name } = geoData.results[0];
    
    // 2. Get weather for those coordinates
    const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=fahrenheit`);
    const weatherData = await weatherResponse.json();
    
    if (!weatherData.current_weather) {
      return null;
    }
    
    return {
      temp: Math.round(weatherData.current_weather.temperature),
      condition: getWeatherCondition(weatherData.current_weather.weathercode),
      cityName: name,
      unit: 'F'
    };
  } catch (error) {
    console.error("Failed to fetch weather via Open-Meteo:", error);
    return null;
  }
};
