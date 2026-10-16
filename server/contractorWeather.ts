import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequestCache, RequestCapacityError } from './requestCache.js';

export interface ContractorWeatherResult {
  location: string;
  temperature: number;
  temperatureUnit: string;
  condition: string;
  isDaytime: boolean;
  updatedAt: string;
}

class WeatherLookupError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/geo+json, application/json",
      "User-Agent": "XapconCRM contractor weather widget",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Weather provider returned ${response.status}`);
  return response.json();
}

async function fetchContractorWeather(address: string): Promise<ContractorWeatherResult> {
  try {
    const geocoderUrl = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress");
    geocoderUrl.searchParams.set("address", address);
    geocoderUrl.searchParams.set("benchmark", "Public_AR_Current");
    geocoderUrl.searchParams.set("format", "json");
    const geocoderData = await fetchJson(geocoderUrl.toString());
    const match = geocoderData?.result?.addressMatches?.[0];
    if (!match?.coordinates || !match?.addressComponents) {
      throw new WeatherLookupError("No se pudo ubicar la dirección registrada.", 404);
    }

    const { x: longitude, y: latitude } = match.coordinates;
    const pointsData = await fetchJson(`https://api.weather.gov/points/${latitude},${longitude}`);
    const forecastUrl = pointsData?.properties?.forecastHourly;
    if (typeof forecastUrl !== "string" || new URL(forecastUrl).hostname !== "api.weather.gov" || new URL(forecastUrl).protocol !== 'https:') {
      throw new Error("NWS forecast URL was unavailable");
    }

    const forecastData = await fetchJson(forecastUrl);
    const currentPeriod = forecastData?.properties?.periods?.[0];
    if (!currentPeriod) throw new Error("NWS hourly forecast was empty");

    const addressParts = match.addressComponents;
    const weather: ContractorWeatherResult = {
      location: [addressParts.city, addressParts.state].filter(Boolean).join(", ") || match.matchedAddress || "Ubicación de la empresa",
      temperature: currentPeriod.temperature,
      temperatureUnit: currentPeriod.temperatureUnit || "F",
      condition: currentPeriod.shortForecast || "Condición actual",
      isDaytime: Boolean(currentPeriod.isDaytime),
      updatedAt: new Date().toISOString(),
    };

    return weather;
  } catch (error) {
    if (error instanceof WeatherLookupError) throw error;
    console.error("Unable to load contractor weather:", error);
    throw new WeatherLookupError("El clima no está disponible en este momento.", 502);
  }
}

const weatherCache = createRequestCache(fetchContractorWeather);

export async function contractorWeatherMiddleware(req: IncomingMessage, res: ServerResponse, next: () => void) {
  if (req.method !== "GET") { next(); return; }

  let requestUrl: URL;
  try { requestUrl = new URL(req.url || "/", "http://localhost"); }
  catch {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'URL no válida.' }));
    return;
  }
  const address = requestUrl.searchParams.get("address")?.trim() || "";
  if (!address || address.length > 200) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Se requiere una dirección de empresa válida." }));
    return;
  }

  try {
      const weather = await weatherCache.get(address.toLocaleLowerCase().replace(/\s+/g, ' '));
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "private, max-age=900");
      res.end(JSON.stringify(weather));
    } catch (error) {
      const status = error instanceof RequestCapacityError ? 429 : error instanceof WeatherLookupError ? error.status : 502;
      if (status === 429) res.setHeader('Retry-After', '5');
      const message = error instanceof Error ? error.message : "El clima no está disponible en este momento.";
      res.statusCode = status;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: message }));
    }
}
