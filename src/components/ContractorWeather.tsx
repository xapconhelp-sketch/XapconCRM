import { useEffect, useId, useState } from "react";
import { Cloud, MapPin } from "lucide-react";

interface ContractorWeatherData {
  location: string;
  temperature: number;
  temperatureUnit: string;
  condition: string;
  isDaytime: boolean;
  provider: "WeatherAPI" | "Open-Meteo";
}

interface ContractorWeatherProps {
  address?: string | null;
}

function weatherKind(condition: string, isDaytime: boolean, status: "loading" | "ready" | "unavailable") {
  if (status !== "ready") return status;
  const normalized = condition.toLowerCase();
  if (/tormenta|thunder|lightning/.test(normalized)) return "storm";
  if (/nieve|snow|sleet|ice|freezing/.test(normalized)) return "snow";
  if (/llovizna|drizzle/.test(normalized)) return "drizzle";
  if (/lluvia|rain|shower/.test(normalized)) return "rain";
  if (/neblina|niebla|fog|haze|mist/.test(normalized)) return "fog";
  if (/viento|wind|breezy/.test(normalized)) return "wind";
  if (/parcialmente|partly/.test(normalized)) return isDaytime ? "partly-sunny" : "partly-night";
  if (/nublado|cloud|overcast/.test(normalized)) return "cloudy";
  return isDaytime ? "sunny" : "night";
}

function WeatherArt({ kind }: { kind: ReturnType<typeof weatherKind> }) {
  const id = useId();
  if (kind === "loading") return <Cloud className="contractor-weather-glyph" />;
  if (kind === "unavailable") return <MapPin className="contractor-weather-glyph" />;

  const sunny = kind === "sunny" || kind === "partly-sunny";
  const night = kind === "night" || kind === "partly-night";
  const partly = sunny || night;
  const precipitation = ["storm", "rain", "drizzle", "snow"].includes(kind);
  const cloud = `url(#${id}-cloud)`;
  const sun = `url(#${id}-sun)`;

  return (
    <svg className="contractor-weather-glyph" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-cloud`} x1="20%" y1="0%" x2="70%" y2="100%">
          <stop stopColor="#fff" /><stop offset="1" stopColor={precipitation ? "#8d949d" : "#a9adb3"} />
        </linearGradient>
        <radialGradient id={`${id}-sun`} cx="30%" cy="25%" r="75%">
          <stop stopColor="#ffd166" /><stop offset="1" stopColor="#ed7500" />
        </radialGradient>
        <linearGradient id={`${id}-moon`} x2="75%" y2="100%">
          <stop stopColor="#fff1b5" /><stop offset="1" stopColor="#e6aa48" />
        </linearGradient>
      </defs>
      {sunny && <g transform={kind === "sunny" ? "translate(10 7)" : undefined} fill={sun}>
        <path d="m22 5 5 4 7-1 3 6 6 3-1 7 4 5-5 5-1 7-7 1-5 5-6-3-7 1-3-6-6-3 1-7-4-5 5-5 1-7 7-1Z" />
        <circle cx="25" cy="26" r="16" />
      </g>}
      {night && <path transform={kind === "partly-night" ? "translate(-6 -6)" : undefined} fill={`url(#${id}-moon)`} d="M39 7a24 24 0 1 0 17 37A23 23 0 0 1 39 7Z" />}
      {kind !== "sunny" && kind !== "night" && <g transform={partly ? "translate(7 9)" : precipitation ? "translate(0 -5)" : undefined}>
        <path fill={cloud} d="M18 47a11 11 0 0 1-1-22 15 15 0 0 1 28-2 12 12 0 0 1 2 24Z" />
        {kind === "cloudy" && <path fill={cloud} d="M14 48a8 8 0 0 1 0-16 10 10 0 0 1 18 1 8 8 0 0 1 1 15Z" />}
      </g>}
      {kind === "storm" && <path fill={sun} d="m31 36-12 16h9l-4 10 18-18H32l5-8Zm15 5-7 10h5l-2 9 12-14h-7l3-5Z" />}
      {(kind === "rain" || kind === "drizzle") && <path fill="#2871d7" d="M25 44c-3 5-6 7-6 10a6 6 0 0 0 12 0c0-3-3-5-6-10Zm16 0c-2 4-5 6-5 9a5 5 0 0 0 10 0c0-3-3-5-5-9Z" />}
      {kind === "snow" && <path stroke="#69b4e8" strokeWidth="3" strokeLinecap="round" d="M23 47v11m-5-8 10 6m0-6-10 6m23-9v11m-5-8 10 6m0-6-10 6" />}
      {(kind === "fog" || kind === "wind") && <path stroke="#8b98a6" strokeWidth="3" strokeLinecap="round" fill="none" d="M14 51h34m-26 6h21" />}
    </svg>
  );
}

export default function ContractorWeather({ address }: ContractorWeatherProps) {
  const [weather, setWeather] = useState<ContractorWeatherData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [unavailableReason, setUnavailableReason] = useState("");
  const normalizedAddress = address?.trim() || "";

  useEffect(() => {
    if (!normalizedAddress) {
      setWeather(null);
      setStatus("unavailable");
      setUnavailableReason("Agrega la dirección comercial en Configuración de empresa.");
      return;
    }

    const controller = new AbortController();
    setStatus("loading");
    setUnavailableReason("");
    const params = new URLSearchParams({ address: normalizedAddress });

    fetch(`/api/contractor-weather?${params.toString()}`, { signal: controller.signal })
      .then(async response => {
        const result = await response.json() as ContractorWeatherData & { error?: string };
        if (!response.ok) throw new Error(result.error || "No se pudo consultar el clima de esta dirección.");
        return result;
      })
      .then(data => {
        setWeather(data);
        setStatus("ready");
      })
      .catch(error => {
        if (error.name === "AbortError") return;
        setWeather(null);
        setStatus("unavailable");
        setUnavailableReason(error instanceof Error ? error.message : "El clima no está disponible para esta dirección.");
      });

    return () => controller.abort();
  }, [normalizedAddress]);

  const iconCondition = weather?.condition || "clear";
  const isDaytime = weather?.isDaytime ?? true;
  const iconKind = weatherKind(iconCondition, isDaytime, status);
  const label = status === "ready"
    ? `${weather?.condition}, ${weather?.temperature}°${weather?.temperatureUnit} en ${weather?.location}`
    : status === "loading"
      ? "Consultando el clima de la empresa"
      : unavailableReason;
  const providerLink = weather?.provider === "WeatherAPI" ? "https://www.weatherapi.com/" : "https://open-meteo.com/";
  const providerLabel = weather?.provider || "Open-Meteo";

  return (
    <div className={`contractor-weather is-${status}`} aria-live="polite" title={label}>
      {status === "ready" ? (
        <a className="contractor-weather-icon" href={providerLink} target="_blank" rel="noreferrer"
          title={`Datos de ${providerLabel}`} aria-label={`Datos meteorológicos de ${providerLabel}`}>
          <WeatherArt kind={iconKind} />
        </a>
      ) : <span className="contractor-weather-icon" aria-hidden="true"><WeatherArt kind={iconKind} /></span>}
      <span className="contractor-weather-copy">
        {status === "ready" && weather ? (
          <>
            <span className="contractor-weather-eyebrow">{weather.condition}</span>
            <span className="contractor-weather-reading">
              <strong>{Math.round(weather.temperature)}°<small>{weather.temperatureUnit}</small></strong>
              <span className="contractor-weather-location">{weather.location}</span>
            </span>
          </>
        ) : (
          <span className="contractor-weather-status-copy">{status === "loading" ? "Consultando condiciones…" : unavailableReason}</span>
        )}
      </span>
    </div>
  );
}
