import { describe, expect, it } from "vitest";
import { dueReminderKinds, reminderKindLabel, reminderMilestone } from "./reminders";

describe("reminderMilestone", () => {
  it("maps the approach windows", () => {
    expect(reminderMilestone(60)).toBe(60);
    expect(reminderMilestone(30)).toBe(30);
    expect(reminderMilestone(14)).toBe(14);
    expect(reminderMilestone(0)).toBeNull();
    expect(reminderMilestone(90)).toBeNull();
  });
});

describe("reminderKindLabel", () => {
  it("uses a French sentence instead of the storage key", () => {
    expect(reminderKindLabel("practical")).toBe("Infos pratiques à compléter");
    expect(reminderKindLabel("photos")).toBe("Groupes photo à compléter");
    expect(reminderKindLabel("unknown")).toBe("Rappel");
  });
});

describe("dueReminderKinds", () => {
  it("reminds only about sheets the booked trades use", () => {
    expect(
      dueReminderKinds({
        hasPractical: false,
        needsPhotos: true,
        hasPhotos: false,
        needsGuests: false,
        hasGuests: false,
        hasDocument: true,
        pendingSignature: false,
      }),
    ).toEqual(["practical", "photos"]);
  });
});
