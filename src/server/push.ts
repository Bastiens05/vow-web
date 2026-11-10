import { createClient } from "@supabase/supabase-js";
import { sendNotification, setVapidDetails } from "web-push";
import type { Database } from "@/lib/database.types";

export function pushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

export async function notifyWedding(
  userIds: string[],
  payload: { title: string; body: string; url: string },
) {
  if (!pushConfigured() || userIds.length === 0) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!url || !key || !publicKey || !privateKey) return;

  setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:bonjour@vow.app", publicKey, privateKey);
  const admin = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: prefs } = await admin.from("profiles").select("id, notify_push").in("id", userIds);
  const allowed = new Set((prefs ?? []).filter((row) => row.notify_push).map((row) => row.id));
  const recipients = userIds.filter((id) => allowed.has(id));
  if (recipients.length === 0) return;
  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_secret")
    .in("user_id", recipients);
  await Promise.all(
    (subscriptions ?? []).map(async (subscription) => {
      try {
        await sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth_secret },
          },
          JSON.stringify(payload),
        );
      } catch {
        // An expired browser subscription should not block the in-app alert.
      }
    }),
  );
}
