import { describe, expect, it } from "vitest";
import { musicMomentLabel, tracksFromItunes } from "./music";

describe("iTunes tracks", () => {
  it("keeps a song and drops a result that is not a track", () => {
    const tracks = tracksFromItunes({
      results: [
        {
          trackId: 123,
          trackName: "La vie en rose",
          artistName: "Édith Piaf",
          collectionName: "Best of",
          artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/100x100bb.jpg",
          previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/preview.m4a",
          trackViewUrl: "https://music.apple.com/fr/album/la-vie-en-rose/123",
        },
        { collectionName: "Album only" },
        {
          trackId: 9,
          trackName: "Script",
          artistName: "X",
          artworkUrl100: "http://evil.example/cover.jpg",
          previewUrl: "javascript:alert(1)",
          trackViewUrl: "https://example.com/song",
        },
      ],
    });
    expect(tracks).toHaveLength(2);
    expect(tracks[0]).toMatchObject({
      itunesId: "123",
      title: "La vie en rose",
      artist: "Édith Piaf",
      artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/200x200bb.jpg",
      previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/preview.m4a",
      appleUrl: "https://music.apple.com/fr/album/la-vie-en-rose/123",
    });
    expect(tracks[1].artworkUrl).toBe("");
    expect(tracks[1].previewUrl).toBe("");
    expect(tracks[1].appleUrl).toBe("");
  });

  it("names the first dance", () => {
    expect(musicMomentLabel("first_dance")).toBe("Première danse");
  });
});
