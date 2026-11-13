"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { InviteDecisionCard } from "@/components/alerts/invite-decision-card";
import { createClient } from "@/lib/supabase/client";

export function AlertDock({
  initialToast = null,
  initialToastHref = null,
  initialUnread = 0,
  inApp = true,
  calm = false,
}: {
  initialToast?: string | null;
  initialToastHref?: string | null;
  initialUnread?: number;
  inApp?: boolean;
  calm?: boolean;
}) {
  const me = useRef<string | null>(null);
  const timer = useRef<number | null>(null);
  const [userId, setUserId] = useState<string | null>(initialToast ? "known" : null);
  const [unread, setUnread] = useState(initialUnread);
  const [toast, setToast] = useState<string | null>(inApp ? initialToast : null);
  const [toastHref, setToastHref] = useState<string | null>(inApp ? initialToastHref : null);
  const [open, setOpen] = useState(false);
  const [invites, setInvites] = useState<{ token: string; invited_role: string; title: string }[]>([]);

  function showToast(body: string, href: string | null) {
    if (timer.current) window.clearTimeout(timer.current);
    setToast(body);
    setToastHref(href);
    timer.current = window.setTimeout(() => {
      setToast(null);
      setToastHref(null);
    }, 8000);
  }

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function load(announce: boolean) {
      const { data: session } = await supabase.auth.getSession();
      const currentUserId = session.session?.user.id;
      if (!currentUserId) return;
      me.current = currentUserId;
      setUserId(currentUserId);
      if (session.session?.access_token) {
        await supabase.realtime.setAuth(session.session.access_token);
      }
      const [{ data: notes }, { data: offers }, { data: signups }, { data: pendingInvites }] = await Promise.all([
        supabase
          .from("wedding_notifications")
          .select("id, body, created_at, author_id, wedding_id, kind")
          .order("created_at", { ascending: false })
          .limit(30),
        supabase.from("grant_notices").select("id, body, seen_at, activated_at").is("activated_at", null),
        supabase.from("admin_notices").select("id, body, href").order("created_at", { ascending: false }).limit(10),
        supabase.rpc("my_pending_invitations"),
      ]);
      setInvites(pendingInvites ?? []);
      const signupIds = (signups ?? []).map((notice) => notice.id);
      const { data: seenSignups } = signupIds.length
        ? await supabase.from("admin_notice_reads").select("notice_id").in("notice_id", signupIds)
        : { data: [] };
      const seenSignupIds = new Set((seenSignups ?? []).map((row) => row.notice_id));
      const freshSignups = (signups ?? []).filter((notice) => !seenSignupIds.has(notice.id));
      const others = (notes ?? []).filter((note) => note.author_id !== currentUserId);
      const ids = others.map((note) => note.id);
      const { data: reads } = ids.length
        ? await supabase.from("notification_reads").select("notification_id").in("notification_id", ids)
        : { data: [] };
      const seen = new Set((reads ?? []).map((row) => row.notification_id));
      const fresh = others.filter((note) => !seen.has(note.id));
      const pendingOffers = (offers ?? []).filter((offer) => !offer.seen_at);
      if (!active) return;
      setUnread(fresh.length + pendingOffers.length + freshSignups.length + (pendingInvites ?? []).length);
      const latestSignup = freshSignups[0];
      const latestOffer = pendingOffers[0];
      const latestNote = fresh[0];
      const latest = latestSignup ?? latestOffer ?? latestNote;
      if (inApp && announce && latest && sessionStorage.getItem("vow-toast") !== latest.id) {
        sessionStorage.setItem("vow-toast", latest.id);
        const href = latestSignup
          ? latestSignup.href
          : latestNote && !latestSignup && !latestOffer && latestNote.kind === "message"
            ? `/mariage/${latestNote.wedding_id}/messages?avec=${latestNote.author_id}`
            : null;
        showToast(latest.body, href);
      }
    }

    const channel = supabase.channel("wedding-alerts");
    void (async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!active) return;
      const currentUserId = session.session?.user.id ?? null;
      if (currentUserId) {
        me.current = currentUserId;
        setUserId(currentUserId);
      }
      if (session.session?.access_token) {
        await supabase.realtime.setAuth(session.session.access_token);
      }
      if (!active) return;
      channel
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "wedding_notifications" },
          (payload) => {
            const row = payload.new as { body?: string; author_id?: string; wedding_id?: string; kind?: string };
            if (!inApp || !row.body || row.author_id === me.current) return;
            const href = row.kind === "message" && row.wedding_id ? `/mariage/${row.wedding_id}/messages?avec=${row.author_id ?? ""}` : null;
            showToast(row.body, href);
            setUnread((count) => count + 1);
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "admin_notices" },
          (payload) => {
            const row = payload.new as { body?: string; href?: string };
            if (!inApp || !row.body) return;
            showToast(row.body, row.href || "/admin");
            setUnread((count) => count + 1);
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "grant_notices" },
          (payload) => {
            const row = payload.new as { body?: string; user_id?: string };
            if (row.user_id && row.user_id !== me.current) return;
            if (!inApp || !row.body) return;
            showToast(row.body, "/nouveautes");
            setUnread((count) => count + 1);
          },
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "grant_notices" },
          () => {
            void load(false);
          },
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "invitations" },
          () => {
            void load(false);
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notification_reads" },
          (payload) => {
            const row = payload.new as { user_id?: string };
            if (!row.user_id || row.user_id !== me.current) return;
            setUnread((count) => Math.max(0, count - 1));
          },
        )
        .subscribe();
      await load(true);
    })();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [inApp]);

  if (!userId && !toast) return null;

  return (
    <>
      <div className="relative">
        <button
          type="button"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-ink transition active:scale-95 hover:bg-ink/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          aria-label={
            calm
              ? unread > 0
                ? `Nouveautés, ${unread} nouvelle${unread > 1 ? "s" : ""}`
                : "Nouveautés"
              : unread > 0
                ? `Alertes, ${unread} non lue${unread > 1 ? "s" : ""}`
                : "Alertes"
          }
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16Z" />
            <path d="M10 19a2 2 0 0 0 4 0" />
          </svg>
          {unread > 0 ? (
            <span className={`absolute right-2 top-2 h-2 w-2 rounded-full ${calm ? "bg-ink" : "bg-danger"}`} aria-hidden="true" />
          ) : null}
        </button>
        {open ? (
          <div className="absolute right-0 top-12 z-50 w-80 rounded-3xl border border-line bg-paper p-4 shadow-lg">
            <p className="text-sm font-medium">Nouveautés</p>
            {invites.length > 0 ? (
              <div className="mt-3 space-y-3">
                {invites.map((invite) => (
                  <InviteDecisionCard key={invite.token} token={invite.token} title={invite.title} role={invite.invited_role} />
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">Les invitations et les notifications sont ici.</p>
            )}
            <Link href="/nouveautes" className="mt-3 inline-flex min-h-11 items-center text-sm text-accent" onClick={() => setOpen(false)}>
              Ouvrir les nouveautés
            </Link>
          </div>
        ) : null}
      </div>
      {toast ? (
        <div
          role="status"
          className="fixed inset-x-4 bottom-24 z-50 rounded-3xl bg-ink px-4 py-4 text-sm leading-6 text-ivory shadow-lg md:bottom-auto md:left-auto md:right-6 md:top-16 md:max-w-sm"
        >
          {toastHref ? (
            <Link href={toastHref} className="block text-ivory">
              {toast}
            </Link>
          ) : (
            <p>{toast}</p>
          )}
          <button
            type="button"
            className="mt-2 text-xs text-ivory/80"
            onClick={() => {
              if (timer.current) window.clearTimeout(timer.current);
              setToast(null);
              setToastHref(null);
            }}
          >
            Fermer
          </button>
        </div>
      ) : null}
    </>
  );
}
