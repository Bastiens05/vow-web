import { featureEnabled } from "@/lib/domain/plans";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!featureEnabled("anniversary")) return Response.json({ ok: true, skipped: true });
  return Response.json({ ok: true, sent: 0 });
}
