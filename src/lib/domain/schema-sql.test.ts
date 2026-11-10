import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const files = readdirSync("supabase/migrations").filter((name) => name.endsWith(".sql")).sort();
const sql = files.map((name) => readFileSync(`supabase/migrations/${name}`, "utf8")).join("\n");

describe("migration", () => {
  it("enables row level security on every public table", () => {
    const tables = [...sql.matchAll(/create table public\.(\w+)/g)].map((match) => match[1]);
    expect(tables).toEqual([
      "profiles",
      "vendor_profiles",
      "vendor_offers",
      "vendor_photos",
      "weddings",
      "wedding_members",
      "invitations",
      "messages",
      "documents",
      "timeline_slots",
      "timeline_comments",
      "wedding_practical",
      "photo_groups",
      "guests",
      "wedding_notifications",
      "notification_reads",
      "push_subscriptions",
      "timeline_suggestions",
      "timeline_templates",
      "leads",
      "reminders",
      "signature_requests",
    ]);
    for (const table of tables) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("creates both storage buckets and member-only document policies", () => {
    expect(sql).toContain("'vendor-media'");
    expect(sql).toContain("'wedding-documents'");
    expect(sql).toContain("wedding_documents_select");
    expect(sql).toContain("is_wedding_member");
  });

  it("does not embed a shared access code", () => {
    expect(sql.toLowerCase()).not.toContain("access_code");
    expect(sql).not.toMatch(/password\s+text/i);
  });
});
