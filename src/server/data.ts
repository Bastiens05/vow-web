import { cache } from "react";
import { notFound } from "next/navigation";
import type { AppRole, Json, Tables } from "@/lib/database.types";
import { sortTimelineSlots, weddingTitle } from "@/lib/domain/format";
import { createClient } from "@/lib/supabase/server";
import { requireSession, type SessionProfile } from "@/server/session";

export type WeddingCard = Tables<"weddings"> & { memberRole: AppRole; coupleJoined: boolean };

type MemberWithWedding = {
  member_role: AppRole;
  weddings: Tables<"weddings"> | Tables<"weddings">[] | null;
};

export const listMyWeddings = cache(async (userId: string): Promise<WeddingCard[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("wedding_members").select("member_role, weddings(*)").eq("user_id", userId);
  const rows = (data ?? []) as unknown as MemberWithWedding[];
  const cards = rows.flatMap((row) => {
    const wedding = Array.isArray(row.weddings) ? row.weddings[0] : row.weddings;
    if (!wedding) return [];
    return [{ ...wedding, memberRole: row.member_role, coupleJoined: false }];
  });
  if (cards.length === 0) return [];
  const { data: couples } = await supabase
    .from("wedding_members")
    .select("wedding_id")
    .eq("member_role", "couple")
    .in(
      "wedding_id",
      cards.map((card) => card.id),
    );
  const joined = new Set((couples ?? []).map((row) => row.wedding_id));
  return cards.map((card) => ({ ...card, coupleJoined: joined.has(card.id) }));
});

export type MemberView = {
  userId: string;
  role: AppRole;
  fullName: string;
  email: string;
};

export type WeddingSpace = {
  session: SessionProfile;
  wedding: Tables<"weddings">;
  role: AppRole;
  actingAsCouple: boolean;
  members: MemberView[];
  title: string;
};

type MemberWithProfile = {
  user_id: string;
  member_role: AppRole;
  profiles: { full_name: string; email: string } | { full_name: string; email: string }[] | null;
};

export const getWeddingSpace = cache(async (weddingId: string): Promise<WeddingSpace> => {
  const session = await requireSession();
  const supabase = await createClient();
  const [weddingResult, membersResult] = await Promise.all([
    supabase.from("weddings").select("*").eq("id", weddingId).maybeSingle(),
    supabase
      .from("wedding_members")
      .select("user_id, member_role, profiles(full_name, email)")
      .eq("wedding_id", weddingId),
  ]);
  const wedding = weddingResult.data;
  if (!wedding) notFound();
  const rows = (membersResult.data ?? []) as unknown as MemberWithProfile[];
  const mine = rows.find((row) => row.user_id === session.userId);
  if (!mine) notFound();
  const members: MemberView[] = rows.map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      userId: row.user_id,
      role: row.member_role,
      fullName: profile?.full_name || "Membre",
      email: profile?.email ?? "",
    };
  });

  const actingAsCouple =
    mine.member_role === "couple" ||
    (wedding.is_demo && wedding.couple_preview && wedding.created_by === session.userId);

  return {
    session,
    wedding,
    role: mine.member_role,
    actingAsCouple,
    members,
    title: weddingTitle(wedding.partner_one_name, wedding.partner_two_name),
  };
});

export type MessageView = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  mine: boolean;
};

export async function listMessages(weddingId: string, userId: string): Promise<MessageView[]> {
  const supabase = await createClient();
  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("wedding_id", weddingId)
    .order("created_at", { ascending: true });
  const authorIds = [...new Set((messages ?? []).map((message) => message.author_id))];
  const { data: profiles } = authorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [] };
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
  return (messages ?? []).map((message) => ({
    id: message.id,
    body: message.body,
    createdAt: message.created_at,
    authorId: message.author_id,
    authorName: names.get(message.author_id) || "Membre",
    mine: message.author_id === userId,
  }));
}

export type InboxThread = {
  weddingId: string;
  title: string;
  body: string;
  createdAt: string;
};

export async function listInbox(): Promise<InboxThread[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("body, created_at, wedding_id, weddings(partner_one_name, partner_two_name)")
    .order("created_at", { ascending: false })
    .limit(80);
  const seen = new Set<string>();
  const threads: InboxThread[] = [];
  for (const row of data ?? []) {
    if (seen.has(row.wedding_id)) continue;
    seen.add(row.wedding_id);
    const wedding = Array.isArray(row.weddings) ? row.weddings[0] : row.weddings;
    threads.push({
      weddingId: row.wedding_id,
      title: wedding ? weddingTitle(wedding.partner_one_name, wedding.partner_two_name) : "Mariage",
      body: row.body,
      createdAt: row.created_at,
    });
  }
  return threads;
}

export async function listDocuments(weddingId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("wedding_id", weddingId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export type CommentView = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  mine: boolean;
};

export type SlotView = {
  id: string;
  title: string;
  startsAt: string;
  place: string;
  notes: string;
  sortOrder: number;
  createdAt: string;
  comments: CommentView[];
};

export async function listTimeline(weddingId: string, userId: string): Promise<SlotView[]> {
  const supabase = await createClient();
  const { data: slots } = await supabase.from("timeline_slots").select("*").eq("wedding_id", weddingId);
  const slotIds = (slots ?? []).map((slot) => slot.id);
  const { data: comments } = slotIds.length
    ? await supabase.from("timeline_comments").select("*").in("slot_id", slotIds).order("created_at", { ascending: true })
    : { data: [] };
  const authorIds = [
    ...new Set([
      ...(slots ?? []).map((slot) => slot.created_by),
      ...(comments ?? []).map((comment) => comment.author_id),
    ]),
  ];
  const { data: profiles } = authorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
    : { data: [] };
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
  const commentsBySlot = new Map<string, CommentView[]>();
  for (const comment of comments ?? []) {
    const list = commentsBySlot.get(comment.slot_id) ?? [];
    list.push({
      id: comment.id,
      body: comment.body,
      createdAt: comment.created_at,
      authorName: names.get(comment.author_id) || "Membre",
      mine: comment.author_id === userId,
    });
    commentsBySlot.set(comment.slot_id, list);
  }
  const views = (slots ?? []).map((slot) => ({
    id: slot.id,
    title: slot.title,
    startsAt: slot.starts_at,
    place: slot.place,
    notes: slot.notes,
    sortOrder: slot.sort_order,
    createdAt: slot.created_at,
    comments: commentsBySlot.get(slot.id) ?? [],
  }));
  return sortTimelineSlots(views);
}

export async function listInvitations(weddingId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invitations")
    .select("*")
    .eq("wedding_id", weddingId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getVendorEditor(userId: string) {
  const supabase = await createClient();
  const { data: vendor } = await supabase.from("vendor_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (!vendor) return { vendor: null, offers: [], photos: [] };
  const [{ data: offers }, { data: photos }] = await Promise.all([
    supabase.from("vendor_offers").select("*").eq("vendor_id", vendor.id).order("sort_order").order("created_at"),
    supabase.from("vendor_photos").select("*").eq("vendor_id", vendor.id).order("sort_order").order("created_at"),
  ]);
  return { vendor, offers: offers ?? [], photos: photos ?? [] };
}

export type PracticalRow = Tables<"wedding_practical">;
export type PhotoGroupRow = Tables<"photo_groups">;
export type GuestRow = Tables<"guests">;

export async function getPracticalSheet(
  weddingId: string,
  access: { photos: boolean; guests: boolean } = { photos: true, guests: true },
) {
  const supabase = await createClient();
  const [practical, groups, guests] = await Promise.all([
    supabase.from("wedding_practical").select("*").eq("wedding_id", weddingId).maybeSingle(),
    access.photos
      ? supabase.from("photo_groups").select("*").eq("wedding_id", weddingId).order("sort_order").order("created_at")
      : Promise.resolve({ data: [] as Tables<"photo_groups">[] }),
    access.guests
      ? supabase.from("guests").select("*").eq("wedding_id", weddingId).order("sort_order").order("full_name")
      : Promise.resolve({ data: [] as Tables<"guests">[] }),
  ]);
  return {
    practical: practical.data,
    groups: groups.data ?? [],
    guests: guests.data ?? [],
  };
}

export async function getDashboardSignals(weddingIds: string[]) {
  if (weddingIds.length === 0) {
    return { coupleJoined: false, hasTimeline: false, hasDocument: false, hasPractical: false, hasPhotoGroups: false, hasGuests: false };
  }
  const primary = weddingIds[0];
  const supabase = await createClient();
  const [members, slots, documents, practical, groups, guests] = await Promise.all([
    supabase.from("wedding_members").select("user_id").eq("wedding_id", primary).eq("member_role", "couple"),
    supabase.from("timeline_slots").select("id").eq("wedding_id", primary).limit(1),
    supabase.from("documents").select("id").eq("wedding_id", primary).limit(1),
    supabase.from("wedding_practical").select("wedding_id, postal_address, partner_one_phone, key_contacts").eq("wedding_id", primary).maybeSingle(),
    supabase.from("photo_groups").select("id").eq("wedding_id", primary).limit(1),
    supabase.from("guests").select("id").eq("wedding_id", primary).limit(1),
  ]);
  const sheet = practical.data;
  const hasPractical = Boolean(
    sheet && (sheet.postal_address || sheet.partner_one_phone || sheet.key_contacts),
  );
  return {
    coupleJoined: (members.data ?? []).length > 0,
    hasTimeline: (slots.data ?? []).length > 0,
    hasDocument: (documents.data ?? []).length > 0,
    hasPractical,
    hasPhotoGroups: (groups.data ?? []).length > 0,
    hasGuests: (guests.data ?? []).length > 0,
  };
}

export const latestUnreadAlert = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data: notes } = await supabase
    .from("wedding_notifications")
    .select("id, body, author_id")
    .order("created_at", { ascending: false })
    .limit(20);
  const others = (notes ?? []).filter((note) => note.author_id !== userId);
  if (others.length === 0) return null;
  const ids = others.map((note) => note.id);
  const { data: reads } = await supabase.from("notification_reads").select("notification_id").in("notification_id", ids);
  const seen = new Set((reads ?? []).map((row) => row.notification_id));
  return others.find((note) => !seen.has(note.id)) ?? null;
});

export async function getPublicVendor(slug: string) {
  const supabase = await createClient();
  const { data: vendor } = await supabase.from("vendor_profiles").select("*").eq("slug", slug).maybeSingle();
  if (!vendor) return null;
  const [{ data: offers }, { data: photos }] = await Promise.all([
    supabase.from("vendor_offers").select("*").eq("vendor_id", vendor.id).order("sort_order").order("created_at"),
    supabase.from("vendor_photos").select("*").eq("vendor_id", vendor.id).order("sort_order").order("created_at"),
  ]);
  return { vendor, offers: offers ?? [], photos: photos ?? [] };
}

export type InvitationPreview =
  | { status: "missing" }
  | { status: "expired" }
  | { status: "accepted"; weddingId: string; role: AppRole }
  | {
      status: "pending";
      email: string;
      role: AppRole;
      weddingId: string;
      partnerOne: string;
      partnerTwo: string;
      weddingDate: string;
      venueName: string;
      venueCity: string;
    };

export async function previewInvitation(token: string): Promise<InvitationPreview> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("preview_invitation", { p_token: token });
  if (error || !data) return { status: "missing" };
  return parsePreview(data);
}

function parsePreview(value: Json): InvitationPreview {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { status: "missing" };
  const status = value.status;
  const role = value.role === "vendor" || value.role === "couple" ? value.role : null;
  if (status === "expired") return { status: "expired" };
  if (status === "accepted" && typeof value.wedding_id === "string" && role) {
    return { status: "accepted", weddingId: value.wedding_id, role };
  }
  if (
    status === "pending" &&
    role &&
    typeof value.email === "string" &&
    typeof value.wedding_id === "string" &&
    typeof value.partner_one === "string" &&
    typeof value.partner_two === "string"
  ) {
    return {
      status: "pending",
      email: value.email,
      role,
      weddingId: value.wedding_id,
      partnerOne: value.partner_one,
      partnerTwo: value.partner_two,
      weddingDate: typeof value.wedding_date === "string" ? value.wedding_date : "",
      venueName: typeof value.venue_name === "string" ? value.venue_name : "",
      venueCity: typeof value.venue_city === "string" ? value.venue_city : "",
    };
  }
  return { status: "missing" };
}
