import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequestCache, RequestCapacityError } from './requestCache.js';

export interface ContractorWeatherResult {
  location: string;
  temperature: number;
  temperatureUnit: string;
  condition: string;
  isDaytime: boolean;
  updatedAt: string;
  provider: "WeatherAPI" | "Open-Meteo";
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
    headers: { Accept: "application/json", "User-Agent": "XapconCRM contractor weather widget" },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new WeatherLookupError("El servicio meteorológico respondió con un error temporal.", 502);
  const body = await response.json();
  if (body?.error) throw new WeatherLookupError("El servicio meteorológico no pudo procesar la consulta.", 502);
  return body;
}

function getLocationSearches(address: string): string[] {
  const parts = address.split(",").map(part => part.trim()).filter(Boolean);
  const searches: string[] = [];
  const usZip = address.match(/\b\d{5}(?:-\d{4})?\b/)?.[0]?.slice(0, 5);
  const canadianPostalCode = address.match(/\b[A-Z]\d[A-Z][ -]?\d[A-Z]\d\b/i)?.[0];
  const isStreetSegment = (part: string) => /^\s*\d+\s+\S+/.test(part)
    || /^\s*(?:apt\.?|apartment|unit|suite|ste\.?|#|po box)\b/i.test(part)
    || /\b(street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd\.?|drive|dr\.?|lane|ln\.?|court|ct\.?|highway|hwy\?)\b/i.test(part);

  // Only send locality data to the geocoder, never a street address or building number.
  if (usZip) searches.push(usZip);
  if (canadianPostalCode) searches.push(canadianPostalCode.replace(/\s+/g, " "));
  const localityParts = parts.filter(part => !isStreetSegment(part));
  if (localityParts.length >= 2) searches.push(localityParts.slice(-3).join(", "));
  else if (localityParts.length === 1 && !/\d/.test(localityParts[0])) searches.push(localityParts[0]);
  else if (parts.length === 1 && !isStreetSegment(address) && !/\d/.test(address)) searches.push(address.trim());

  return [...new Set(searches.filter(Boolean))];
}

function describeWeatherCode(code: number): string {
  if (code === 0) return "Despejado";
  if ([1, 2].includes(code)) return "Parcialmente nublado";
  if (code === 3) return "Nublado";
  if ([45, 48].includes(code)) return "Neblina";
  if ([51, 53, 55, 56, 57].includes(code)) return "Llovizna";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Lluvia";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Nieve";
  if ([95, 96, 99].includes(code)) return "Tormenta eléctrica";
  return "Condiciones variables";
}

async function fetchOpenMeteoWeather(searches: string[]): Promise<ContractorWeatherResult> {
  let place: { latitude: number; longitude: number; name: string; admin1?: string; country?: string } | undefined;
  for (const search of searches) {
    const geocoderUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
    geocoderUrl.searchParams.set("name", search);
    geocoderUrl.searchParams.set("count", "5");
    geocoderUrl.searchParams.set("language", "es");
    const geocoderData = await fetchJson(geocoderUrl.toString());
    const results = Array.isArray(geocoderData?.results) ? geocoderData.results : [];
    place = results.find((result: { latitude?: number; longitude?: number }) =>
      Number.isFinite(result.latitude) && Number.isFinite(result.longitude),
    );
    if (place) break;
  }
  if (!place) throw new WeatherLookupError("No se pudo reconocer la ciudad o el código postal de la dirección de la empresa.", 404);

  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.searchParams.set("latitude", String(place.latitude));
  forecastUrl.searchParams.set("longitude", String(place.longitude));
  forecastUrl.searchParams.set("current", "temperature_2m,weather_code,is_day");
  forecastUrl.searchParams.set("temperature_unit", "fahrenheit");
  forecastUrl.searchParams.set("timezone", "auto");
  const forecastData = await fetchJson(forecastUrl.toString());
  const current = forecastData?.current;
  if (!current || !Number.isFinite(current.temperature_2m) || !Number.isFinite(current.weather_code)) {
    throw new WeatherLookupError("El servicio meteorológico no devolvió condiciones actuales para esta ubicación.", 502);
  }
  return {
    location: [place.name, place.admin1, place.country].filter(Boolean).join(", "),
    temperature: current.temperature_2m,
    temperatureUnit: "F",
    condition: describeWeatherCode(current.weather_code),
    isDaytime: current.is_day === 1,
    updatedAt: current.time ? new Date(current.time).toISOString() : new Date().toISOString(),
    provider: "Open-Meteo",
  };
}

async function fetchWeatherApiWeather(searches: string[], apiKey: string): Promise<ContractorWeatherResult> {
  let data: any = null;
  for (let index = 0; index < searches.length; index += 1) {
    const search = searches[index];
    const url = new URL("https://api.weatherapi.com/v1/current.json");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("q", search);
    url.searchParams.set("lang", "es");
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "XapconCRM contractor weather widget" },
      signal: AbortSignal.timeout(8000),
    });
    const body = await response.json();
    if (!response.ok || body?.error) {
      if (body?.error?.code === 1006 && index < searches.length - 1) continue;
      throw new WeatherLookupError(
        body?.error?.code === 1006
          ? "No se pudo reconocer la ciudad o el código postal de la dirección de la empresa."
          : "El servicio meteorológico respondió con un error temporal.",
        body?.error?.code === 1006 ? 404 : 502,
      );
    }
    data = body;
    break;
  }
  const current = data?.current;
  const place = data?.location;
  if (!current || !Number.isFinite(current.temp_f) || !place?.name) {
    throw new WeatherLookupError("El servicio meteorológico no devolvió condiciones actuales para esta ubicación.", 502);
  }
  return {
    location: [place.name, place.region, place.country].filter(Boolean).join(", "),
    temperature: current.temp_f,
    temperatureUnit: "F",
    condition: current.condition?.text || "Condiciones variables",
    isDaytime: current.is_day === 1,
    updatedAt: current.last_updated_epoch
      ? new Date(current.last_updated_epoch * 1000).toISOString()
      : new Date().toISOString(),
    provider: "WeatherAPI",
  };
}

async function fetchContractorWeather(locationSearch: string): Promise<ContractorWeatherResult> {
  try {
    const searches = locationSearch.split("||").map(part => part.trim()).filter(Boolean);
    if (searches.length === 0) {
      throw new WeatherLookupError("Agrega una ciudad o código postal en la dirección comercial de la empresa.", 400);
    }
    const weatherApiKey = process.env.WEATHERAPI_API_KEY?.trim();
    if (weatherApiKey) return await fetchWeatherApiWeather(searches, weatherApiKey);
    if (process.env.NODE_ENV === "production") {
      throw new WeatherLookupError("Falta configurar la clave gratuita de WeatherAPI para producción.", 503);
    }
    return await fetchOpenMeteoWeather(searches);
  } catch (error) {
    if (error instanceof WeatherLookupError) throw error;
    console.error("Unable to load contractor weather provider.");
    throw new WeatherLookupError("El servicio del clima no respondió. Inténtalo de nuevo más tarde.", 502);
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
      const cacheKey = getLocationSearches(address).map(search => search.toLocaleLowerCase().replace(/\s+/g, " ")).join("||");
      const weather = await weatherCache.get(cacheKey);
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
