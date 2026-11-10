export function addMinutesToTime(time: string, minutes: number): string {
  const match = /^(\d{2}):(\d{2})/.exec(time);
  if (!match) return time;
  const total = Number(match[1]) * 60 + Number(match[2]) + minutes;
  const wrapped = ((total % 1440) + 1440) % 1440;
  const hours = Math.floor(wrapped / 60);
  const mins = wrapped % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function formatFrenchClock(time: string): string {
  const match = /^(\d{2}):(\d{2})/.exec(time);
  if (!match) return time;
  return `${match[1]}h${match[2]}`;
}

export function minutesBetween(from: string, to: string): number {
  const start = /^(\d{2}):(\d{2})/.exec(from);
  const end = /^(\d{2}):(\d{2})/.exec(to);
  if (!start || !end) return 0;
  return Number(end[1]) * 60 + Number(end[2]) - (Number(start[1]) * 60 + Number(start[2]));
}

export function describeShift(author: string, title: string, deltaMinutes: number, newTime: string): string {
  const amount = Math.abs(deltaMinutes);
  const verb = deltaMinutes >= 0 ? "décalé" : "avancé";
  const unit = amount === 1 ? "minute" : "minutes";
  return `${author} a ${verb} ${title} de ${amount} ${unit}, c'est désormais à ${formatFrenchClock(newTime)}.`;
}
