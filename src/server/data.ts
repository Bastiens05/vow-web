import { notFound } from "next/navigation";
import type { AppRole, Json, Tables } from "@/lib/database.types";
import { sortTimelineSlots, weddingTitle } from "@/lib/domain/format";
import { createClient } from "@/lib/supabase/server";
import { requireSession, type SessionProfile } from "@/server/session";

export type WeddingCard = Tables<"weddings"> & { memberRole: AppRole };

export async function listMyWeddings(userId: string): Promise<WeddingCard[]> {
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("wedding_members")
    .select("wedding_id, member_role")
    .eq("user_id", userId);
  const ids = (memberships ?? []).map((member) => member.wedding_id);
  if (ids.length === 0) return [];
  const { data: weddings } = await supabase.from("weddings").select("*").in("id", ids);
  const roleByWedding = new Map((memberships ?? []).map((member) => [member.wedding_id, member.member_role]));
  return (weddings ?? []).map((wedding) => ({
    ...wedding,
    memberRole: roleByWedding.get(wedding.id) ?? "couple",
  }));
}

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
  members: MemberView[];
  title: string;
};

export async function getWeddingSpace(weddingId: string): Promise<WeddingSpace> {
  const session = await requireSession();
  const supabase = await createClient();
  const { data: wedding } = await supabase.from("weddings").select("*").eq("id", weddingId).maybeSingle();
  if (!wedding) notFound();
  const { data: membership } = await supabase
    .from("wedding_members")
    .select("member_role")
    .eq("wedding_id", weddingId)
    .eq("user_id", session.userId)
    .maybeSingle();
  if (!membership) notFound();

  const { data: rows } = await supabase
    .from("wedding_members")
    .select("user_id, member_role")
    .eq("wedding_id", weddingId);
  const userIds = (rows ?? []).map((row) => row.user_id);
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const members: MemberView[] = (rows ?? []).map((row) => {
    const profile = profileById.get(row.user_id);
    return {
      userId: row.user_id,
      role: row.member_role,
      fullName: profile?.full_name || "Membre",
      email: profile?.email ?? "",
    };
  });

  return {
    session,
    wedding,
    role: membership.member_role,
    members,
    title: weddingTitle(wedding.partner_one_name, wedding.partner_two_name),
  };
}

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
