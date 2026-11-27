import { describe, expect, it } from "vitest";
import { joinNoticeVisible } from "./notices";

describe("join notices", () => {
  it("shows the couple joining only to a vendor who was already there", () => {
    expect(
      joinNoticeVisible({
        body: "Le couple a rejoint le mariage.",
        authorId: "couple",
        viewerId: "vendor",
        viewerRole: "vendor",
        noticeAt: "2026-11-26T12:00:00Z",
        membershipAt: "2026-11-01T12:00:00Z",
      }),
    ).toBe(true);
    expect(
      joinNoticeVisible({
        body: "Le couple a rejoint le mariage.",
        authorId: "couple",
        viewerId: "vendor",
        viewerRole: "vendor",
        noticeAt: "2026-11-01T12:00:00Z",
        membershipAt: "2026-11-26T12:00:00Z",
      }),
    ).toBe(false);
    expect(
      joinNoticeVisible({
        body: "Le couple a rejoint le mariage.",
        authorId: "couple",
        viewerId: "partner",
        viewerRole: "couple",
        noticeAt: "2026-11-26T12:00:00Z",
        membershipAt: "2026-11-01T12:00:00Z",
      }),
    ).toBe(false);
  });

  it("shows a vendor joining to the couple, not to the vendor who joined", () => {
    expect(
      joinNoticeVisible({
        body: "Studio Test a rejoint le mariage.",
        authorId: "vendor",
        viewerId: "couple",
        viewerRole: "couple",
        noticeAt: "2026-11-26T12:00:00Z",
        membershipAt: "2026-11-01T12:00:00Z",
      }),
    ).toBe(true);
    expect(
      joinNoticeVisible({
        body: "Studio Test a rejoint le mariage.",
        authorId: "vendor",
        viewerId: "vendor",
        viewerRole: "vendor",
        noticeAt: "2026-11-26T12:00:00Z",
        membershipAt: "2026-11-26T12:00:00Z",
      }),
    ).toBe(false);
  });
});
