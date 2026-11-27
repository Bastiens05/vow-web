const RAD = Math.PI / 180;

function julianDay(utc: Date): number {
  return utc.getTime() / 86_400_000 + 2_440_587.5;
}

/** Solar elevation in degrees at a UTC instant. Local arithmetic, no external service. */
export function sunElevation(utc: Date, latitude: number, longitude: number): number {
  const t = (julianDay(utc) - 2_451_545) / 36_525;
  const l0 = (280.46646 + t * (36_000.76983 + t * 0.0003032)) % 360;
  const m = (357.52911 + t * (35_999.05029 - 0.0001537 * t)) * RAD;
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const c =
    (1.914602 - t * (0.004817 + 0.000014 * t)) * Math.sin(m) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * m) +
    0.000289 * Math.sin(3 * m);
  const sunLon = (l0 + c) * RAD;
  const omega = 125.04 - 1934.136 * t;
  const lambda = sunLon - 0.00569 * RAD - 0.00478 * RAD * Math.sin(omega * RAD);
  const epsilon0 = (23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60) * RAD;
  const epsilon = epsilon0 + 0.00256 * RAD * Math.cos(omega * RAD);
  const decl = Math.asin(Math.sin(epsilon) * Math.sin(lambda));
  const y = Math.tan(epsilon / 2) ** 2;
  const eqTime =
    4 *
    (180 / Math.PI) *
    (y * Math.sin(2 * l0 * RAD) -
      2 * e * Math.sin(m) +
      4 * e * y * Math.sin(m) * Math.cos(2 * l0 * RAD) -
      0.5 * y * y * Math.sin(4 * l0 * RAD) -
      1.25 * e * e * Math.sin(2 * m));
  const minutes = utc.getUTCHours() * 60 + utc.getUTCMinutes() + utc.getUTCSeconds() / 60;
  const trueSolar = (((minutes + eqTime + 4 * longitude) % 1440) + 1440) % 1440;
  const hourAngle = (trueSolar / 4 - 180) * RAD;
  const lat = latitude * RAD;
  const elevation = Math.asin(Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngle));
  return elevation / RAD;
}

export type GoldenHour = {
  morningStart: string;
  morningEnd: string;
  eveningStart: string;
  eveningEnd: string;
};

function parisClock(utc: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(utc);
}

function parisInstant(isoDate: string, minutes: number): Date {
  const start = new Date(`${isoDate}T00:00:00+01:00`);
  return new Date(start.getTime() + minutes * 60_000);
}

/** Morning and evening windows when the sun is between the horizon and 6°. */
export function goldenHour(isoDate: string, latitude: number, longitude: number): GoldenHour | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  const samples: { clock: string; elevation: number }[] = [];
  for (let minute = 0; minute < 24 * 60; minute += 1) {
    const utc = parisInstant(isoDate, minute + 60);
    samples.push({ clock: parisClock(utc), elevation: sunElevation(utc, latitude, longitude) });
  }
  const morningEnd = samples.find((sample, index) => index > 0 && samples[index - 1]!.elevation < 6 && sample.elevation >= 6);
  const morningStart = samples.find((sample, index) => index > 0 && samples[index - 1]!.elevation < -0.83 && sample.elevation >= -0.83);
  const eveningStart = [...samples].reverse().find((sample, index, all) => {
    const previous = all[index + 1];
    return previous && previous.elevation > 6 && sample.elevation <= 6;
  });
  const eveningEnd = [...samples].reverse().find((sample, index, all) => {
    const previous = all[index + 1];
    return previous && previous.elevation > -0.83 && sample.elevation <= -0.83;
  });
  if (!morningStart || !morningEnd || !eveningStart || !eveningEnd) return null;
  if (morningEnd.clock <= morningStart.clock || eveningEnd.clock <= eveningStart.clock) return null;
  return {
    morningStart: morningStart.clock,
    morningEnd: morningEnd.clock,
    eveningStart: eveningStart.clock,
    eveningEnd: eveningEnd.clock,
  };
}
