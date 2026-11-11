import { describe, expect, it } from "vitest";
import { coupleSteps, firstRunSteps, openSteps, vendorSteps } from "./checklist";

describe("vendorSteps", () => {
  it("points an empty account at the vitrine and a new wedding", () => {
    const open = openSteps(
      vendorSteps({
        hasProfile: false,
        published: false,
        weddingCount: 0,
        primaryWeddingId: null,
        coupleJoined: false,
        hasTimeline: false,
        hasDocument: false,
      }),
    );
    expect(open.map((step) => step.id)).toEqual(["profile", "wedding", "couple", "timeline", "document"]);
    expect(open[0]?.href).toBe("/espace/profil");
  });

  it("marks finished work done", () => {
    const open = openSteps(
      vendorSteps({
        hasProfile: true,
        published: true,
        weddingCount: 1,
        primaryWeddingId: "w1",
        coupleJoined: true,
        hasTimeline: true,
        hasDocument: true,
      }),
    );
    expect(open).toEqual([]);
  });
});

describe("firstRunSteps", () => {
  it("starts with the activity, then the first wedding, then the invitation", () => {
    const steps = firstRunSteps({ profileReady: true, weddingId: null, coupleJoined: false });
    expect(steps.map((step) => step.label)).toEqual([
      "Votre activité",
      "Créez votre premier mariage",
      "Invitez le couple",
    ]);
    expect(steps[0]?.done).toBe(true);
    expect(steps[1]?.done).toBe(false);
  });
});

describe("coupleSteps", () => {
  it("sends the couple to the practical sheet", () => {
    const steps = coupleSteps({
      primaryWeddingId: "w1",
      hasPractical: false,
      hasPhotoGroups: true,
      hasGuests: false,
    });
    expect(openSteps(steps).map((step) => step.id)).toEqual(["practical", "guests"]);
    expect(steps[0]?.href).toBe("/mariage/w1/pratique");
  });
});
