/** A badge only exists when there is something to count. Zero stays invisible. */
export function positiveBadgeCount(value: number): number | null {
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}
