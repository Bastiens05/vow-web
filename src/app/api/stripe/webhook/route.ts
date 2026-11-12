import {
  billingPatchFromEvent,
  customerIdFrom,
  vendorIdFrom,
  type BillingPatch,
} from "@/lib/domain/stripe-billing";
import { serviceClient } from "@/server/service";
import { verifyStripeSignature } from "@/server/stripe-signature";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = await request.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  const signature = request.headers.get("stripe-signature");
  if (!verifyStripeSignature(payload, signature, secret)) {
    return Response.json({ error: "Signature invalide." }, { status: 400 });
  }
  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(payload) as { type?: string; data?: { object?: Record<string, unknown> } };
  } catch {
    return Response.json({ error: "Corps illisible." }, { status: 400 });
  }
  const type = event.type ?? "";
  const object = event.data?.object;
  if (!object) return Response.json({ received: true });

  const admin = serviceClient();
  if (!admin) return Response.json({ error: "Service indisponible." }, { status: 500 });

  const vendorId = vendorIdFrom(object);
  const customer = customerIdFrom(object);
  let current: { vendor_id: string; comped: boolean } | null = null;
  if (vendorId) {
    const { data } = await admin.from("vendor_billing").select("vendor_id, comped").eq("vendor_id", vendorId).maybeSingle();
    current = data;
  } else if (customer) {
    const { data } = await admin.from("vendor_billing").select("vendor_id, comped").eq("stripe_customer_id", customer).maybeSingle();
    current = data;
  }
  if (!current) return Response.json({ received: true });

  const patch: BillingPatch | null = billingPatchFromEvent(type, object, current.comped);
  if (!patch) return Response.json({ received: true });
  await admin.from("vendor_billing").update(patch).eq("vendor_id", current.vendor_id);
  return Response.json({ received: true });
}
