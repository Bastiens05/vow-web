"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { saveAnswers } from "@/server/actions/daypack";

export function AnswerForm({
  weddingId,
  questionnaireId,
  items,
}: {
  weddingId: string;
  questionnaireId: string;
  items: Array<{ id: string; prompt: string; answer: string }>;
}) {
  const [state, action, pending] = useActionState(saveAnswers.bind(null, weddingId, questionnaireId), {});
  return (
    <form action={action} className="mt-4 grid gap-3">
      {items.map((item) => (
        <Field key={item.id} label={item.prompt}>
          <TextArea name={item.id} defaultValue={item.answer} />
        </Field>
      ))}
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer les réponses"}</Button>
    </form>
  );
}
