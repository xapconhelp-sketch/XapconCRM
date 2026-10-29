import { useEffect, useState } from "react";
import { CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, MapPin, Moon, Sun, Wind } from "lucide-react";

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

function weatherKind(condition: string, isDaytime: boolean, status: "loading" | "ready" | "unavailable") {
  if (status !== "ready") return status;
  const normalized = condition.toLowerCase();
  if (/thunder|lightning/.test(normalized)) return "storm";
  if (/snow|sleet|ice|freezing/.test(normalized)) return "snow";
  if (/drizzle|rain|shower/.test(normalized)) return "rain";
  if (/fog|haze|mist/.test(normalized)) return "fog";
  if (/wind|breezy/.test(normalized)) return "wind";
  if (/cloud|overcast/.test(normalized)) return "cloudy";
  return isDaytime ? "sunny" : "night";
}

function WeatherIcon({ condition, isDaytime }: { condition: string; isDaytime: boolean }) {
  const normalized = condition.toLowerCase();
  const props = { className: "contractor-weather-glyph", strokeWidth: 1.8, "aria-hidden": true as const };

  if (/thunder|lightning/.test(normalized)) return <CloudLightning {...props} />;
  if (/snow|sleet|ice|freezing/.test(normalized)) return <CloudSnow {...props} />;
  if (/drizzle/.test(normalized)) return <CloudDrizzle {...props} />;
  if (/rain|shower/.test(normalized)) return <CloudRain {...props} />;
  if (/fog|haze|mist/.test(normalized)) return <CloudFog {...props} />;
  if (/wind|breezy/.test(normalized)) return <Wind {...props} />;
  if (/cloud|overcast/.test(normalized)) return isDaytime ? <CloudSun {...props} /> : <CloudMoon {...props} />;
  return isDaytime ? <Sun {...props} /> : <Moon {...props} />;
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

  return (
    <div className={`contractor-weather is-${status}`} aria-live="polite" title={label}>
      <span className="contractor-weather-icon" data-weather={iconKind} aria-hidden="true">
        {status === "unavailable" && !normalizedAddress
          ? <MapPin className="contractor-weather-glyph" strokeWidth={1.8} />
          : <WeatherIcon condition={iconCondition} isDaytime={isDaytime} />}
        {status === "ready" && <span className="contractor-weather-indicator" />}
      </span>
      <span className="contractor-weather-copy">
        {status === "ready" && weather ? (
          <>
            <span className="contractor-weather-eyebrow">Clima de la empresa</span>
            <span className="contractor-weather-reading">
              <strong>{Math.round(weather.temperature)}°<small>{weather.temperatureUnit}</small></strong>
              <span className="contractor-weather-details">
                <span className="contractor-weather-location">{weather.location}</span>
                <span className="contractor-weather-condition">{weather.condition}</span>
                <span className="contractor-weather-source">
                  Datos: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" title="Datos meteorológicos de Open-Meteo, CC BY 4.0; códigos meteorológicos traducidos al español.">Open-Meteo · CC BY 4.0</a>
                </span>
              </span>
            </span>
          </>
        ) : (
          <>
            <span className="contractor-weather-eyebrow">Clima de la empresa</span>
            <span className="contractor-weather-status-copy">{status === "loading" ? "Consultando condiciones…" : unavailableReason}</span>
          </>
        )}
      </span>
    </div>
  );
}
