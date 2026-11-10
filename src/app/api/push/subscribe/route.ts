import { NextResponse } from "next/server";
import { savePushSubscription } from "@/server/actions/day";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  if (!body.endpoint || !body.keys?.p256dh || !body.keys.auth) {
    return NextResponse.json({ error: "Abonnement incomplet." }, { status: 400 });
  }
  const result = await savePushSubscription({
    endpoint: body.endpoint,
    keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
  });
  if ("error" in result && result.error) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
