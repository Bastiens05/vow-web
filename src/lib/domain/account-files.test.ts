import { describe, expect, it } from "vitest";
import { groupStoragePaths } from "./account-files";

describe("groupStoragePaths", () => {
  it("groups a user's files by bucket and drops duplicates", () => {
    const grouped = groupStoragePaths([
      { bucket: "wedding-documents", path: "wed/user/a.pdf" },
      { bucket: "wedding-documents", path: "wed/user/a.pdf" },
      { bucket: " vendor-media ", path: " user/logo.png " },
      { bucket: "", path: "skip" },
    ]);
    expect(grouped.get("wedding-documents")).toEqual(["wed/user/a.pdf"]);
    expect(grouped.get("vendor-media")).toEqual(["user/logo.png"]);
    expect(grouped.has("")).toBe(false);
  });
});
