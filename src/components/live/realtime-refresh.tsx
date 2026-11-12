"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type Subscription = {
  table: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  filter?: string;
};

export function RealtimeRefresh({ channel, subscriptions }: { channel: string; subscriptions: Subscription[] }) {
  const router = useRouter();
  const key = subscriptions.map((item) => `${item.event ?? "INSERT"}:${item.table}:${item.filter ?? ""}`).join("|");

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    const realtime = supabase.channel(channel);
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session?.access_token) await supabase.realtime.setAuth(data.session.access_token);
      if (!active) return;
      for (const item of subscriptions) {
        realtime.on(
          "postgres_changes",
          {
            event: item.event ?? "INSERT",
            schema: "public",
            table: item.table,
            ...(item.filter ? { filter: item.filter } : {}),
          },
          () => router.refresh(),
        );
      }
      realtime.subscribe();
    })();
    return () => {
      active = false;
      void supabase.removeChannel(realtime);
    };
    // `key` already describes the subscription list. The array identity changes every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, key, router]);

  return null;
}
