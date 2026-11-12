export const CREW_CAP = 15;

export type CrewRate = "hour" | "day" | "flat";

export function payCents(rateKind: CrewRate, rateCents: number, minutes: number): number {
  if (rateKind === "flat") return rateCents;
  if (rateKind === "day") return rateCents;
  return Math.round((rateCents * minutes) / 60);
}

export function canAddCrew(activeCount: number): boolean {
  return activeCount < CREW_CAP;
}
