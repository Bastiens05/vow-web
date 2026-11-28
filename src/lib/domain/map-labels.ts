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

/** Pixel offsets so labels stay readable, inside the map, and clear of the attribution. */
export function separateLabels(items: LabelBox[], frame?: LabelFrame, gap = 6): { x: number; y: number }[] {
  const offsets = items.map(() => ({ x: 0, y: 0 }));
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    let chosen = frame ? clampOffset(item, { x: 0, y: 0 }, frame) : { x: 0, y: 0 };
    for (let step = 0; step < 24; step++) {
      const raw = step === 0
        ? { x: 0, y: 0 }
        : {
            x: (step % 2 === 0 ? 1 : -1) * Math.ceil(step / 2) * Math.max(12, Math.round(item.w * 0.35)),
            y: (step % 3 === 0 ? -1 : 1) * Math.ceil(step / 3) * (item.h + gap),
          };
      const candidate = frame ? clampOffset(item, raw, frame) : raw;
      const box = placedBox(item, candidate);
      if (frame && !inside(box, frame)) continue;
      const hit = offsets.slice(0, i).some((offset, j) => {
        const other = items[j];
        return other ? overlaps(box, placedBox(other, offset), gap) : false;
      });
      if (!hit) {
        chosen = candidate;
        break;
      }
    }
    offsets[i] = chosen;
  }
  return offsets;
}
