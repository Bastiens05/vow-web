import type { Metadata } from "next";
import Link from "next/link";
import { InviteVendor } from "@/components/wedding/invite-vendor";
import { MessageThread } from "@/components/wedding/message-thread";
import { Card } from "@/components/ui/card";
import { categoryLabel, isVendorCategory } from "@/lib/domain/categories";
import { createClient } from "@/lib/supabase/server";
import { getWeddingSpace, listMessages } from "@/server/data";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ avec?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const space = await getWeddingSpace(id);
  const couple = space.role === "couple" || space.actingAsCouple;
  const supabase = await createClient();
  const { data: directory } = await supabase.rpc("wedding_directory", { p_wedding_id: id });
  const vendors = (directory ?? []).filter((person) => person.member_role === "vendor");
  const vendorUserId = couple ? query.avec ?? "" : space.session.userId;
  const active = vendors.find((person) => person.user_id === vendorUserId) ?? null;

  if (couple && !active) {
    return (
      <div className="grid gap-3">
        <h2 className="text-3xl font-semibold tracking-tight">Messages</h2>
        {vendors.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Aucun prestataire pour l&apos;instant.</p>
            <InviteVendor weddingId={id} />
          </Card>
        ) : null}
        {vendors.map((person) => {
          const trade = person.category && isVendorCategory(person.category) ? categoryLabel(person.category) : "Prestataire";
          return (
            <Link key={person.user_id} href={`/mariage/${id}/messages?avec=${person.user_id}`} className="block rounded-2xl border border-line bg-paper px-4 py-4 transition active:scale-[0.99]">
              <p className="font-medium">{person.business_name || person.full_name}</p>
              <p className="text-sm text-muted">{trade}</p>
            </Link>
          );
        })}
      </div>
    );
  }

  const messages = vendorUserId ? await listMessages(id, space.session.userId, vendorUserId) : [];
  const title = active?.business_name || active?.full_name || "Conversation";
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        {couple ? (
          <Link href={`/mariage/${id}/messages`} className="inline-flex min-h-11 items-center rounded-full px-2 text-sm font-medium transition active:scale-[0.98]">
            <span aria-hidden="true">‹</span>
            <span className="ml-1">Messages</span>
          </Link>
        ) : (
          <span />
        )}
        <h2 className="font-semibold tracking-tight text-2xl">{couple ? title : "Le couple"}</h2>
      </div>
      {vendorUserId ? (
        <MessageThread weddingId={id} vendorUserId={vendorUserId} messages={messages} />
      ) : (
        <p className="text-sm text-muted">Cette conversation n&apos;est pas disponible.</p>
      )}
    </Card>
  );
}
