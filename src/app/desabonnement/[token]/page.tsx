import { createClient } from "@/lib/supabase/server";

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("unsubscribe_reminders", { p_token: token });
  return (
    <div className="mx-auto flex min-h-[70dvh] w-full max-w-md flex-col justify-center px-5 py-16">
      <p className="text-sm font-semibold tracking-[0.28em]">VOW</p>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">Rappels</h1>
      <p className="mt-3 text-base leading-7 text-muted">
        {data
          ? "C'est noté. Les rappels automatiques ne vous seront plus envoyés. Les invitations et les documents restent envoyés si vous les avez laissés actifs dans Réglages."
          : "Ce lien ne correspond à aucun compte. Les rappels n'ont pas changé."}
      </p>
    </div>
  );
}
