import { describe, expect, it } from "vitest";
import { messagesToMarkRead, threadHasUnread, unreadMessageCount } from "./message-reads";

const viewer = "couple-1";
const vendor = "vendor-1";
const otherVendor = "vendor-2";

const messages = [
  { id: "m1", authorId: vendor, vendorUserId: vendor },
  { id: "m2", authorId: viewer, vendorUserId: vendor },
  { id: "m3", authorId: otherVendor, vendorUserId: otherVendor },
];

describe("lectures de messages", () => {
  it("compte non lu tant que le message de l'autre n'est pas ouvert", () => {
    const read = new Set<string>();
    expect(unreadMessageCount(messages, viewer, read)).toBe(2);
    expect(threadHasUnread(messages, vendor, viewer, read)).toBe(true);
    expect(threadHasUnread(messages, otherVendor, viewer, read)).toBe(true);
    expect(messagesToMarkRead(messages, viewer, read)).toEqual(["m1", "m3"]);
  });

  it("marque la conversation lue pour cet utilisateur, et laisse l'autre fil", () => {
    const read = new Set(["m1"]);
    expect(messagesToMarkRead(messages.filter((message) => message.vendorUserId === vendor), viewer, read)).toEqual([]);
    expect(threadHasUnread(messages, vendor, viewer, read)).toBe(false);
    expect(threadHasUnread(messages, otherVendor, viewer, read)).toBe(true);
    expect(unreadMessageCount(messages, viewer, read)).toBe(1);
  });

  it("n'exige pas de lecture pour ses propres messages", () => {
    const own = [{ id: "mine", authorId: viewer, vendorUserId: vendor }];
    expect(unreadMessageCount(own, viewer, new Set())).toBe(0);
    expect(threadHasUnread(own, vendor, viewer, new Set())).toBe(false);
    expect(messagesToMarkRead(own, viewer, new Set())).toEqual([]);
  });
});
