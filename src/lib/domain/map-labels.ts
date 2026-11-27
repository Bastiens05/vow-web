export type LabelBox = { x: number; y: number; w: number; h: number };

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

/** Pixel offsets so nearby map labels no longer cover one another. */
export function separateLabels(items: LabelBox[], gap = 6): { x: number; y: number }[] {
  const offsets = items.map(() => ({ x: 0, y: 0 }));
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;
    for (let step = 0; step < 24; step++) {
      const box = placedBox(item, offsets[i] ?? { x: 0, y: 0 });
      const hit = offsets.slice(0, i).some((offset, j) => {
        const other = items[j];
        return other ? overlaps(box, placedBox(other, offset), gap) : false;
      });
      if (!hit) break;
      const current = offsets[i] ?? { x: 0, y: 0 };
      offsets[i] = {
        x: current.x + (step % 2 === 0 ? 0 : (step % 4 === 1 ? 1 : -1) * Math.ceil(item.w * 0.45)),
        y: current.y + item.h + gap,
      };
    }
  }
  return offsets;
}
