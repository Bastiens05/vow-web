import type { Forecast } from "@/lib/domain/weather";

export function weatherAlertsEnabled(): boolean {
  return process.env.WEATHER_ALERTS_ENABLED === "true";
}

type Point = { latitude: number; longitude: number };

export async function geocodePlace(name: string): Promise<Point | null> {
  if ((process.env.WEATHER_PROVIDER ?? "open-meteo") !== "open-meteo") return null;
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", name);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "fr");
  const response = await fetch(url);
  if (!response.ok) return null;
  const body = (await response.json()) as { results?: Array<{ latitude: number; longitude: number }> };
  const first = body.results?.[0];
  if (!first) return null;
  return { latitude: first.latitude, longitude: first.longitude };
}

export async function forecastFor(point: Point, day: string): Promise<Forecast | null> {
  if ((process.env.WEATHER_PROVIDER ?? "open-meteo") !== "open-meteo") return null;
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(point.latitude));
  url.searchParams.set("longitude", String(point.longitude));
  url.searchParams.set("daily", "precipitation_sum,precipitation_probability_max,wind_speed_10m_max");
  url.searchParams.set("timezone", "Europe/Paris");
  url.searchParams.set("forecast_days", "8");
  const response = await fetch(url);
  if (!response.ok) return null;
  const body = (await response.json()) as {
    daily?: {
      time?: string[];
      precipitation_sum?: number[];
      precipitation_probability_max?: number[];
      wind_speed_10m_max?: number[];
    };
  };
  const index = body.daily?.time?.indexOf(day) ?? -1;
  if (index < 0) return null;
  return {
    rainMm: body.daily?.precipitation_sum?.[index] ?? 0,
    rainProbability: body.daily?.precipitation_probability_max?.[index] ?? 0,
    windKmh: body.daily?.wind_speed_10m_max?.[index] ?? 0,
  };
}
