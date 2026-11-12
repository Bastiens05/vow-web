"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AlertDock({
  initialToast = null,
  initialUnread = 0,
  inApp = true,
  calm = false,
}: {
  initialToast?: string | null;
  initialUnread?: number;
  inApp?: boolean;
  calm?: boolean;
}) {
  const me = useRef<string | null>(null);
  const [userId, setUserId] = useState<string | null>(initialToast ? "known" : null);
  const [unread, setUnread] = useState(initialUnread);
  const [toast, setToast] = useState<string | null>(inApp ? initialToast : null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function load(showToast: boolean) {
      const { data: session } = await supabase.auth.getSession();
      const currentUserId = session.session?.user.id;
      if (!currentUserId) return;
      me.current = currentUserId;
      setUserId(currentUserId);
      if (session.session?.access_token) {
        await supabase.realtime.setAuth(session.session.access_token);
      }
      const { data: notes } = await supabase
        .from("wedding_notifications")
        .select("id, body, created_at, author_id")
        .order("created_at", { ascending: false })
        .limit(30);
      const others = (notes ?? []).filter((note) => note.author_id !== currentUserId);
      const ids = others.map((note) => note.id);
      const { data: reads } = ids.length
        ? await supabase.from("notification_reads").select("notification_id").in("notification_id", ids)
        : { data: [] };
      const seen = new Set((reads ?? []).map((row) => row.notification_id));
      const fresh = others.filter((note) => !seen.has(note.id));
      if (!active) return;
      setUnread(fresh.length);
      const latest = fresh[0];
      if (inApp && showToast && latest && sessionStorage.getItem("vow-toast") !== latest.id) {
        sessionStorage.setItem("vow-toast", latest.id);
        setToast(latest.body);
        window.setTimeout(() => setToast(null), 8000);
      }
    }

    void load(true);
    const channel = supabase
      .channel("wedding-alerts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wedding_notifications" },
        (payload) => {
          const row = payload.new as { body?: string; author_id?: string };
          if (!inApp || !row.body || row.author_id === me.current) return;
          const body = row.body;
          if (body) {
            setToast(body);
            setUnread((count) => count + 1);
            window.setTimeout(() => setToast(null), 8000);
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [inApp]);

  if (!userId && !toast) return null;

  return (
    <>
      <Link
        href="/alertes"
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
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5L6 16Z" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 ? (
          <span className={`absolute right-2 top-2 h-2 w-2 rounded-full ${calm ? "bg-ink" : "bg-danger"}`} aria-hidden="true" />
        ) : null}
      </Link>
      {toast ? (
        <div
          role="status"
          className="fixed inset-x-4 bottom-24 z-50 rounded-2xl bg-ink px-4 py-4 text-sm leading-6 text-ivory shadow-lg md:bottom-auto md:left-auto md:right-6 md:top-16 md:max-w-sm"
        >
          {toast}
        </div>
      ) : null}
    </>
  );
}
