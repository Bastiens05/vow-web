import { describe, expect, it } from "vitest";
import { separateLabels, type LabelBox } from "./map-labels";

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