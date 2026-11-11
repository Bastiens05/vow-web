export type Forecast = {
  rainMm: number;
  rainProbability: number;
  windKmh: number;
};

export type WeatherThresholds = {
  rainMm: number;
  rainProbability: number;
  windKmh: number;
};

export function weatherBreach(forecast: Forecast, limits: WeatherThresholds): string | null {
  const reasons: string[] = [];
  if (forecast.rainMm >= limits.rainMm) reasons.push(`${forecast.rainMm} mm de pluie`);
  if (forecast.rainProbability >= limits.rainProbability) reasons.push(`${forecast.rainProbability} % de probabilité de pluie`);
  if (forecast.windKmh >= limits.windKmh) reasons.push(`vent à ${forecast.windKmh} km/h`);
  if (reasons.length === 0) return null;
  return `Météo au-dessus du seuil : ${reasons.join(", ")}. Vous pouvez activer le plan pluie.`;
}
