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
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          role: AppRole;
          full_name?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
        },
        { full_name?: string; updated_at?: string }
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
        },
        {
          partner_one_name?: string;
          partner_two_name?: string;
          wedding_date?: string;
          venue_name?: string;
          venue_city?: string;
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
    };
  };
};

export type Tables<Name extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][Name]["Row"];
