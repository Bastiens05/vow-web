export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = "vendor" | "couple";

export type VendorCategory =
  | "photographer"
  | "videographer"
  | "dj"
  | "florist"
  | "caterer"
  | "venue"
  | "planner"
  | "beauty"
  | "officiant"
  | "other";

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        {
          id: string;
          role: AppRole;
          full_name: string;
          email: string;
          notify_in_app: boolean;
          notify_push: boolean;
          notify_email: boolean;
          notify_reminders: boolean;
          email_token: string;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          role: AppRole;
          full_name?: string;
          email?: string;
          notify_in_app?: boolean;
          notify_push?: boolean;
          notify_email?: boolean;
          notify_reminders?: boolean;
          email_token?: string;
          created_at?: string;
          updated_at?: string;
        },
        {
          full_name?: string;
          notify_in_app?: boolean;
          notify_push?: boolean;
          notify_email?: boolean;
          notify_reminders?: boolean;
          updated_at?: string;
        }
      >;
      vendor_profiles: Table<
        {
          id: string;
          user_id: string;
          business_name: string;
          slug: string;
          category: VendorCategory;
          city: string;
          zone: string;
          description: string;
          contact_email: string;
          contact_phone: string;
          website: string;
          instagram: string;
          weddings_per_year: string;
          starting_price_cents: number | null;
          currency: string;
          published: boolean;
          logo_path: string | null;
          share_phone: boolean;
          share_email: boolean;
          stripe_account_id: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          business_name: string;
          slug: string;
          category: VendorCategory;
          city?: string;
          zone?: string;
          description?: string;
          contact_email?: string;
          contact_phone?: string;
          website?: string;
          instagram?: string;
          weddings_per_year?: string;
          starting_price_cents?: number | null;
          currency?: string;
          published?: boolean;
        },
        {
          business_name?: string;
          slug?: string;
          category?: VendorCategory;
          logo_path?: string | null;
          share_phone?: boolean;
          share_email?: boolean;
          stripe_account_id?: string | null;
          city?: string;
          zone?: string;
          description?: string;
          contact_email?: string;
          contact_phone?: string;
          website?: string;
          instagram?: string;
          weddings_per_year?: string;
          starting_price_cents?: number | null;
          currency?: string;
          published?: boolean;
        }
      >;
      vendor_offers: Table<
        {
          id: string;
          vendor_id: string;
          title: string;
          description: string;
          price_cents: number | null;
          sort_order: number;
          created_at: string;
        },
        {
          id?: string;
          vendor_id: string;
          title: string;
          description?: string;
          price_cents?: number | null;
          sort_order?: number;
        },
        { title?: string; description?: string; price_cents?: number | null; sort_order?: number }
      >;
      vendor_photos: Table<
        {
          id: string;
          vendor_id: string;
          storage_path: string;
          caption: string;
          sort_order: number;
          created_at: string;
        },
        {
          id?: string;
          vendor_id: string;
          storage_path: string;
          caption?: string;
          sort_order?: number;
        },
        { caption?: string; sort_order?: number }
      >;
      weddings: Table<
        {
          id: string;
          created_by: string;
          partner_one_name: string;
          partner_two_name: string;
          wedding_date: string;
          venue_name: string;
          venue_city: string;
          is_demo: boolean;
          couple_preview: boolean;
          reminders_enabled: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          created_by: string;
          partner_one_name: string;
          partner_two_name: string;
          wedding_date: string;
          venue_name?: string;
          venue_city?: string;
          reminders_enabled?: boolean;
        },
        {
          partner_one_name?: string;
          partner_two_name?: string;
          wedding_date?: string;
          venue_name?: string;
          venue_city?: string;
          reminders_enabled?: boolean;
        }
      >;
      wedding_members: Table<
        {
          id: string;
          wedding_id: string;
          user_id: string;
          member_role: AppRole;
          created_at: string;
        },
        { id?: string; wedding_id: string; user_id: string; member_role: AppRole },
        { member_role?: AppRole }
      >;
      invitations: Table<
        {
          id: string;
          wedding_id: string;
          email: string;
          token: string;
          invited_role: AppRole;
          invited_by: string;
          expires_at: string;
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
        },
        {
          id?: string;
          wedding_id: string;
          email: string;
          token: string;
          invited_role: AppRole;
          invited_by: string;
          expires_at: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
        },
        { accepted_at?: string | null; accepted_by?: string | null }
      >;
      messages: Table<
        { id: string; wedding_id: string; author_id: string; vendor_user_id: string | null; body: string; created_at: string },
        { id?: string; wedding_id: string; author_id: string; vendor_user_id?: string | null; body: string },
        { body?: string }
      >;
      documents: Table<
        {
          id: string;
          wedding_id: string;
          uploaded_by: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          created_at: string;
        },
        {
          id?: string;
          wedding_id: string;
          uploaded_by: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
        },
        { file_name?: string }
      >;
      timeline_slots: Table<
        {
          id: string;
          wedding_id: string;
          title: string;
          starts_at: string;
          place: string;
          notes: string;
          sort_order: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          wedding_id: string;
          title: string;
          starts_at: string;
          place?: string;
          notes?: string;
          sort_order?: number;
          created_by: string;
        },
        { title?: string; starts_at?: string; place?: string; notes?: string; sort_order?: number }
      >;
      timeline_comments: Table<
        { id: string; slot_id: string; author_id: string; body: string; created_at: string },
        { id?: string; slot_id: string; author_id: string; body: string },
        { body?: string }
      >;
      wedding_music: Table<
        { wedding_id: string; notes: string },
        { wedding_id: string; notes?: string },
        { notes?: string }
      >;
      wedding_practical: Table<
        {
          wedding_id: string;
          partner_one_phone: string;
          partner_two_phone: string;
          postal_address: string;
          ceremony_address: string;
          reception_address: string;
          key_contacts: string;
          notes: string;
          updated_at: string;
        },
        {
          wedding_id: string;
          partner_one_phone?: string;
          partner_two_phone?: string;
          postal_address?: string;
          ceremony_address?: string;
          reception_address?: string;
          key_contacts?: string;
          notes?: string;
        },
        {
          partner_one_phone?: string;
          partner_two_phone?: string;
          postal_address?: string;
          ceremony_address?: string;
          reception_address?: string;
          key_contacts?: string;
          notes?: string;
        }
      >;
      photo_groups: Table<
        {
          id: string;
          wedding_id: string;
          title: string;
          people: string;
          notes: string;
          sort_order: number;
          created_at: string;
          called_at: string | null;
          place: string;
        },
        { id?: string; wedding_id: string; title: string; people?: string; notes?: string; sort_order?: number; called_at?: string | null; place?: string },
        { title?: string; people?: string; notes?: string; sort_order?: number; called_at?: string | null; place?: string }
      >;
      guests: Table<
        {
          id: string;
          wedding_id: string;
          full_name: string;
          table_label: string;
          dietary: string;
          notes: string;
          sort_order: number;
          created_at: string;
        },
        {
          id?: string;
          wedding_id: string;
          full_name: string;
          table_label?: string;
          dietary?: string;
          notes?: string;
          sort_order?: number;
        },
        { full_name?: string; table_label?: string; dietary?: string; notes?: string; sort_order?: number }
      >;
      wedding_notifications: Table<
        {
          id: string;
          wedding_id: string;
          author_id: string;
          kind: string;
          body: string;
          created_at: string;
        },
        {
          id?: string;
          wedding_id: string;
          author_id: string;
          kind: string;
          body: string;
        },
        { body?: string }
      >;
      notification_reads: Table<
        { notification_id: string; user_id: string; read_at: string },
        { notification_id: string; user_id: string; read_at?: string },
        { read_at?: string }
      >;
      push_subscriptions: Table<
        { id: string; user_id: string; endpoint: string; p256dh: string; auth_secret: string; created_at: string },
        { id?: string; user_id: string; endpoint: string; p256dh: string; auth_secret: string },
        { endpoint?: string }
      >;
      timeline_suggestions: Table<
        {
          id: string;
          wedding_id: string;
          author_id: string;
          label: string;
          slots: Json;
          created_at: string;
        },
        { wedding_id: string; author_id: string; label: string; slots: Json },
        Record<string, never>
      >;
      timeline_templates: Table<
        { id: string; user_id: string; name: string; slots: Json; created_at: string },
        { id?: string; user_id: string; name: string; slots: Json },
        { name?: string; slots?: Json }
      >;
      leads: Table<
        {
          id: string;
          vendor_id: string;
          full_names: string;
          email: string;
          phone: string;
          wedding_date: string | null;
          place: string;
          guest_count: number | null;
          message: string;
          status: string;
          wedding_id: string | null;
          source_ip: string;
          recommendation_id: string | null;
          created_at: string;
        },
        {
          vendor_id: string;
          full_names: string;
          email: string;
          phone?: string;
          wedding_date?: string | null;
          place?: string;
          guest_count?: number | null;
          message?: string;
          status?: string;
          source_ip?: string;
        },
        { status?: string; wedding_id?: string | null; recommendation_id?: string | null }
      >;
      reminders: Table<
        { id: string; wedding_id: string; milestone: number; kind: string; created_at: string },
        { wedding_id: string; milestone: number; kind: string },
        Record<string, never>
      >;
      signature_requests: Table<
        {
          id: string;
          document_id: string;
          wedding_id: string;
          requested_by: string;
          status: string;
          signer_name: string;
          signature_path: string;
          consent_at: string | null;
          signed_at: string | null;
          signed_by: string | null;
          signer_ip: string;
          signer_user_agent: string;
          document_sha256: string;
          created_at: string;
        },
        {
          document_id: string;
          wedding_id: string;
          requested_by: string;
          document_sha256: string;
          status?: string;
        },
        Record<string, never>
      >;
      payment_installments: Table<
        { id: string; quote_id: string; due_on: string; amount_cents: number; collected_on: string | null },
        { quote_id: string; due_on: string; amount_cents: number; collected_on?: string | null },
        { due_on?: string; amount_cents?: number; collected_on?: string | null }
      >;
      wedding_time_entries: Table<
        { id: string; wedding_id: string; vendor_id: string; kind: string; minutes: number; note: string },
        { wedding_id: string; vendor_id: string; kind: string; minutes?: number; note?: string },
        { kind?: string; minutes?: number; note?: string }
      >;
      cashflow_snapshots: Table<
        { vendor_id: string; month: string; collected_cents: number; scheduled_cents: number; unscheduled_cents: number },
        { vendor_id: string; month: string; collected_cents?: number; scheduled_cents?: number; unscheduled_cents?: number },
        { collected_cents?: number; scheduled_cents?: number; unscheduled_cents?: number }
      >;
      vendor_cash_settings: Table<
        { vendor_id: string; thin_cents: number; include_unsigned: boolean },
        { vendor_id: string; thin_cents?: number; include_unsigned?: boolean },
        { thin_cents?: number; include_unsigned?: boolean }
      >;
      delivery_tracks: Table<
        { wedding_id: string; vendor_id: string; promised_on: string; step_index: number; note: string; file_url: string },
        { wedding_id: string; vendor_id: string; promised_on: string; step_index?: number; note?: string; file_url?: string },
        { promised_on?: string; step_index?: number; note?: string; file_url?: string }
      >;
      crew_members: Table<
        { id: string; vendor_id: string; name: string; role: string; phone: string; email: string; rate_cents: number; rate_kind: string; notes: string; active: boolean },
        { vendor_id: string; name: string; role?: string; phone?: string; email?: string; rate_cents?: number; rate_kind?: string; notes?: string; active?: boolean },
        { name?: string; role?: string; phone?: string; email?: string; rate_cents?: number; rate_kind?: string; notes?: string; active?: boolean }
      >;
      crew_assignments: Table<
        { id: string; wedding_id: string; member_id: string; role: string; status: string; planned_minutes: number; paid: boolean },
        { wedding_id: string; member_id: string; role?: string; status?: string; planned_minutes?: number; paid?: boolean },
        { role?: string; status?: string; planned_minutes?: number; paid?: boolean }
      >;
      tech_templates: Table<
        { vendor_id: string; fields: Json },
        { vendor_id: string; fields?: Json },
        { fields?: Json }
      >;
      wedding_tech: Table<
        { wedding_id: string; vendor_id: string; fields: Json },
        { wedding_id: string; vendor_id: string; fields?: Json },
        { fields?: Json }
      >;
      venue_capabilities: Table<
        { wedding_id: string; fields: Json; share_with_couple: boolean },
        { wedding_id: string; fields?: Json; share_with_couple?: boolean },
        { fields?: Json; share_with_couple?: boolean }
      >;
      tech_issues: Table<
        { id: string; wedding_id: string; code: string; message: string; vendor_ids: string[] },
        { wedding_id: string; code: string; message: string; vendor_ids?: string[] },
        { code?: string; message?: string; vendor_ids?: string[] }
      >;
      cash_notices: Table<
        { vendor_id: string; month: string },
        { vendor_id: string; month: string },
        Record<string, never>
      >;
      quotes: Table<
        {
          id: string;
          wedding_id: string;
          vendor_id: string;
          number: number;
          title: string;
          amount_cents: number;
          status: string;
          created_at: string;
        },
        {
          id?: string;
          wedding_id: string;
          vendor_id: string;
          number: number;
          title: string;
          amount_cents: number;
          status?: string;
        },
        { status?: string }
      >;
      invoices: Table<
        {
          id: string;
          wedding_id: string;
          vendor_id: string;
          quote_id: string | null;
          number: number;
          title: string;
          amount_cents: number;
          status: string;
          due_on: string | null;
          created_at: string;
        },
        {
          id?: string;
          wedding_id: string;
          vendor_id: string;
          quote_id?: string | null;
          number: number;
          title: string;
          amount_cents: number;
          status?: string;
          due_on?: string | null;
        },
        { status?: string }
      >;
      deposits: Table<
        {
          id: string;
          wedding_id: string;
          vendor_id: string;
          invoice_id: string | null;
          amount_cents: number;
          due_on: string;
          status: string;
          stripe_session_id: string | null;
          created_at: string;
        },
        {
          id?: string;
          wedding_id: string;
          vendor_id: string;
          invoice_id?: string | null;
          amount_cents: number;
          due_on: string;
          status?: string;
          stripe_session_id?: string | null;
        },
        { status?: string; stripe_session_id?: string | null }
      >;
      reviews: Table<
        {
          id: string;
          wedding_id: string;
          vendor_id: string;
          author_id: string;
          rating: number;
          body: string;
          status: string;
          created_at: string;
        },
        {
          id?: string;
          wedding_id: string;
          vendor_id: string;
          author_id: string;
          rating: number;
          body?: string;
          status?: string;
        },
        { status?: string }
      >;
      questionnaires: Table<
        {
          id: string;
          wedding_id: string;
          vendor_id: string;
          title: string;
          status: string;
          created_at: string;
        },
        { id?: string; wedding_id: string; vendor_id: string; title: string; status?: string },
        { title?: string; status?: string }
      >;
      questionnaire_items: Table<
        {
          id: string;
          questionnaire_id: string;
          prompt: string;
          answer: string;
          sort_order: number;
        },
        { id?: string; questionnaire_id: string; prompt: string; answer?: string; sort_order?: number },
        { prompt?: string; answer?: string; sort_order?: number }
      >;
      wedding_stops: Table<
        {
          id: string;
          wedding_id: string;
          label: string;
          address: string;
          starts_at: string | null;
          sort_order: number;
          created_at: string;
        },
        {
          id?: string;
          wedding_id: string;
          label: string;
          address: string;
          starts_at?: string | null;
          sort_order?: number;
        },
        { label?: string; address?: string; starts_at?: string | null; sort_order?: number }
      >;
      deliveries: Table<
        {
          id: string;
          wedding_id: string;
          vendor_id: string;
          title: string;
          expires_at: string | null;
          created_at: string;
        },
        { id?: string; wedding_id: string; vendor_id: string; title: string; expires_at?: string | null },
        { title?: string; expires_at?: string | null }
      >;
      mail_outbox: Table<
        {
          id: string;
          kind: string;
          to_email: string;
          subject: string;
          heading: string;
          body: string;
          button_label: string;
          button_url: string;
          unsubscribe_token: string | null;
          created_at: string;
          sent_at: string | null;
        },
        {
          id?: string;
          kind: string;
          to_email: string;
          subject: string;
          heading: string;
          body: string;
          button_label: string;
          button_url: string;
          unsubscribe_token?: string | null;
          created_at?: string;
          sent_at?: string | null;
        },
        { sent_at?: string | null }
      >;
      delivery_files: Table<
        {
          id: string;
          delivery_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          created_at: string;
        },
        {
          id?: string;
          delivery_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
        },
        { file_name?: string }
      >;
      vendor_members: Table<
        { vendor_id: string; user_id: string; team_role: string; created_at: string },
        { vendor_id: string; user_id: string; team_role?: string },
        { team_role?: string }
      >;
      vendor_team_invites: Table<
        { id: string; vendor_id: string; email: string; token: string; expires_at: string; accepted_at: string | null; created_at: string },
        { vendor_id: string; email: string; token: string },
        { accepted_at?: string | null }
      >;
      availability_rules: Table<
        { id: string; vendor_id: string; weekday: number; start_time: string; end_time: string },
        { vendor_id: string; weekday: number; start_time: string; end_time: string },
        { start_time?: string; end_time?: string }
      >;
      appointments: Table<
        { id: string; vendor_id: string; wedding_id: string | null; full_name: string; email: string; starts_at: string; note: string; status: string; ics_token: string; created_at: string },
        { vendor_id: string; wedding_id?: string | null; full_name: string; email: string; starts_at: string; note?: string },
        { status?: string }
      >;
      rsvp_pages: Table<
        { wedding_id: string; token: string; enabled: boolean },
        { wedding_id: string; token: string; enabled?: boolean },
        { enabled?: boolean; token?: string }
      >;
      rsvp_answers: Table<
        { id: string; wedding_id: string; full_name: string; attending: boolean; diet: string; created_at: string },
        { wedding_id: string; full_name: string; attending: boolean; diet?: string },
        { diet?: string }
      >;
      seating_tables: Table<
        { id: string; wedding_id: string; name: string; capacity: number; sort_order: number },
        { wedding_id: string; name: string; capacity?: number; sort_order?: number },
        { name?: string; capacity?: number }
      >;
      seating_assignments: Table<
        { guest_id: string; table_id: string },
        { guest_id: string; table_id: string },
        { table_id?: string }
      >;
      wedding_budgets: Table<
        { wedding_id: string; total_cents: number },
        { wedding_id: string; total_cents?: number },
        { total_cents?: number }
      >;
      budget_lines: Table<
        {
          id: string;
          wedding_id: string;
          label: string;
          amount_cents: number;
          sort_order: number;
          paid: boolean;
          vendor_user_id: string | null;
        },
        {
          wedding_id: string;
          label: string;
          amount_cents: number;
          sort_order?: number;
          paid?: boolean;
          vendor_user_id?: string | null;
        },
        { label?: string; amount_cents?: number; paid?: boolean; vendor_user_id?: string | null }
      >;
      wedding_sites: Table<
        { wedding_id: string; slug: string; published: boolean; place: string; programme: string; note: string },
        { wedding_id: string; slug: string; published?: boolean; place?: string; programme?: string; note?: string },
        { slug?: string; published?: boolean; place?: string; programme?: string; note?: string }
      >;
      calendar_feeds: Table<
        { user_id: string; token: string; revoked_at: string | null },
        { user_id: string; token: string },
        { token?: string; revoked_at?: string | null }
      >;
      timeline_assignees: Table<
        { slot_id: string; user_id: string },
        { slot_id: string; user_id: string },
        Record<string, never>
      >;
      timeline_ready: Table<
        { slot_id: string; wedding_id: string; user_id: string; ready_at: string },
        { slot_id: string; wedding_id: string; user_id: string },
        Record<string, never>
      >;
      rain_plans: Table<
        { wedding_id: string; active: boolean; note: string },
        { wedding_id: string; active?: boolean; note?: string },
        { active?: boolean; note?: string }
      >;
      rain_stops: Table<
        { id: string; wedding_id: string; label: string; address: string; sort_order: number },
        { wedding_id: string; label: string; address: string; sort_order?: number },
        { label?: string; address?: string }
      >;
      rain_slots: Table<
        { id: string; wedding_id: string; title: string; starts_at: string; place: string; sort_order: number },
        { wedding_id: string; title: string; starts_at: string; place?: string; sort_order?: number },
        { title?: string; starts_at?: string; place?: string }
      >;
      technical_needs: Table<
        {
          wedding_id: string;
          user_id: string;
          vehicle: string;
          access_start: string | null;
          access_end: string | null;
          parking: string;
          power_w: number;
          sockets: number;
          setup_minutes: number;
          space_note: string;
        },
        {
          wedding_id: string;
          user_id: string;
          vehicle?: string;
          access_start?: string | null;
          access_end?: string | null;
          parking?: string;
          power_w?: number;
          sockets?: number;
          setup_minutes?: number;
          space_note?: string;
        },
        {
          vehicle?: string;
          access_start?: string | null;
          access_end?: string | null;
          parking?: string;
          power_w?: number;
          sockets?: number;
          setup_minutes?: number;
          space_note?: string;
        }
      >;
      venue_limits: Table<
        { wedding_id: string; power_w: number | null; parking_note: string },
        { wedding_id: string; power_w?: number | null; parking_note?: string },
        { power_w?: number | null; parking_note?: string }
      >;
      weather_settings: Table<
        {
          wedding_id: string;
          enabled: boolean;
          rain_mm: number;
          rain_probability: number;
          wind_kmh: number;
          latitude: number | null;
          longitude: number | null;
        },
        {
          wedding_id: string;
          enabled?: boolean;
          rain_mm?: number;
          rain_probability?: number;
          wind_kmh?: number;
          latitude?: number | null;
          longitude?: number | null;
        },
        {
          enabled?: boolean;
          rain_mm?: number;
          rain_probability?: number;
          wind_kmh?: number;
          latitude?: number | null;
          longitude?: number | null;
        }
      >;
      weather_checks: Table<
        { wedding_id: string; checked_on: string },
        { wedding_id: string; checked_on: string },
        Record<string, never>
      >;
      recommendations: Table<
        { id: string; wedding_id: string; from_user_id: string; vendor_id: string; token: string; created_at: string },
        { wedding_id: string; from_user_id: string; vendor_id: string; token: string },
        Record<string, never>
      >;
      admins: Table<{ user_id: string; created_at: string }, { user_id: string; created_at?: string }, { user_id?: string }>;
      vendor_billing: Table<
        {
          vendor_id: string;
          status: "trialing" | "active" | "expired" | "tester";
          trial_ends_at: string;
          tester_until: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan: "essentiel" | "pro" | "studio";
          updated_at: string;
        },
        {
          vendor_id: string;
          status?: "trialing" | "active" | "expired" | "tester";
          trial_ends_at: string;
          tester_until?: string | null;
          plan?: "essentiel" | "pro" | "studio";
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
        },
        {
          status?: "trialing" | "active" | "expired" | "tester";
          trial_ends_at?: string;
          tester_until?: string | null;
          plan?: "essentiel" | "pro" | "studio";
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
        }
      >;
      tester_codes: Table<
        {
          id: string;
          label: string;
          code_hash: string;
          max_uses: number;
          use_count: number;
          expires_at: string | null;
          access_until: string | null;
          created_at: string;
        },
        {
          id?: string;
          label: string;
          code_hash: string;
          max_uses: number;
          use_count?: number;
          expires_at?: string | null;
          access_until?: string | null;
        },
        {
          label?: string;
          max_uses?: number;
          use_count?: number;
          expires_at?: string | null;
          access_until?: string | null;
        }
      >;
      recommendation_events: Table<
        { id: string; recommendation_id: string; kind: string; created_at: string },
        { recommendation_id: string; kind: string },
        Record<string, never>
      >;
      vault_items: Table<
        {
          id: string;
          wedding_id: string;
          owner_id: string;
          kind: string;
          label: string;
          storage_path: string | null;
          file_name: string | null;
          mime_type: string | null;
          created_at: string;
        },
        {
          id?: string;
          wedding_id: string;
          owner_id: string;
          kind: string;
          label: string;
          storage_path?: string | null;
          file_name?: string | null;
          mime_type?: string | null;
        },
        { storage_path?: string | null; file_name?: string | null; mime_type?: string | null; label?: string }
      >;
      brief_sends: Table<
        { wedding_id: string; user_id: string; sent_on: string },
        { wedding_id: string; user_id: string; sent_on: string },
        Record<string, never>
      >;
      quote_intakes: Table<
        {
          id: string;
          wedding_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          business_name: string;
          category: string;
          email: string;
          phone: string;
          amount_cents: number | null;
          status: string;
          created_at: string;
        },
        {
          wedding_id: string;
          storage_path: string;
          file_name: string;
          mime_type?: string;
          business_name?: string;
          category?: string;
          email?: string;
          phone?: string;
          amount_cents?: number | null;
          status?: string;
        },
        {
          business_name?: string;
          category?: string;
          email?: string;
          phone?: string;
          amount_cents?: number | null;
          status?: string;
        }
      >;
      wedding_profile: Table<
        { wedding_id: string; facts: Json; updated_at: string },
        { wedding_id: string; facts?: Json; updated_at?: string },
        { facts?: Json; updated_at?: string }
      >;
      profile_field_access: Table<
        { field_key: string; category: string },
        { field_key: string; category: string },
        Record<string, never>
      >;
      vault_shares: Table<
        { item_id: string; vendor_user_id: string; created_at: string },
        { item_id: string; vendor_user_id: string },
        Record<string, never>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      create_wedding: {
        Args: {
          p_partner_one: string;
          p_partner_two: string;
          p_wedding_date: string;
          p_venue_name: string;
          p_venue_city: string;
        };
        Returns: string;
      };
      my_profile_slice: { Args: { p_wedding: string }; Returns: Json };
      notify_shift_personal: { Args: { p_wedding: string; p_user: string; p_body: string }; Returns: string };
      due_day_briefs: { Args: { p_day: string }; Returns: { wedding_id: string; user_id: string; email: string }[] };
      rebuild_cashflow: { Args: Record<string, never>; Returns: undefined };
      mark_brief_sent: { Args: { p_wedding: string; p_user: string; p_day: string }; Returns: undefined };
      create_invitation: {
        Args: {
          p_wedding_id: string;
          p_email: string;
          p_role: AppRole;
          p_token: string;
        };
        Returns: Json;
      };
      preview_invitation: {
        Args: { p_token: string };
        Returns: Json;
      };
      accept_invitation: {
        Args: { p_token: string };
        Returns: string;
      };
      shift_timeline_slot: {
        Args: { p_slot_id: string; p_new_time: string; p_cascade: boolean };
        Returns: Json;
      };
      post_wedding_alert: {
        Args: { p_wedding_id: string; p_message: string };
        Returns: Json;
      };
      open_couple_demo: {
        Args: Record<string, never>;
        Returns: string;
      };
      leave_couple_preview: {
        Args: { p_wedding_id: string };
        Returns: undefined;
      };
      delete_couple_demo: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      submit_quote_request: {
        Args: {
          p_slug: string;
          p_names: string;
          p_email: string;
          p_phone: string;
          p_wedding_date: string | null;
          p_place: string;
          p_guest_count: number | null;
          p_message: string;
          p_ip: string;
        };
        Returns: string;
      };
      run_due_reminders: {
        Args: Record<string, never>;
        Returns: number;
      };
      record_signature: {
        Args: {
          p_request_id: string;
          p_name: string;
          p_path: string;
          p_ip: string;
          p_user_agent: string;
        };
        Returns: undefined;
      };
      run_deposit_reminders: {
        Args: Record<string, never>;
        Returns: number;
      };
      unsubscribe_reminders: {
        Args: { p_token: string };
        Returns: boolean;
      };
      enqueue_product_mail: {
        Args: { p_site: string };
        Returns: number;
      };
      is_wedding_staff: { Args: { p_wedding: string }; Returns: boolean };
      staff_wedding_ids: { Args: Record<string, never>; Returns: string[] };
      accept_team_invite: { Args: { p_token: string }; Returns: string };
      open_slots: { Args: { p_slug: string; p_day: string }; Returns: { starts_at: string }[] };
      book_appointment: {
        Args: { p_slug: string; p_name: string; p_email: string; p_starts: string; p_note: string; p_wedding: string | null };
        Returns: string;
      };
      submit_rsvp: { Args: { p_token: string; p_name: string; p_attending: boolean; p_diet: string }; Returns: boolean };
      ensure_calendar_feed: { Args: Record<string, never>; Returns: string };
      rotate_calendar_feed: { Args: Record<string, never>; Returns: string };
      calendar_events: { Args: { p_token: string }; Returns: Json };
      appointment_event: { Args: { p_token: string }; Returns: Json };
      public_site: { Args: { p_slug: string }; Returns: Json };
      claim_mail_outbox: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          kind: string;
          to_email: string;
          subject: string;
          heading: string;
          body: string;
          button_label: string;
          button_url: string;
          unsubscribe_token: string | null;
          created_at: string;
          sent_at: string | null;
        }[];
      };
      assign_timeline_step: { Args: { p_slot: string; p_user: string }; Returns: undefined };
      clear_timeline_step: { Args: { p_slot: string; p_user: string }; Returns: undefined };
      mark_step_ready: { Args: { p_slot: string }; Returns: Json };
      set_rain_plan: { Args: { p_wedding: string; p_active: boolean }; Returns: string };
      note_couple_change: { Args: { p_wedding: string; p_body: string }; Returns: string };
      retract_couple_note: { Args: { p_id: string }; Returns: undefined };
      due_weather_weddings: {
        Args: Record<string, never>;
        Returns: {
          wedding_id: string;
          wedding_date: string;
          place: string;
          latitude: number | null;
          longitude: number | null;
          rain_mm: number;
          rain_probability: number;
          wind_kmh: number;
        }[];
      };
      record_weather_alert: { Args: { p_wedding: string; p_body: string }; Returns: undefined };
      set_venue_point: { Args: { p_wedding: string; p_lat: number; p_lng: number }; Returns: undefined };
      record_reco_click: { Args: { p_token: string }; Returns: string | null };
      attribute_quote: { Args: { p_lead: string; p_token: string }; Returns: undefined };
      create_couple_wedding: {
        Args: { p_partner_one: string; p_partner_two: string; p_wedding_date: string; p_city: string };
        Returns: string;
      };
      create_tester_code: {
        Args: { p_label: string; p_code: string; p_max_uses: number; p_expires: string | null; p_access_until: string | null };
        Returns: string;
      };
      redeem_tester_code: { Args: { p_code: string }; Returns: string };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      undo_timeline_shift: {
        Args: {
          p_slot_id: string;
          p_previous_time: string;
          p_notification_id: string;
          p_cascade: boolean;
          p_minutes: number;
        };
        Returns: undefined;
      };
      wedding_directory: {
        Args: { p_wedding_id: string };
        Returns: {
          user_id: string;
          member_role: string;
          full_name: string;
          business_name: string | null;
          category: string | null;
          phone: string | null;
          email: string | null;
        }[];
      };
    };
  };
};

export type Tables<Name extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][Name]["Row"];
