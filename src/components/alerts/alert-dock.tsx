"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AlertDock({
  initialToast = null,
  initialUnread = 0,
}: {
  initialToast?: string | null;
  initialUnread?: number;
}) {
  const me = useRef<string | null>(null);
  const [userId, setUserId] = useState<string | null>(initialToast ? "known" : null);
  const [unread, setUnread] = useState(initialUnread);
  const [toast, setToast] = useState<string | null>(initialToast);

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
      if (showToast && latest && sessionStorage.getItem("vow-toast") !== latest.id) {
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
          if (!row.body || row.author_id === me.current) return;
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
  }, []);

  if (!userId && !toast) return null;

  return (
    <>
      <Link href="/alertes" className="relative inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-white px-3 text-sm shadow-sm ring-1 ring-black/10" aria-label="Alertes">
        Alertes
        {unread > 0 ? (
          <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[11px] text-white">
            {unread}
          </span>
        ) : null}
      </Link>
      {toast ? (
        <div
          role="status"
          className="fixed inset-x-4 bottom-24 z-50 rounded-2xl bg-ink px-4 py-4 text-sm leading-6 text-white shadow-lg md:bottom-auto md:left-auto md:right-6 md:top-16 md:max-w-sm"
        >
          {toast}
        </div>
      ) : null}
    </>
  );
}
