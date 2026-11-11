import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnswerForm } from "@/components/wedding/answer-form";
import { categoryLabel, isVendorCategory } from "@/lib/domain/categories";
import { createClient } from "@/lib/supabase/server";
import { applyQuestionTemplate, sendQuestionnaire } from "@/server/actions/daypack";
import { getWeddingSpace } from "@/server/data";

export const metadata: Metadata = { title: "Questions" };

const STATUS: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  answered: "Répondu",
};

export default async function QuestionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const space = await getWeddingSpace(id);
  const supabase = await createClient();
  const { data: forms } = await supabase.from("questionnaires").select("*").eq("wedding_id", id).order("created_at");
  const ids = (forms ?? []).map((form) => form.id);
  const { data: items } = ids.length
    ? await supabase.from("questionnaire_items").select("*").in("questionnaire_id", ids).order("sort_order")
    : { data: [] };
  const vendorId = space.session.vendor?.id;
  const mine = (forms ?? []).find((form) => form.vendor_id === vendorId);
  const canPrepare = !space.actingAsCouple && space.role === "vendor" && Boolean(vendorId);
  const category = space.session.vendor?.category;
  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-3xl font-semibold tracking-tight">Questions</h2>
        <p className="mt-1 text-sm text-muted">
          {canPrepare
            ? `Un modèle pour ${category && isVendorCategory(category) ? categoryLabel(category).toLowerCase() : "votre métier"}. Le couple répond, les autres métiers ne voient rien.`
            : "Répondez quand le prestataire vous envoie ses questions."}
        </p>
      </Card>
      {canPrepare && !mine ? (
        <Card>
          <h3 className="text-lg font-semibold">Aucune question</h3>
          <p className="mt-1 text-sm text-muted">Un modèle pour votre métier, à envoyer au couple.</p>
          <form action={applyQuestionTemplate.bind(null, id)} className="mt-4">
            <input type="hidden" name="wedding_id" value={id} />
            <Button type="submit">Utiliser le modèle</Button>
          </form>
        </Card>
      ) : null}
      {(forms ?? []).map((form) => {
        const rows = (items ?? []).filter((item) => item.questionnaire_id === form.id);
        return (
          <Card key={form.id}>
            <p className="text-xs text-muted">{STATUS[form.status] ?? form.status}</p>
            <h3 className="mt-1 text-xl font-semibold">{form.title}</h3>
            {canPrepare && form.vendor_id === vendorId ? (
              <ul className="mt-4 space-y-3">
                {rows.map((item) => (
                  <li key={item.id}>
                    <p className="text-sm font-medium">{item.prompt}</p>
                    <p className="mt-1 text-sm text-muted">{item.answer || "En attente de réponse"}</p>
                  </li>
                ))}
              </ul>
            ) : null}
            {canPrepare && form.vendor_id === vendorId && form.status === "draft" ? (
              <form action={sendQuestionnaire} className="mt-4">
                <input type="hidden" name="id" value={form.id} />
                <input type="hidden" name="wedding_id" value={id} />
                <Button type="submit" variant="secondary">Envoyer au couple</Button>
              </form>
            ) : null}
            {space.actingAsCouple ? <AnswerForm weddingId={id} questionnaireId={form.id} items={rows} /> : null}
          </Card>
        );
      })}
      {(forms ?? []).length === 0 && space.actingAsCouple ? <Alert>Aucune question pour le moment.</Alert> : null}
    </div>
  );
}
