import { useEffect, useState } from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, MapPin, Moon, Sun, Wind } from "lucide-react";

interface ContractorWeatherData {
  location: string;
  temperature: number;
  temperatureUnit: string;
  condition: string;
  isDaytime: boolean;
}

interface ContractorWeatherProps {
  address?: string | null;
}

function WeatherIcon({ condition, isDaytime }: { condition: string; isDaytime: boolean }) {
  const normalized = condition.toLowerCase();
  const className = "h-5 w-5";

  if (/thunder|lightning/.test(normalized)) return <CloudLightning className={className} aria-hidden="true" />;
  if (/snow|sleet|ice|freezing/.test(normalized)) return <CloudSnow className={className} aria-hidden="true" />;
  if (/drizzle/.test(normalized)) return <CloudDrizzle className={className} aria-hidden="true" />;
  if (/rain|shower/.test(normalized)) return <CloudRain className={className} aria-hidden="true" />;
  if (/fog|haze|mist/.test(normalized)) return <CloudFog className={className} aria-hidden="true" />;
  if (/wind|breezy/.test(normalized)) return <Wind className={className} aria-hidden="true" />;
  if (/cloud|overcast/.test(normalized)) return <Cloud className={className} aria-hidden="true" />;
  return isDaytime ? <Sun className={className} aria-hidden="true" /> : <Moon className={className} aria-hidden="true" />;
}

export default function ContractorWeather({ address }: ContractorWeatherProps) {
  const [weather, setWeather] = useState<ContractorWeatherData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const normalizedAddress = address?.trim() || "";

  useEffect(() => {
    if (!normalizedAddress) {
      setWeather(null);
      setStatus("unavailable");
      return;
    }

    const controller = new AbortController();
    setStatus("loading");
    const params = new URLSearchParams({ address: normalizedAddress });

    fetch(`/api/contractor-weather?${params.toString()}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Weather request failed");
        return response.json() as Promise<ContractorWeatherData>;
      })
      .then(data => {
        setWeather(data);
        setStatus("ready");
      })
      .catch(error => {
        if (error.name === "AbortError") return;
        setWeather(null);
        setStatus("unavailable");
      });

    return () => controller.abort();
  }, [normalizedAddress]);

  const iconCondition = weather?.condition || "clear";
  const isDaytime = weather?.isDaytime ?? true;
  const label = status === "ready"
    ? `${weather?.condition}, ${weather?.temperature}°${weather?.temperatureUnit} en ${weather?.location}`
    : status === "loading"
      ? "Consultando el clima de la empresa"
      : normalizedAddress
        ? "Clima no disponible para esta ubicación"
        : "Registra la dirección de la empresa para ver el clima";

  return (
    <div className={`contractor-weather ${status === "unavailable" ? "is-unavailable" : ""}`} aria-live="polite" title={label}>
      <span className="contractor-weather-icon">
        {status === "unavailable" && !normalizedAddress
          ? <MapPin className="h-5 w-5" aria-hidden="true" />
          : <WeatherIcon condition={iconCondition} isDaytime={isDaytime} />}
      </span>
      <span className="contractor-weather-copy">
        {status === "ready" && weather ? (
          <>
            <strong>{Math.round(weather.temperature)}°{weather.temperatureUnit}</strong>
            <span>{weather.location} · {weather.condition}</span>
          </>
        ) : (
          <span>{status === "loading" ? "Consultando clima…" : normalizedAddress ? "Clima no disponible" : "Agrega la dirección de empresa"}</span>
        )}
      </span>
    </div>
  );
}
