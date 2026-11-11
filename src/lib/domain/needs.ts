export type NeedRow = {
  userId: string;
  name: string;
  accessStart: string | null;
  accessEnd: string | null;
  parking: string;
  powerW: number;
};

export type NeedConflict = { kind: "access" | "power" | "parking"; message: string };

function minutes(value: string | null): number | null {
  if (!value) return null;
  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function needConflicts(rows: NeedRow[], venuePowerW: number | null): NeedConflict[] {
  const conflicts: NeedConflict[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const a = rows[i];
      const b = rows[j];
      if (!a || !b) continue;
      const aStart = minutes(a.accessStart);
      const aEnd = minutes(a.accessEnd);
      const bStart = minutes(b.accessStart);
      const bEnd = minutes(b.accessEnd);
      if (aStart !== null && aEnd !== null && bStart !== null && bEnd !== null && aStart < bEnd && bStart < aEnd) {
        conflicts.push({
          kind: "access",
          message: `${a.name} et ${b.name} arrivent en même temps.`,
        });
      }
      const spotA = a.parking.trim().toLowerCase();
      const spotB = b.parking.trim().toLowerCase();
      if (spotA && spotA === spotB) {
        conflicts.push({
          kind: "parking",
          message: `${a.name} et ${b.name} visent la même place (${a.parking.trim()}).`,
        });
      }
    }
  }
  if (venuePowerW !== null && venuePowerW >= 0) {
    const total = rows.reduce((sum, row) => sum + row.powerW, 0);
    if (total > venuePowerW) {
      conflicts.push({
        kind: "power",
        message: `La puissance demandée (${total} W) dépasse la capacité du lieu (${venuePowerW} W).`,
      });
    }
  }
  return conflicts;
}
