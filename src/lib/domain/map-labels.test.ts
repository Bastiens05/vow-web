import { describe, expect, it } from "vitest";
import { badgeSize, clusterMoments, separateLabels, type LabelBox } from "./map-labels";

function covers(a: LabelBox, b: LabelBox): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

describe("map labels", () => {
  it("shifts labels that overlap by a few pixels", () => {
    const photos = { x: 200, y: 120, w: 72, h: 24 };
    const dessert = { x: 211, y: 132, w: 78, h: 24 };
    const [photoOffset, dessertOffset] = separateLabels([photos, dessert]);
    const photoBox = {
      x: photos.x + (photoOffset?.x ?? 0) - photos.w / 2,
      y: photos.y + (photoOffset?.y ?? 0) - photos.h / 2,
      w: photos.w,
      h: photos.h,
    };
    const dessertBox = {
      x: dessert.x + (dessertOffset?.x ?? 0) - dessert.w / 2,
      y: dessert.y + (dessertOffset?.y ?? 0) - dessert.h / 2,
      w: dessert.w,
      h: dessert.h,
    };
    expect(covers(photoBox, dessertBox)).toBe(false);
  });

  it("keeps a low label inside the frame and above the attribution", () => {
    const frame = { width: 320, height: 502, bottomInset: 36, edge: 4 };
    const session = { x: 160, y: 490, w: 120, h: 24 };
    const [offset] = separateLabels([session], frame);
    const box = {
      x: session.x + (offset?.x ?? 0) - session.w / 2,
      y: session.y + (offset?.y ?? 0) - session.h / 2,
      w: session.w,
      h: session.h,
    };
    expect(box.x).toBeGreaterThanOrEqual(4);
    expect(box.y).toBeGreaterThanOrEqual(4);
    expect(box.x + box.w).toBeLessThanOrEqual(316);
    expect(box.y + box.h).toBeLessThanOrEqual(502 - 36);
  });

  it("keeps ceremony, drinks and dessert inside a phone map", () => {
    const frame = { width: 320, height: 288, bottomInset: 36, edge: 6 };
    const labels = ["Cérémonie", "Vin d'honneur", "Dessert"];
    const boxes = labels.map((label, index) => {
      const size = badgeSize(label, frame);
      return { x: 28 + index * 6, y: 36 + index * 4, w: size.w, h: size.h };
    });
    const offsets = separateLabels(boxes, frame);
    const placed = boxes.map((box, index) => ({
      x: box.x + (offsets[index]?.x ?? 0) - box.w / 2,
      y: box.y + (offsets[index]?.y ?? 0) - box.h / 2,
      w: box.w,
      h: box.h,
    }));
    for (const box of placed) {
      expect(box.x).toBeGreaterThanOrEqual(6);
      expect(box.y).toBeGreaterThanOrEqual(6);
      expect(box.x + box.w).toBeLessThanOrEqual(314);
      expect(box.y + box.h).toBeLessThanOrEqual(288 - 36);
    }
  });

  it("groups moments that share a pin, and splits them once the map is zoomed", () => {
    const close = clusterMoments([
      { x: 40, y: 50, label: "Cérémonie" },
      { x: 44, y: 58, label: "Vin d'honneur" },
      { x: 36, y: 46, label: "Dessert" },
    ]);
    expect(close).toHaveLength(1);
    expect(close[0]?.labels).toEqual(["Cérémonie", "Vin d'honneur", "Dessert"]);
    const zoomed = clusterMoments([
      { x: 40, y: 40, label: "Cérémonie" },
      { x: 220, y: 40, label: "Vin d'honneur" },
      { x: 40, y: 200, label: "Dessert" },
    ]);
    expect(zoomed).toHaveLength(3);
  });

  it("leaves distant labels where they are", () => {
    expect(separateLabels([
      { x: 10, y: 10, w: 40, h: 20 },
      { x: 200, y: 200, w: 40, h: 20 },
    ])).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]);
  });
});