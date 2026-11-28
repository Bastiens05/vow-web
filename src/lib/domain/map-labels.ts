export type LabelBox = { x: number; y: number; w: number; h: number };

export type LabelFrame = {
  width: number;
  height: number;
  /** Pixels kept clear at the bottom for the map attribution. */
  bottomInset: number;
  edge?: number;
};

function overlaps(a: LabelBox, b: LabelBox, gap: number): boolean {
  return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
}

function placedBox(origin: LabelBox, offset: { x: number; y: number }): LabelBox {
  return {
    x: origin.x + offset.x - origin.w / 2,
    y: origin.y + offset.y - origin.h / 2,
    w: origin.w,
    h: origin.h,
  };
}

function inside(box: LabelBox, frame: LabelFrame): boolean {
  const edge = frame.edge ?? 4;
  const maxX = frame.width - edge;
  const maxY = frame.height - frame.bottomInset;
  return box.x >= edge && box.y >= edge && box.x + box.w <= maxX && box.y + box.h <= maxY;
}

function clampOffset(item: LabelBox, offset: { x: number; y: number }, frame: LabelFrame): { x: number; y: number } {
  const edge = frame.edge ?? 4;
  const box = placedBox(item, offset);
  const maxX = Math.max(edge, frame.width - edge - box.w);
  const maxY = Math.max(edge, frame.height - frame.bottomInset - box.h);
  const x = Math.min(Math.max(box.x, edge), maxX);
  const y = Math.min(Math.max(box.y, edge), maxY);
  return { x: offset.x + (x - box.x), y: offset.y + (y - box.y) };
}

function hitsEarlier(box: LabelBox, items: LabelBox[], offsets: { x: number; y: number }[], index: number, gap: number): boolean {
  return offsets.slice(0, index).some((offset, otherIndex) => {
    const other = items[otherIndex];
    return other ? overlaps(box, placedBox(other, offset), gap) : false;
  });
}

/** Pixel offsets so labels stay readable, inside the map, and clear of the attribution. */
export function separateLabels(items: LabelBox[], frame?: LabelFrame, gap = 6): { x: number; y: number }[] {
  const offsets = items.map(() => ({ x: 0, y: 0 }));
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    let chosen = frame ? clampOffset(item, { x: 0, y: 0 }, frame) : { x: 0, y: 0 };
    const limit = frame ? Math.max(frame.width, frame.height) : 240;
    let found = false;
    for (let radius = 0; radius <= limit && !found; radius += 8) {
      const samples = radius === 0 ? [{ x: 0, y: 0 }] : ring(radius);
      for (const raw of samples) {
        const candidate = frame ? clampOffset(item, raw, frame) : raw;
        const box = placedBox(item, candidate);
        if (frame && !inside(box, frame)) continue;
        if (hitsEarlier(box, items, offsets, i, gap)) continue;
        chosen = candidate;
        found = true;
        break;
      }
    }
    offsets[i] = chosen;
  }
  return offsets;
}

function ring(radius: number): { x: number; y: number }[] {
  return [
    { x: radius, y: 0 },
    { x: -radius, y: 0 },
    { x: 0, y: -radius },
    { x: 0, y: radius },
    { x: radius, y: -radius },
    { x: -radius, y: -radius },
    { x: radius, y: radius },
    { x: -radius, y: radius },
  ];
}

export type ProjectedMoment = { x: number; y: number; label: string };

export type MomentCluster = { x: number; y: number; labels: string[] };

/** Moments whose pins sit on top of each other become one cluster. */
export function clusterMoments(items: ProjectedMoment[], radius = 56): MomentCluster[] {
  const groups: MomentCluster[] = items.map((item) => ({ x: item.x, y: item.y, labels: [item.label] }));
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < groups.length; i++) {
      const left = groups[i];
      if (!left) continue;
      for (let j = i + 1; j < groups.length; j++) {
        const right = groups[j];
        if (!right) continue;
        const dx = left.x - right.x;
        const dy = left.y - right.y;
        if (dx * dx + dy * dy > radius * radius) continue;
        const count = left.labels.length + right.labels.length;
        groups[i] = {
          x: (left.x * left.labels.length + right.x * right.labels.length) / count,
          y: (left.y * left.labels.length + right.y * right.labels.length) / count,
          labels: [...left.labels, ...right.labels],
        };
        groups.splice(j, 1);
        merged = true;
        break;
      }
      if (merged) break;
    }
  }
  return groups;
}

/** A badge wider than the map wraps onto extra lines so the text stays in the rectangle. */
export function badgeSize(label: string, frame: LabelFrame): { w: number; h: number } {
  const edge = frame.edge ?? 4;
  const maxW = Math.max(72, frame.width - edge * 2);
  const natural = Math.max(72, label.length * 7 + 20);
  if (natural <= maxW) return { w: natural, h: 28 };
  const lines = Math.min(3, Math.ceil(natural / maxW));
  return { w: maxW, h: 28 * lines };
}
