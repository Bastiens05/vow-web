import { describe, expect, it } from "vitest";
import { orphanSource, relocationAllows, relocationPath, storageTail } from "./storage-move";

describe("storage move", () => {
  it("keeps the uploader and the file name when the wedding id changes", () => {
    expect(relocationPath("keep", "drop", "drop/user/file.pdf")).toBe("keep/user/file.pdf");
    expect(relocationPath("keep", "keep", "keep/user/file.pdf")).toBeNull();
    expect(storageTail("bdf5149d-0000-4000-8000-000000000001/3b591701-0000-4000-8000-000000000002/805ef713-photo.pdf")).toBe(
      "3b591701-0000-4000-8000-000000000002/805ef713-photo.pdf",
    );
  });

  it("does not treat a normal upload as a relocation", () => {
    const rows = [
      {
        bucket: "wedding-documents",
        fromPath: "drop/user/file.pdf",
        toPath: "keep/user/file.pdf",
        moved: false,
      },
    ];
    expect(relocationAllows("insert", "wedding-documents", "keep/user/new.pdf", rows, true)).toBe(false);
    expect(relocationAllows("insert", "wedding-documents", "coffre/user/piece.pdf", rows, true)).toBe(false);
    expect(relocationAllows("insert", "wedding-documents", "keep/user/file.pdf", rows, true)).toBe(true);
    expect(relocationAllows("delete", "wedding-documents", "drop/user/file.pdf", rows, true)).toBe(true);
    expect(relocationAllows("select", "wedding-documents", "keep/user/file.pdf", rows, false)).toBe(false);
  });

  it("points a renamed row at the single object that still has the old wedding id", () => {
    const target = "keep/3b591701-0000-4000-8000-000000000002/805ef713-photo.pdf";
    const orphan = "bdf5149d-0000-4000-8000-000000000001/3b591701-0000-4000-8000-000000000002/805ef713-photo.pdf";
    expect(orphanSource(target, [orphan, "other/user/note.pdf"])).toBe(orphan);
    expect(orphanSource(target, [target, orphan])).toBeNull();
    expect(orphanSource(target, [orphan, `another/${storageTail(target)}`])).toBeNull();
  });
});
