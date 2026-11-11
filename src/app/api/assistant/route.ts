import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { ASSISTANT_MODEL, ASSISTANT_UNAVAILABLE, assistantEnabled } from "@/lib/domain/assistant";
import { prepareAssistant } from "@/server/assistant";

export const maxDuration = 30;

function textMessages(messages: UIMessage[]): UIMessage[] {
  return messages.slice(-12).flatMap((message) => {
    if (message.role !== "user" && message.role !== "assistant") return [];
    const parts = message.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text" && typeof part.text === "string")
      .map((part) => ({ type: "text" as const, text: part.text.slice(0, 1500) }))
      .filter((part) => part.text.trim().length > 0);
    if (parts.length === 0) return [];
    return [{ ...message, parts }];
  });
}

export async function POST(request: Request) {
  if (!assistantEnabled()) return new Response(ASSISTANT_UNAVAILABLE, { status: 503 });
  let body: { messages?: UIMessage[]; weddingId?: string | null };
  try {
    body = (await request.json()) as { messages?: UIMessage[]; weddingId?: string | null };
  } catch {
    return new Response(ASSISTANT_UNAVAILABLE, { status: 400 });
  }
  const prepared = await prepareAssistant(typeof body.weddingId === "string" ? body.weddingId : null);
  if (!prepared.ok) return new Response(prepared.message, { status: prepared.status });
  const messages = textMessages(Array.isArray(body.messages) ? body.messages : []);
  if (messages.length === 0 || messages.at(-1)?.role !== "user") {
    return new Response(ASSISTANT_UNAVAILABLE, { status: 400 });
  }
  try {
    const result = streamText({
      model: ASSISTANT_MODEL,
      system: prepared.system,
      messages: await convertToModelMessages(messages),
      tools: prepared.tools,
      activeTools: prepared.activeTools,
      stopWhen: stepCountIs(4),
      maxOutputTokens: 500,
      maxRetries: 0,
      temperature: 0.3,
      providerOptions: {
        gateway: {
          zeroDataRetention: true,
          only: ["google"],
          sort: "cost",
          tags: ["vow-assistant"],
        },
      },
      experimental_telemetry: { isEnabled: false },
      onError() {
        console.info(JSON.stringify({ at: "assistant", status: "unavailable" }));
      },
    });
    return result.toUIMessageStreamResponse();
  } catch {
    console.info(JSON.stringify({ at: "assistant", status: "unavailable" }));
    return new Response(ASSISTANT_UNAVAILABLE, { status: 503 });
  }
}
