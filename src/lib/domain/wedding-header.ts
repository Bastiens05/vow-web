export type WeddingHeaderMode = "hero" | "thread" | "title";

export function weddingHeaderMode(path: string, weddingId: string): WeddingHeaderMode {
  if (path === `/mariage/${weddingId}`) return "hero";
  if (path.startsWith(`/mariage/${weddingId}/messages`)) return "thread";
  return "title";
}
