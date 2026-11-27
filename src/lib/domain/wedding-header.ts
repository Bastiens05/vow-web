export type WeddingHeaderMode = "hero" | "thread" | "title" | "quiet";

const OWN_TITLE = new Set(["documents", "budget", "devis", "carte", "brief"]);

export function weddingHeaderMode(path: string, weddingId: string): WeddingHeaderMode {
  if (path === `/mariage/${weddingId}`) return "hero";
  if (path.startsWith(`/mariage/${weddingId}/messages`)) return "thread";
  const section = path.slice(`/mariage/${weddingId}/`.length).split("/")[0]?.split("?")[0] ?? "";
  if (OWN_TITLE.has(section)) return "quiet";
  return "title";
}

export function weddingHomeLink(path: string, weddingId: string): string | null {
  if (!path.startsWith(`/mariage/${weddingId}/`)) return null;
  return `/mariage/${weddingId}`;
}
