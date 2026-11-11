import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const files = readdirSync("supabase/migrations").filter((name) => name.endsWith(".sql")).sort();
const sql = files.map((name) => readFileSync(`supabase/migrations/${name}`, "utf8")).join("\n");

describe("migration", () => {
  it("enables row level security on every public table", () => {
    const tables = [...sql.matchAll(/create table(?: if not exists)? public\.(\w+)/g)].map((match) => match[1]);
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
      "quotes",
      "invoices",
      "deposits",
      "reviews",
      "questionnaires",
      "questionnaire_items",
      "wedding_stops",
      "deliveries",
      "delivery_files",
      "mail_outbox",
      "vendor_members",
      "vendor_team_invites",
      "availability_rules",
      "appointments",
      "rsvp_pages",
      "rsvp_answers",
      "seating_tables",
      "seating_assignments",
      "wedding_budgets",
      "budget_lines",
      "wedding_sites",
      "calendar_feeds",
      "timeline_assignees",
      "timeline_ready",
      "rain_plans",
      "rain_stops",
      "rain_slots",
      "technical_needs",
      "venue_limits",
      "weather_settings",
      "weather_checks",
      "recommendations",
      "recommendation_events",
      "admin_emails",
      "admins",
      "vendor_billing",
      "tester_codes",
      "tester_redemptions",
      "vault_items",
      "vault_shares",
      "wedding_profile",
      "profile_field_access",
      "quote_intakes",
      "brief_sends",
      "payment_installments",
      "wedding_time_entries",
      "cashflow_snapshots",
      "vendor_cash_settings",
      "cash_notices",
      "tech_templates",
      "wedding_tech",
      "venue_capabilities",
      "tech_issues",
      "crew_members",
      "crew_assignments",
      "delivery_tracks",
      "vendor_credentials",
      "credential_shares",
      "credential_links",
      "proven_references",
      "anniversary_templates",
      "anniversary_queue",
      "marketing_optouts",
      "wedding_music",
    ]);
    for (const table of tables) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("creates both storage buckets and member-only document policies", () => {
    expect(sql).toContain("'vendor-media'");
    expect(sql).toContain("'wedding-documents'");
    expect(sql).toContain("'wedding-gallery'");
    expect(sql).toContain("wedding_documents_select");
    expect(sql).toContain("is_wedding_member");
  });

  it("does not embed a shared access code", () => {
    expect(sql.toLowerCase()).not.toContain("access_code");
    expect(sql).not.toMatch(/password\s+text/i);
  });
});
