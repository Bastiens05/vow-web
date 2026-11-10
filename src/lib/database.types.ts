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
          created_at?: string;
          updated_at?: string;
        },
        { full_name?: string; notify_in_app?: boolean; notify_push?: boolean; updated_at?: string }
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
          starting_price_cents: number | null;
          currency: string;
          published: boolean;
          logo_path: string | null;
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
          starting_price_cents?: number | null;
          currency?: string;
          published?: boolean;
        },
        {
          business_name?: string;
          slug?: string;
          category?: VendorCategory;
          logo_path?: string | null;
          city?: string;
          zone?: string;
          description?: string;
          contact_email?: string;
          contact_phone?: string;
          website?: string;
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
        { id: string; wedding_id: string; author_id: string; body: string; created_at: string },
        { id?: string; wedding_id: string; author_id: string; body: string },
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
        },
        { id?: string; wedding_id: string; title: string; people?: string; notes?: string; sort_order?: number },
        { title?: string; people?: string; notes?: string; sort_order?: number }
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
        { status?: string; wedding_id?: string | null }
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
    };
  };
};

export type Tables<Name extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][Name]["Row"];
