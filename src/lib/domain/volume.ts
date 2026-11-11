export const WEDDING_VOLUMES = ["1-10", "11-25", "26-50", "50+"] as const;

export type WeddingVolume = (typeof WEDDING_VOLUMES)[number];

export function isWeddingVolume(value: string): value is WeddingVolume {
  return (WEDDING_VOLUMES as readonly string[]).includes(value);
}
