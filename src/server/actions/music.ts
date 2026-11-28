"use server";

import { revalidatePath } from "next/cache";
import { isMusicMoment, tracksFromItunes, type MusicMoment, type MusicTrack } from "@/lib/domain/music";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/server/actions/auth";
import { getWeddingSpace } from "@/server/data";
import { requireSession } from "@/server/session";

export type WeddingSong = MusicTrack & { id: string; moment: MusicMoment };

const PENDING = "La liste de musique sera enregistrée dès que la base aura été mise à jour.";

function path(weddingId: string) {
  return `/mariage/${weddingId}/pratique`;
}

function relationMissing(error: { code?: string; message?: string }): boolean {
  const message = error.message ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (/wedding_songs/i.test(message) && /schema cache|does not exist|could not find/i.test(message))
  );
}

export async function listWeddingSongs(weddingId: string): Promise<{ songs: WeddingSong[]; pending: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wedding_songs")
    .select("id, moment, title, artist, album, artwork_url, preview_url, apple_url, itunes_id, sort_order")
    .eq("wedding_id", weddingId)
    .order("sort_order")
    .order("created_at");
  if (error) return { songs: [], pending: relationMissing(error) };
  const songs: WeddingSong[] = [];
  for (const row of data ?? []) {
    if (!isMusicMoment(row.moment)) continue;
    songs.push({
      id: row.id,
      moment: row.moment,
      itunesId: row.itunes_id,
      title: row.title,
      artist: row.artist,
      album: row.album,
      artworkUrl: row.artwork_url,
      previewUrl: row.preview_url,
      appleUrl: row.apple_url,
    });
  }
  return { songs, pending: false };
}

export async function searchItunes(term: string): Promise<{ tracks: MusicTrack[]; error?: string }> {
  await requireSession();
  const query = term.replace(/\s+/g, " ").trim().slice(0, 80);
  if (query.length < 2) return { tracks: [] };
  const url = new URL("https://itunes.apple.com/search");
  url.searchParams.set("term", query);
  url.searchParams.set("entity", "song");
  url.searchParams.set("limit", "8");
  url.searchParams.set("country", "FR");
  url.searchParams.set("lang", "fr_fr");
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { Accept: "application/json" } });
    if (!response.ok) return { tracks: [], error: "La recherche musicale est momentanément indisponible." };
    return { tracks: tracksFromItunes(await response.json()) };
  } catch {
    return { tracks: [], error: "La recherche musicale est momentanément indisponible." };
  }
}

async function coupleWedding(weddingId: string) {
  const space = await getWeddingSpace(weddingId);
  if (space.role !== "couple") return null;
  return space;
}

export async function addWeddingSong(weddingId: string, moment: string, track: MusicTrack): Promise<ActionState> {
  await requireSession();
  if (!(await coupleWedding(weddingId))) return { error: "Réservé aux mariés." };
  if (!isMusicMoment(moment)) return { error: "Choisissez un moment." };
  const parsed = tracksFromItunes({
    results: [
      {
        trackId: track.itunesId,
        trackName: track.title,
        artistName: track.artist,
        collectionName: track.album,
        artworkUrl100: track.artworkUrl,
        previewUrl: track.previewUrl,
        trackViewUrl: track.appleUrl,
      },
    ],
  })[0];
  if (!parsed) return { error: "Ce titre ne peut pas être ajouté." };

  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("wedding_songs")
    .select("id, itunes_id")
    .eq("wedding_id", weddingId)
    .eq("moment", moment);
  if (readError) return { error: relationMissing(readError) ? PENDING : "La liste de musique est indisponible." };
  if ((existing ?? []).some((row) => row.itunes_id === parsed.itunesId)) {
    return { error: "Ce titre est déjà dans ce moment." };
  }
  if ((existing ?? []).length >= 8) return { error: "Huit titres suffisent pour ce moment." };

  const { error } = await supabase.from("wedding_songs").insert({
    wedding_id: weddingId,
    moment,
    title: parsed.title,
    artist: parsed.artist,
    album: parsed.album,
    artwork_url: parsed.artworkUrl,
    preview_url: parsed.previewUrl,
    apple_url: parsed.appleUrl,
    itunes_id: parsed.itunesId,
    sort_order: (existing ?? []).length,
  });
  if (error) return { error: relationMissing(error) ? PENDING : "La liste de musique est indisponible." };
  revalidatePath(path(weddingId));
  return { success: "Titre ajouté." };
}

export async function removeWeddingSong(weddingId: string, songId: string): Promise<ActionState> {
  await requireSession();
  if (!(await coupleWedding(weddingId))) return { error: "Réservé aux mariés." };
  if (!/^[0-9a-f-]{36}$/i.test(songId)) return { error: "Ce titre est introuvable." };
  const supabase = await createClient();
  const { error } = await supabase.from("wedding_songs").delete().eq("id", songId).eq("wedding_id", weddingId);
  if (error) return { error: relationMissing(error) ? PENDING : "La liste de musique est indisponible." };
  revalidatePath(path(weddingId));
  return { success: "Titre retiré." };
}
