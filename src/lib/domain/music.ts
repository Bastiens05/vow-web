export const MUSIC_MOMENTS = [
  "entrance",
  "ceremony",
  "cocktail",
  "dinner",
  "first_dance",
  "party",
  "exit",
  "other",
] as const;

export type MusicMoment = (typeof MUSIC_MOMENTS)[number];

const MOMENT_LABELS: Record<MusicMoment, string> = {
  entrance: "Entrée",
  ceremony: "Cérémonie",
  cocktail: "Cocktail",
  dinner: "Repas",
  first_dance: "Première danse",
  party: "Soirée",
  exit: "Sortie",
  other: "Autre",
};

export type MusicTrack = {
  itunesId: string;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  previewUrl: string;
  appleUrl: string;
};

const ARTWORK = /^https:\/\/(?:[a-z0-9-]+\.)*mzstatic\.com\//i;
const PREVIEW = /^https:\/\/(?:[a-z0-9-]+\.)*itunes\.apple\.com\//i;
const APPLE = /^https:\/\/(?:music|itunes)\.apple\.com\//i;

export function isMusicMoment(value: string): value is MusicMoment {
  return (MUSIC_MOMENTS as readonly string[]).includes(value);
}

export function musicMomentLabel(moment: MusicMoment): string {
  return MOMENT_LABELS[moment];
}

function text(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function httpsUrl(value: unknown, pattern: RegExp, max = 500): string {
  const url = text(value, max);
  return pattern.test(url) ? url : "";
}

export function artworkUrl(value: unknown): string {
  const url = httpsUrl(value, ARTWORK);
  if (!url) return "";
  const larger = url.replace(/\d+x\d+bb/, "200x200bb");
  return ARTWORK.test(larger) ? larger : url;
}

export function tracksFromItunes(payload: unknown): MusicTrack[] {
  if (!payload || typeof payload !== "object" || !("results" in payload)) return [];
  const results = payload.results;
  if (!Array.isArray(results)) return [];
  const tracks: MusicTrack[] = [];
  for (const row of results) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const title = text(record.trackName, 200);
    const artist = text(record.artistName, 200);
    if (!title || !artist) continue;
    const itunesId = text(record.trackId == null ? "" : String(record.trackId), 40);
    if (!/^\d{1,40}$/.test(itunesId)) continue;
    tracks.push({
      itunesId,
      title,
      artist,
      album: text(record.collectionName, 200),
      artworkUrl: artworkUrl(record.artworkUrl100),
      previewUrl: httpsUrl(record.previewUrl, PREVIEW),
      appleUrl: httpsUrl(record.trackViewUrl, APPLE),
    });
    if (tracks.length === 8) break;
  }
  return tracks;
}
