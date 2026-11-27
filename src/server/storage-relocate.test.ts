import { describe, expect, it } from "vitest";
import { applyStorageRelocations } from "./storage-relocate";

const pending = {
  id: "move-1",
  bucket_id: "wedding-documents",
  from_path: "drop-wedding/florist/photo.pdf",
  to_path: "keep-wedding/florist/photo.pdf",
};

function client(options: { moveFails?: boolean; copyFails?: boolean; sourceExists?: boolean; destExists?: boolean }) {
  const calls: string[] = [];
  const supabase = {
    rpc: async (name: string, args?: { p_id?: string; p_missing?: boolean }) => {
      calls.push(`${name}:${args?.p_missing ?? ""}`);
      if (name === "pending_storage_relocations") return { data: [pending], error: null };
      return { error: null };
    },
    storage: {
      from: () => ({
        move: async (_from: string, to: string) => {
          calls.push(`move:${to}`);
          return { error: options.moveFails ? { message: "missing" } : null };
        },
        copy: async (_from: string, to: string) => {
          calls.push(`copy:${to}`);
          return { error: options.copyFails ? { message: "missing" } : null };
        },
        remove: async (paths: string[]) => {
          calls.push(`remove:${paths[0]}`);
          return { error: null };
        },
        createSignedUrl: async (path: string) => {
          calls.push(`url:${path}`);
          const exists = path === pending.to_path ? options.destExists : options.sourceExists;
          return exists ? { data: { signedUrl: `https://files/${path}` }, error: null } : { data: null, error: { message: "NoSuchKey" } };
        },
      }),
    },
  };
  return { supabase, calls };
}

describe("applyStorageRelocations", () => {
  it("moves the object onto the path stored after the merge", async () => {
    const { supabase, calls } = client({});
    await applyStorageRelocations(supabase as never);
    expect(calls).toContain(`move:${pending.to_path}`);
    expect(calls).toContain("finish_storage_relocation:false");
  });

  it("copies then removes when move fails, and the new path is the one that downloads", async () => {
    const { supabase, calls } = client({ moveFails: true, sourceExists: true });
    await applyStorageRelocations(supabase as never);
    expect(calls).toContain(`copy:${pending.to_path}`);
    expect(calls).toContain(`remove:${pending.from_path}`);
    expect(calls).toContain("finish_storage_relocation:false");
  });
});
