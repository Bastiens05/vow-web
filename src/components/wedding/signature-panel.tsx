"use client";

import { useActionState, useRef } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { signDocument } from "@/server/actions/signatures";

export function SignaturePanel({ requestId, weddingId }: { requestId: string; weddingId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [state, action, pending] = useActionState(signDocument, {});

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const pen = point(event);
    const context = canvasRef.current?.getContext("2d");
    if (!pen || !context) return;
    drawing.current = true;
    context.strokeStyle = "#14120b";
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(pen.x, pen.y);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const pen = point(event);
    const context = canvasRef.current?.getContext("2d");
    if (!pen || !context) return;
    context.lineTo(pen.x, pen.y);
    context.stroke();
  }

  async function onSubmit(formData: FormData) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    formData.set("signature", new File([blob], "signature.png", { type: "image/png" }));
    await action(formData);
  }

  return (
    <form action={onSubmit} className="mt-3 grid gap-3 rounded-2xl bg-ivory p-3">
      <input type="hidden" name="request_id" value={requestId} />
      <input type="hidden" name="wedding_id" value={weddingId} />
      <p className="text-sm leading-6">
        Signature électronique simple (eIDAS SES). Elle n&apos;est ni avancée ni qualifiée.
      </p>
      <Field label="Nom du signataire">
        <TextInput name="signer_name" required placeholder="Léa Martin" />
      </Field>
      <div>
        <p className="mb-1.5 text-sm">Signature</p>
        <canvas
          ref={canvasRef}
          width={640}
          height={200}
          aria-label="Zone de signature"
          className="h-32 w-full touch-none rounded-2xl border border-line bg-white"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={() => {
            drawing.current = false;
          }}
        />
      </div>
      <label className="flex min-h-11 items-start gap-3 text-sm leading-6">
        <input type="checkbox" name="consent" className="mt-1 h-5 w-5" required />
        Je consens à signer ce document électroniquement.
      </label>
      {state.error ? <Alert>{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Signature…" : "Signer"}
      </Button>
    </form>
  );
}
