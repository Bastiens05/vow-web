"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MUSIC_MOMENTS, musicMomentLabel, type MusicMoment, type MusicTrack } from "@/lib/domain/music";
import { addWeddingSong, removeWeddingSong, searchItunes, type WeddingSong } from "@/server/actions/music";

export function MusicList({
  weddingId,
  songs,
  canEdit,
  pending,
  notes,
}: {
  weddingId: string;
  songs: WeddingSong[];
  canEdit: boolean;
  pending: boolean;
  notes: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [moment, setMoment] = useState<MusicMoment>("first_dance");
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [asked, setAsked] = useState(false);
  const [problem, setProblem] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const request = useRef(0);
  const timer = useRef<number | null>(null);

  function look(next: string) {
    setAsked(next.trim().length >= 2);
    setProblem("");
    if (timer.current) window.clearTimeout(timer.current);
    if (next.trim().length < 2) {
      request.current += 1;
      setTracks([]);
      return;
    }
    timer.current = window.setTimeout(() => {
      const id = request.current + 1;
      request.current = id;
      void searchItunes(next).then((result) => {
        if (id !== request.current) return;
        setTracks(result.tracks);
        setProblem(result.error ?? "");
      });
    }, 300);
  }

  async function add(track: MusicTrack) {
    setBusy(track.itunesId);
    setProblem("");
    setNote("");
    const result = await addWeddingSong(weddingId, moment, track);
    setBusy("");
    if (result.error) {
      setProblem(result.error);
      return;
    }
    setNote(result.success ?? "Titre ajouté.");
    router.refresh();
  }

  async function remove(song: WeddingSong) {
    setBusy(song.id);
    setProblem("");
    const result = await removeWeddingSong(weddingId, song.id);
    setBusy("");
    if (result.error) {
      setProblem(result.error);
      return;
    }
    router.refresh();
  }

  const groups = MUSIC_MOMENTS.map((value) => ({
    moment: value,
    songs: songs.filter((song) => song.moment === value),
  })).filter((group) => group.songs.length > 0);

  return (
    <section className="min-w-0">
      <h2 className="text-lg font-semibold tracking-tight">Musique</h2>
      <p className="mt-1 text-sm leading-6 text-muted">
        {canEdit
          ? "Choisissez les titres de l'entrée, de la cérémonie, de la première danse. Seul le DJ ou le musicien les voit."
          : "Les titres choisis par les mariés. Les autres métiers ne les voient pas."}
      </p>
      {pending && canEdit ? (
        <p className="mt-3 text-sm text-muted">La liste sera enregistrée dès que la base aura été mise à jour. La recherche, elle, fonctionne.</p>
      ) : null}
      {notes.trim() ? <p className="mt-3 text-sm leading-6 text-ink">{notes}</p> : null}
      {canEdit ? (
        <>
          <input
            value={query}
            onChange={(event) => {
              const next = event.target.value;
              setQuery(next);
              look(next);
            }}
            placeholder="Titre, artiste…"
            aria-label="Rechercher un titre"
            className="mt-4 w-full min-w-0 rounded-2xl border border-line bg-paper px-4 py-3 text-base outline-none"
          />
          <div className="mt-3 flex min-w-0 max-w-full gap-2 overflow-x-auto pb-1">
            {MUSIC_MOMENTS.map((value) => (
              <button
                key={value}
                type="button"
                className={value === moment ? "auth-chip auth-chip-on shrink-0" : "auth-chip shrink-0"}
                onClick={() => setMoment(value)}
              >
                {musicMomentLabel(value)}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {problem ? (
        <div className="mt-4">
          <Alert>{problem}</Alert>
        </div>
      ) : null}
      {note ? (
        <div className="mt-4">
          <Alert tone="success">{note}</Alert>
        </div>
      ) : null}
      {canEdit && asked ? (
        <ul className="mt-4 grid min-w-0 gap-2">
          {tracks.length === 0 && !problem ? <li className="text-sm text-muted">Aucun titre ne correspond.</li> : null}
          {tracks.map((track) => (
            <li key={track.itunesId} className="min-w-0 rounded-2xl border border-line bg-paper px-3 py-3">
              <TrackRow track={track} />
              <div className="mt-3">
                <Button type="button" variant="secondary" disabled={busy === track.itunesId} onClick={() => void add(track)}>
                  {busy === track.itunesId ? "Ajout…" : `Ajouter · ${musicMomentLabel(moment)}`}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {groups.length === 0 ? <p className="mt-4 text-sm text-muted">Aucun titre pour l&apos;instant.</p> : null}
      <div className="mt-6 grid min-w-0 gap-6">
        {groups.map((group) => (
          <div key={group.moment} className="min-w-0">
            <h3 className="text-base font-semibold">{musicMomentLabel(group.moment)}</h3>
            <ul className="mt-2 grid min-w-0 gap-2">
              {group.songs.map((song) => (
                <li key={song.id} className="min-w-0 rounded-2xl border border-line bg-paper px-3 py-3">
                  <TrackRow track={song} />
                  {canEdit ? (
                    <div className="mt-3">
                      <Button type="button" variant="ghost" disabled={busy === song.id} onClick={() => void remove(song)}>
                        Retirer
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function TrackRow({ track }: { track: MusicTrack }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      {track.artworkUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={track.artworkUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="h-14 w-14 shrink-0 rounded-xl bg-ink/5" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium">{track.title}</p>
        <p className="truncate text-sm text-muted">{track.artist}</p>
        {track.album ? <p className="truncate text-sm text-muted">{track.album}</p> : null}
        {track.previewUrl ? <audio controls preload="none" src={track.previewUrl} className="mt-2 h-8 w-full max-w-full" /> : null}
        {track.appleUrl ? (
          <a href={track.appleUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm underline">
            Apple Music
          </a>
        ) : null}
      </div>
    </div>
  );
}
