import { RsvpForm } from "./form";

export default async function PublicRsvpPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="mx-auto w-full max-w-md px-5 py-12">
      <p className="text-sm font-semibold tracking-[0.28em]">VOW</p>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight">Votre réponse</h1>
      <p className="mt-2 text-base leading-7 text-muted">Pas de compte. Dites si vous venez, et votre régime.</p>
      <RsvpForm token={token} />
    </div>
  );
}
