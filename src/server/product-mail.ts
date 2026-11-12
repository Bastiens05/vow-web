import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { siteUrl } from "@/lib/env";
import { sendEmail } from "@/server/mail";
import { serviceClient } from "@/server/service";

type Client = SupabaseClient<Database>;

export async function deliverOutbox(): Promise<number> {
  const admin = serviceClient();
  if (!admin || !process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return 0;
  await admin.rpc("enqueue_product_mail", { p_site: siteUrl() });
  const { data } = await admin.rpc("claim_mail_outbox");
  const rows = data ?? [];
  await Promise.all(rows.map((row) => sendOutbox(row)));
  return rows.length;
}

async function sendOutbox(row: {
  to_email: string;
  subject: string;
  heading: string;
  body: string;
  button_label: string;
  button_url: string;
  unsubscribe_token: string | null;
}) {
  const unsubscribeUrl = row.unsubscribe_token
    ? `${siteUrl()}/desabonnement/${row.unsubscribe_token}`
    : undefined;
  await sendEmail({
    to: row.to_email,
    subject: row.subject,
    heading: row.heading,
    body: row.body,
    buttonLabel: row.button_label,
    buttonUrl: row.button_url,
    unsubscribeUrl,
  });
}

export async function sendInvitationEmail(input: {
  to: string;
  title: string;
  url: string;
  role: "couple" | "vendor";
}) {
  const body = input.role === "vendor"
    ? "Les mariés vous ouvrent leur espace. Le lien vous y dépose directement."
    : "Votre espace mariage est prêt. Le lien vous y dépose directement.";
  await sendEmail({
    to: input.to,
    subject: `Invitation · ${input.title}`,
    heading: input.title,
    body,
    buttonLabel: "Ouvrir mon espace",
    buttonUrl: input.url,
  });
}

export async function magicInvitationUrl(input: {
  email: string;
  role: "couple" | "vendor";
  token: string;
  fallback: string;
}): Promise<string> {
  const admin = serviceClient();
  if (!admin || !process.env.RESEND_API_KEY) return input.fallback;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: input.email,
    options: {
      redirectTo: `${siteUrl()}/auth/callback`,
      data: { role: input.role, invitation_token: input.token },
    },
  });
  if (error || !data.properties?.action_link) return input.fallback;
  return data.properties.action_link;
}

export async function sendCoupleMail(
  supabase: Client,
  weddingId: string,
  message: { subject: string; heading: string; body: string; buttonLabel: string; path: string },
) {
  const { data: members } = await supabase
    .from("wedding_members")
    .select("user_id")
    .eq("wedding_id", weddingId)
    .eq("member_role", "couple");
  const ids = (members ?? []).map((member) => member.user_id);
  if (ids.length === 0) return;
  const { data: profiles } = await supabase
    .from("profiles")
    .select("email, notify_email")
    .in("id", ids);
  await Promise.all(
    (profiles ?? [])
      .filter((profile) => profile.notify_email && profile.email)
      .map((profile) =>
        sendEmail({
          to: profile.email,
          subject: message.subject,
          heading: message.heading,
          body: message.body,
          buttonLabel: message.buttonLabel,
          buttonUrl: message.path,
        }),
      ),
  );
}

export async function sendMemberMail(
  supabase: Client,
  weddingId: string,
  exceptUserId: string,
  message: { subject: string; heading: string; body: string; buttonLabel: string; path: string },
) {
  const { data: members } = await supabase
    .from("wedding_members")
    .select("user_id")
    .eq("wedding_id", weddingId)
    .neq("user_id", exceptUserId);
  const ids = (members ?? []).map((member) => member.user_id);
  if (ids.length === 0) return;
  const { data: profiles } = await supabase.from("profiles").select("email, notify_email").in("id", ids);
  await Promise.all(
    (profiles ?? [])
      .filter((profile) => profile.notify_email && profile.email)
      .map((profile) =>
        sendEmail({
          to: profile.email,
          subject: message.subject,
          heading: message.heading,
          body: message.body,
          buttonLabel: message.buttonLabel,
          buttonUrl: message.path,
        }),
      ),
  );
}

export function testerGrantEmailContent(input: {
  firstName?: string;
  planLabel: string;
  discountPercent: number;
  url: string;
  grantType?: "tester" | "lifetime";
}) {
  const who = input.firstName?.trim() ? `${input.firstName.trim()}, ` : "";
  const body =
    input.grantType === "lifetime"
      ? `${who}un accès prestataire vous est offert pour toujours, avec la formule ${input.planLabel}.`
      : `${who}un accès prestataire vous est ouvert : un an avec la formule ${input.planLabel}, puis une remise de ${input.discountPercent} % sur les formules.`;
  return {
    subject: "Invitation à rejoindre VOW",
    heading: "Vous êtes invité sur VOW",
    body,
    buttonLabel: "Rejoindre en tant que prestataire",
    buttonUrl: input.url,
  };
}

export async function sendTesterGrantEmail(input: {
  to: string;
  firstName?: string;
  planLabel: string;
  discountPercent: number;
  url: string;
  grantType?: "tester" | "lifetime";
}): Promise<boolean> {
  const content = testerGrantEmailContent(input);
  return sendEmail({ to: input.to, ...content });
}

