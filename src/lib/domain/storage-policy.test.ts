import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const applied = readFileSync("supabase/migrations/20261127070957_vault_read_storage_move.sql", "utf8");
const access = readFileSync("supabase/migrations/20261127074004_storage_relocation_access.sql", "utf8");
const init = readFileSync("supabase/migrations/20261110180806_init.sql", "utf8");
const vault = readFileSync("supabase/migrations/20261113004031_vendor_vault.sql", "utf8");

function policyBody(sql: string, name: string): string {
  const match = sql.match(new RegExp(`create policy ${name} on storage\\.objects[\\s\\S]*?(?=\\n\\n|\\ndrop policy|\\ncreate |$)`));
  return match?.[0] ?? "";
}

describe("storage upload policies", () => {
  it("keeps the applied migration without the policies that blocked every upload", () => {
    expect(applied).not.toContain("create policy wedding_documents_relocate_select");
    expect(applied).not.toContain("create policy wedding_documents_relocate_insert");
    expect(applied).not.toContain("create policy wedding_gallery_relocate_delete");
    expect(applied).toContain("permission denied for table storage_relocations");
  });

  it("lets a normal wedding document and a coffre file through the existing policies", () => {
    const documentInsert = policyBody(init, "wedding_documents_insert");
    const coffre = policyBody(vault, "vendor_vault_objects_owner");
    expect(documentInsert).toContain("public.is_wedding_member");
    expect(documentInsert).not.toContain("storage_relocations");
    expect(coffre).toContain("(storage.foldername(name))[1] = 'coffre'");
    expect(coffre).not.toContain("storage_relocations");
  });

  it("recreates the six move policies through a security definer function", () => {
    expect(access).toContain("function public.storage_relocation_allows(p_bucket text, p_name text, p_op text)");
    expect(access).toContain("security definer");
    expect(access).toContain("set search_path = public");
    for (const name of [
      "wedding_documents_relocate_select",
      "wedding_documents_relocate_insert",
      "wedding_documents_relocate_delete",
      "wedding_gallery_relocate_select",
      "wedding_gallery_relocate_insert",
      "wedding_gallery_relocate_delete",
    ]) {
      const body = policyBody(access, name);
      expect(body).toContain("public.storage_relocation_allows");
      expect(body).not.toContain("storage_relocations");
    }
    expect(access).toContain("from public.documents d");
    expect(access).toContain("perform public.record_storage_relocation");
  });
});
