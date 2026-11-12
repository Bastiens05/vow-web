export type TechNeed = {
  vendorId: string;
  trade: string;
  outlets: number;
  amps: number;
  vehicleM: number;
  setupStart: string;
  setupEnd: string;
  teardown: string;
  needsXlr: boolean;
};

export type VenueSheet = {
  outlets: number;
  maxPowerW: number;
  vehicleMaxM: number;
  curfew: string;
  oneDoor: boolean;
};

export type TechIssue = { code: string; message: string; vendorIds: string[] };

function minutes(value: string): number {
  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function evaluateTech(needs: readonly TechNeed[], venue: VenueSheet): TechIssue[] {
  const issues: TechIssue[] = [];
  const outlets = needs.reduce((sum, need) => sum + need.outlets, 0);
  if (outlets > venue.outlets) {
    issues.push({ code: "outlets", message: "Les prises demandées dépassent celles de la salle.", vendorIds: needs.map((need) => need.vendorId) });
  }
  for (const need of needs) {
    if (need.amps > 16 && venue.maxPowerW < 3680) {
      issues.push({ code: "amps", message: "Une ligne 16 A ne suffit pas.", vendorIds: [need.vendorId] });
    }
    if (need.vehicleM > venue.vehicleMaxM) {
      issues.push({ code: "vehicle", message: "Le véhicule est plus long que l'accès.", vendorIds: [need.vendorId] });
    }
    if (venue.curfew && minutes(need.teardown) > minutes(venue.curfew)) {
      issues.push({ code: "curfew", message: "Le démontage dépasse le couvre-feu.", vendorIds: [need.vendorId] });
    }
  }
  const video = needs.find((need) => need.trade === "videographer" && need.needsXlr);
  const dj = needs.find((need) => need.trade === "dj");
  if (video && dj && !dj.needsXlr) {
    issues.push({ code: "xlr", message: "La vidéo attend une sortie audio que le DJ n'a pas confirmée.", vendorIds: [video.vendorId, dj.vendorId] });
  }
  if (venue.oneDoor) {
    const setups = needs.filter((need) => need.setupStart && need.setupEnd);
    for (let i = 0; i < setups.length; i += 1) {
      for (let j = i + 1; j < setups.length; j += 1) {
        const a = setups[i];
        const b = setups[j];
        if (minutes(a.setupStart) < minutes(b.setupEnd) && minutes(b.setupStart) < minutes(a.setupEnd)) {
          issues.push({ code: "door", message: "Deux installations se croisent sur la seule porte de chargement.", vendorIds: [a.vendorId, b.vendorId] });
        }
      }
    }
  }
  return issues;
}

export const TECH_FIELDS = [
  "prises",
  "ampères",
  "triphasé",
  "eau",
  "m²",
  "hauteur",
  "longueur véhicule",
  "montage",
  "démontage",
  "sortie XLR",
  "intérieur / extérieur",
  "couverture pluie",
  "pièce au calme",
] as const;
