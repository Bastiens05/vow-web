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
      "assistant_usage",
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
      "wedding_briefings",
      "vendor_brief_notes",
      "briefing_listens",
      "wedding_music",
      "comp_plan_emails",
      "tester_grants",
      "grant_notices",
      "admin_notices",
      "admin_notice_reads",
      "vendor_document_templates",
      "wedding_document_requests",
      "vendor_vault_files",
      "vendor_vault_versions",
      "vendor_vault_shares",
      "message_reads",
      "vendor_billing_identity",
      "vendor_invoice_counters",
      "invoice_payments",
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

  it("lets only the couple and the planner write photo groups", () => {
    expect(sql).toContain("function public.can_compose_photo_groups(wid uuid)");
    expect(sql).toContain("policy photo_groups_insert");
    expect(sql).toContain("public.can_compose_photo_groups(wedding_id)");
    expect(sql).toContain("function public.mark_photo_group_called(p_group uuid)");
    expect(sql).toContain("security definer");
  });

  it("records a message as read for the current user only", () => {
    expect(sql).toContain("create table public.message_reads");
    expect(sql).toContain("policy message_reads_insert");
    expect(sql).toContain("user_id = auth.uid()");
    expect(sql).toContain("function public.unread_message_count()");
    expect(sql).toContain("security invoker");
  });

  it("locks invoice numbers and lets a couple read invoices addressed to them", () => {
    expect(sql).toContain("function public.assign_invoice_number()");
    expect(sql).toContain("last_number = public.vendor_invoice_counters.last_number + 1");
    expect(sql).toContain("function public.lock_issued_invoice()");
    expect(sql).toContain("raise exception 'Facture déjà émise'");
    expect(sql).toContain("function public.issue_invoice_from_quote(p_quote uuid)");
    expect(sql).toContain("policy invoice_payments_select");
    expect(sql).toContain("public.owns_vendor(vendor_id) or public.is_wedding_couple(wedding_id)");
    expect(sql).toContain("policy invoice_payments_insert");
    expect(sql).not.toContain("policy invoice_payments_update");
    expect(sql).not.toContain("policy invoice_payments_delete");
    expect(sql).toContain("policy vendor_billing_identity_all");
    expect(sql).toContain("policy vendor_invoice_counters_select");
    expect(sql).toContain("policy invoices_insert");
    expect(sql).toContain("policy invoices_update");
    expect(sql).not.toContain("policy invoices_delete");
  });

  it("lets a couple resolve a vendor on their own wedding", () => {
    expect(sql).toContain("function public.wedding_vendor_id(p_wedding uuid, p_user uuid)");
    expect(sql).toContain("public.is_wedding_couple(p_wedding)");
    expect(sql).toContain("security definer");
  });

  it("does not embed a shared access code", () => {
    expect(sql.toLowerCase()).not.toContain("access_code");
    expect(sql).not.toMatch(/password\s+text/i);
  });
});
