"use client";

import { useEffect, useRef, useState } from "react";
import type { AddressSuggestion } from "@/lib/domain/address";
import { badgeSize, clusterMoments, separateLabels } from "@/lib/domain/map-labels";
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
  const [moments, setMoments] = useState<string[] | null>(null);
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
    let frame = 0;
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
      for (const point of points) bounds.extend([point.longitude, point.latitude]);
      const markers: { remove: () => void; getElement: () => HTMLElement; getOffset: () => { x: number; y: number } | [number, number]; setOffset: (offset: [number, number]) => void }[] = [];
      const spread = () => {
        for (const marker of markers) marker.remove();
        markers.length = 0;
        const canvas = created.getContainer();
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (width < 32 || height < 32) return;
        const attribution = canvas.querySelector(".maplibregl-ctrl-attrib");
        const bottomInset = Math.ceil((attribution?.getBoundingClientRect().height ?? 24) + 10);
        const labelFrame = { width, height, bottomInset, edge: 6 };
        const groups = clusterMoments(points.map((point) => {
          const projected = created.project([point.longitude, point.latitude]);
          return { x: projected.x, y: projected.y, label: point.label };
        }));
        const boxes = groups.map((group) => {
          const text = group.labels.length > 1 ? `${group.labels.length} moments` : (group.labels[0] ?? "");
          const size = badgeSize(text, labelFrame);
          return { x: group.x, y: group.y, w: size.w, h: size.h };
        });
        const offsets = separateLabels(boxes, labelFrame);
        groups.forEach((group, index) => {
          const text = group.labels.length > 1 ? `${group.labels.length} moments` : (group.labels[0] ?? "");
          const size = boxes[index];
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = text;
          button.className = "rounded-full bg-ink px-2 py-1 text-center text-xs font-medium leading-4 text-ivory shadow";
          button.style.width = `${size?.w ?? 72}px`;
          button.style.whiteSpace = "normal";
          if (group.labels.length > 1) {
            button.setAttribute("aria-expanded", "false");
            button.setAttribute("aria-label", `${text}. ${group.labels.join(", ")}`);
            button.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              setMoments(group.labels);
            });
          }
          const lngLat = created.unproject([group.x, group.y]);
          const offset = offsets[index] ?? { x: 0, y: 0 };
          const marker = new maplibre.Marker({ element: button, anchor: "center" }).setLngLat(lngLat).setOffset([offset.x, offset.y]).addTo(created);
          markers.push(marker);
        });
        const container = canvas.getBoundingClientRect();
        for (const marker of markers) {
          const rect = marker.getElement().getBoundingClientRect();
          let dx = 0;
          let dy = 0;
          if (rect.left < container.left + 6) dx = container.left + 6 - rect.left;
          else if (rect.right > container.right - 6) dx = container.right - 6 - rect.right;
          if (rect.top < container.top + 6) dy = container.top + 6 - rect.top;
          else if (rect.bottom > container.bottom - bottomInset) dy = container.bottom - bottomInset - rect.bottom;
          if (!dx && !dy) continue;
          const current = marker.getOffset();
          const x = Array.isArray(current) ? current[0] : current.x;
          const y = Array.isArray(current) ? current[1] : current.y;
          marker.setOffset([x + dx, y + dy]);
        }
      };
      const schedule = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(spread);
      };
      if (points.length > 1) created.fitBounds(bounds, { padding: { top: 48, bottom: 72, left: 28, right: 28 }, maxZoom: 15 });
      created.on("move", schedule);
      created.once("idle", spread);
      map = created;
    });
    return () => {
      cancel = true;
      cancelAnimationFrame(frame);
      map?.remove();
    };
  }, [points]);

  if (places.every((place) => place.address.trim().length < 3)) {
    return <p className="text-sm text-muted">Ajoutez une adresse pour afficher la carte et les temps de trajet.</p>;
  }
  return (
    <div className="grid gap-3">
      <div ref={node} className="h-72 w-full overflow-hidden rounded-2xl bg-mist" />
      {moments && moments.length > 1 ? (
        <ul className="grid gap-1 rounded-2xl border border-line bg-paper px-4 py-3 text-sm" aria-label="Moments à ce repère">
          {moments.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      ) : null}
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
