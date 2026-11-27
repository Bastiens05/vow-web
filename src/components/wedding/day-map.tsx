"use client";

import { useEffect, useRef, useState } from "react";
import type { AddressSuggestion } from "@/lib/domain/address";
import { appleDirectionsTo, appleDirectionsUrl, googleDirectionsTo, googleDirectionsUrl } from "@/lib/domain/maps";
import "maplibre-gl/dist/maplibre-gl.css";

export type MapPlace = { label: string; address: string };

type Point = { label: string; longitude: number; latitude: number };
type Leg = { from: string; to: string; minutes: number };

const TILES =
  "https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}";

export function DayMap({ places }: { places: MapPlace[] }) {
  const node = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [legs, setLegs] = useState<Leg[]>([]);
  const [ready, setReady] = useState(false);
  const key = places.map((place) => `${place.label}|${place.address}`).join("\n");

  useEffect(() => {
    let cancel = false;
    void (async () => {
      const resolved: Point[] = [];
      for (const place of places) {
        const address = place.address.trim();
        if (address.length < 3) continue;
        const response = await fetch(`/api/address?q=${encodeURIComponent(address)}`);
        if (!response.ok) continue;
        const body = (await response.json()) as { suggestions?: AddressSuggestion[] };
        const first = body.suggestions?.[0];
        if (!first) continue;
        resolved.push({ label: place.label, longitude: first.longitude, latitude: first.latitude });
      }
      const nextLegs: Leg[] = [];
      for (let index = 1; index < resolved.length; index += 1) {
        const from = resolved[index - 1];
        const to = resolved[index];
        if (!from || !to) continue;
        const response = await fetch(`/api/itineraire?start=${from.longitude},${from.latitude}&end=${to.longitude},${to.latitude}`);
        if (!response.ok) continue;
        const body = (await response.json()) as { minutes?: number | null };
        if (typeof body.minutes === "number") nextLegs.push({ from: from.label, to: to.label, minutes: body.minutes });
      }
      if (cancel) return;
      setPoints(resolved);
      setLegs(nextLegs);
      setReady(true);
    })();
    return () => {
      cancel = true;
    };
  }, [key, places]);

  useEffect(() => {
    if (!node.current || points.length === 0) return;
    let map: { remove: () => void } | null = null;
    let cancel = false;
    void import("maplibre-gl").then((maplibre) => {
      if (cancel || !node.current) return;
      maplibre.setWorkerUrl(`${window.location.origin}/maplibre-gl-worker.mjs`);
      const created = new maplibre.Map({
        container: node.current,
        style: {
          version: 8,
          sources: {
            ign: { type: "raster", tiles: [TILES], tileSize: 256, attribution: "© IGN" },
          },
          layers: [{ id: "ign", type: "raster", source: "ign" }],
        },
        center: [points[0]!.longitude, points[0]!.latitude],
        zoom: 13,
      });
      const bounds = new maplibre.LngLatBounds();
      for (const point of points) {
        const label = document.createElement("div");
        label.textContent = point.label;
        label.className = "rounded-full bg-ink px-2 py-1 text-xs font-medium text-ivory shadow";
        new maplibre.Marker({ element: label }).setLngLat([point.longitude, point.latitude]).addTo(created);
        bounds.extend([point.longitude, point.latitude]);
      }
      if (points.length > 1) created.fitBounds(bounds, { padding: 48, maxZoom: 15 });
      map = created;
    });
    return () => {
      cancel = true;
      map?.remove();
    };
  }, [points]);

  if (places.every((place) => place.address.trim().length < 3)) {
    return <p className="text-sm text-muted">Ajoutez une adresse pour afficher la carte et les temps de trajet.</p>;
  }
  return (
    <div className="grid gap-3">
      <div ref={node} className="h-72 w-full overflow-hidden rounded-2xl bg-mist" />
      {ready && points.length === 0 ? <p className="text-sm text-muted">Ces adresses n&apos;ont pas été trouvées.</p> : null}
      <ul className="grid gap-2">
        {places.filter((place) => place.address.trim().length > 2).map((place, index, list) => {
          const previous = list[index - 1];
          const google = previous ? googleDirectionsUrl(previous.address, place.address) : googleDirectionsTo(place.address);
          const plans = previous ? appleDirectionsUrl(previous.address, place.address) : appleDirectionsTo(place.address);
          return (
            <li key={`${place.label}-${place.address}`} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{place.label}</span>
              <a className="underline" href={google} target="_blank" rel="noreferrer">Itinéraire · Google Maps</a>
              <a className="underline" href={plans} target="_blank" rel="noreferrer">Itinéraire · Plans</a>
            </li>
          );
        })}
      </ul>
      {legs.length > 0 ? (
        <ul className="grid gap-1 text-sm text-muted">
          {legs.map((leg) => (
            <li key={`${leg.from}-${leg.to}`}>
              {leg.from} → {leg.to} · {leg.minutes} min en voiture
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
