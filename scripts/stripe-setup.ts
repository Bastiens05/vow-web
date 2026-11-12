import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { STRIPE_LOOKUP, STRIPE_PRICE_CENTS, TESTER_COUPON_ID } from "../src/lib/domain/stripe-billing";
import type { VendorPlan } from "../src/lib/domain/plans";

loadEnv(resolve(process.cwd(), ".env.local"));
loadEnv(resolve(process.cwd(), ".env"));

const key = process.env.STRIPE_SECRET_KEY ?? "";
if (!key.startsWith("sk_test_")) {
  console.error("Ce script ne s'exécute qu'avec une clé de test (sk_test_).");
  process.exit(1);
}

const PLANS: { plan: VendorPlan; name: string }[] = [
  { plan: "essentiel", name: "VOW Essentiel" },
  { plan: "pro", name: "VOW Pro" },
  { plan: "studio", name: "VOW Studio" },
];

async function stripe(path: string, method: "GET" | "POST", body?: URLSearchParams): Promise<{ status: number; json: Record<string, unknown> }> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
  });
  const json = (await response.json()) as Record<string, unknown>;
  return { status: response.status, json };
}

async function ensurePrice(plan: VendorPlan, name: string) {
  const lookup = STRIPE_LOOKUP[plan];
  const existing = await stripe(`prices?lookup_keys[]=${encodeURIComponent(lookup)}&active=true&limit=1`, "GET");
  const data = Array.isArray(existing.json.data) ? existing.json.data : [];
  const price = data[0] as { id?: string; unit_amount?: number; product?: string | { id?: string } } | undefined;
  if (price?.id) {
    const productId = typeof price.product === "string" ? price.product : price.product?.id ?? "";
    console.log(`${lookup} existe déjà (${price.id}).`);
    return { priceId: price.id, productId };
  }
  const product = await stripe(
    "products",
    "POST",
    new URLSearchParams({ name, "metadata[plan]": plan }),
  );
  const productId = typeof product.json.id === "string" ? product.json.id : "";
  if (!productId) {
    console.error(`Produit ${name} non créé.`);
    process.exit(1);
  }
  const created = await stripe(
    "prices",
    "POST",
    new URLSearchParams({
      product: productId,
      currency: "eur",
      unit_amount: String(STRIPE_PRICE_CENTS[plan]),
      "recurring[interval]": "month",
      lookup_key: lookup,
      "metadata[plan]": plan,
    }),
  );
  const priceId = typeof created.json.id === "string" ? created.json.id : "";
  if (!priceId) {
    console.error(`Prix ${lookup} non créé.`);
    process.exit(1);
  }
  console.log(`${lookup} créé (${priceId}, ${STRIPE_PRICE_CENTS[plan] / 100} €/mois).`);
  return { priceId, productId };
}

async function ensureCoupon() {
  const existing = await stripe(`coupons/${TESTER_COUPON_ID}`, "GET");
  if (existing.status === 200) {
    console.log(`${TESTER_COUPON_ID} existe déjà.`);
    return;
  }
  const created = await stripe(
    "coupons",
    "POST",
    new URLSearchParams({
      id: TESTER_COUPON_ID,
      percent_off: "40",
      duration: "forever",
      name: "Testeur VOW −40 %",
    }),
  );
  if (created.status >= 400) {
    console.error("Coupon non créé.");
    process.exit(1);
  }
  console.log(`${TESTER_COUPON_ID} créé (40 % à vie).`);
}

async function ensurePortal(products: { productId: string; priceId: string }[]) {
  const list = await stripe("billing_portal/configurations?active=true&limit=10", "GET");
  const configs = Array.isArray(list.json.data) ? list.json.data : [];
  const wanted = new Set(products.map((item) => item.priceId));
  const already = configs.some((config) => {
    const features = config as {
      features?: { subscription_update?: { products?: { prices?: (string | { id?: string })[] }[] } };
    };
    const prices =
      features.features?.subscription_update?.products?.flatMap((product) =>
        (product.prices ?? []).map((price) => (typeof price === "string" ? price : price.id ?? "")),
      ) ?? [];
    return products.every((item) => prices.includes(item.priceId)) && prices.every((price) => wanted.has(price));
  });
  if (already) {
    console.log("Le portail client connaît déjà les trois formules.");
    return;
  }
  const body = new URLSearchParams({
    "features[invoice_history][enabled]": "true",
    "features[payment_method_update][enabled]": "true",
    "features[subscription_cancel][enabled]": "true",
    "features[subscription_cancel][mode]": "at_period_end",
    "features[subscription_update][enabled]": "true",
    "features[subscription_update][default_allowed_updates][0]": "price",
    "features[subscription_update][proration_behavior]": "create_prorations",
  });
  products.forEach((item, index) => {
    body.set(`features[subscription_update][products][${index}][product]`, item.productId);
    body.set(`features[subscription_update][products][${index}][prices][0]`, item.priceId);
  });
  const created = await stripe("billing_portal/configurations", "POST", body);
  if (created.status >= 400) {
    console.error("Configuration du portail non créée. Les produits et le coupon sont en place.");
    return;
  }
  console.log("Portail client créé : moyen de paiement, factures, changement de formule, résiliation.");
}

async function main() {
  const products = [];
  for (const plan of PLANS) {
    products.push(await ensurePrice(plan.plan, plan.name));
  }
  await ensureCoupon();
  await ensurePortal(products);
}

function loadEnv(path: string) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const name = trimmed.slice(0, eq).trim();
      if (process.env[name]) continue;
      process.env[name] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // Le fichier est facultatif quand les variables sont déjà dans l'environnement.
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Échec du script Stripe.");
  process.exit(1);
});
