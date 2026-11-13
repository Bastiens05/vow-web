"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  invoiceSettled,
  isPaymentKind,
  isPaymentMethod,
  remainingCents,
} from "@/lib/domain/finance";
import { frenchDateToIso } from "@/lib/domain/french-date";
import { eurosToCents, formatEuros } from "@/lib/domain/money";
import { siteUrl } from "@/lib/env";
import { messageFromError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { createDepositCheckout, stripeEnabled } from "@/server/stripe";
import type { ActionState } from "@/server/actions/auth";
import { sendCoupleMail } from "@/server/product-mail";
import { requireSession } from "@/server/session";

async function nextNumber(table: "quotes" | "invoices", vendorId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from(table).select("number").eq("vendor_id", vendorId).order("number", { ascending: false }).limit(1);
  return (data?.[0]?.number ?? 0) + 1;
}

function relationMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "PGRST202" || error.code === "PGRST205" || error.code === "42P01" || /schema cache|does not exist|Could not find/i.test(error.message ?? "");
}

export async function createQuote(weddingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.vendor) return { error: "Complétez d'abord votre vitrine." };
  const title = String(formData.get("title") ?? "").trim();
  const cents = eurosToCents(String(formData.get("amount") ?? ""));
  if (title.length < 2) return { error: "Donnez un titre au devis." };
  if (cents === null) return { error: "Indiquez un montant en euros." };
  const supabase = await createClient();
  const { error } = await supabase.from("quotes").insert({
    wedding_id: weddingId,
    vendor_id: session.vendor.id,
    number: await nextNumber("quotes", session.vendor.id),
    title,
    amount_cents: cents,
  });
  if (error) return { error: messageFromError(error) };
  revalidatePath(`/mariage/${weddingId}/devis`);
  return { success: "Devis créé." };
}

export async function setQuoteStatus(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const weddingId = String(formData.get("wedding_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["sent", "accepted"].includes(status)) return;
  const supabase = await createClient();
  const { data: quote } = await supabase.from("quotes").select("title, amount_cents").eq("id", id).maybeSingle();
  await supabase.from("quotes").update({ status }).eq("id", id);
  if (status === "sent" && quote) {
    const euros = (quote.amount_cents / 100).toLocaleString("fr-FR");
    await sendCoupleMail(supabase, weddingId, {
      subject: `Devis · ${quote.title}`,
      heading: "Votre devis",
      body: `${quote.title}, ${euros} €. Il vous attend dans le mariage.`,
      buttonLabel: "Voir le devis",
      path: `/mariage/${weddingId}/devis`,
    });
  }
  revalidatePath(`/mariage/${weddingId}/devis`);
}

export async function setAgreedPrice(weddingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.vendor) return { error: "Complétez d'abord votre vitrine." };
  const cents = eurosToCents(String(formData.get("amount") ?? ""));
  if (cents === null || cents <= 0) return { error: "Indiquez le prix convenu en euros." };
  const supabase = await createClient();
  const { data: open } = await supabase
    .from("quotes")
    .select("id")
    .eq("wedding_id", weddingId)
    .eq("vendor_id", session.vendor.id)
    .neq("status", "invoiced")
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (open) {
    const { error } = await supabase.from("quotes").update({ amount_cents: cents }).eq("id", open.id);
    if (error) return { error: messageFromError(error) };
  } else {
    const { error } = await supabase.from("quotes").insert({
      wedding_id: weddingId,
      vendor_id: session.vendor.id,
      number: await nextNumber("quotes", session.vendor.id),
      title: "Prix convenu",
      amount_cents: cents,
    });
    if (error) return { error: messageFromError(error) };
  }
  revalidatePath(`/mariage/${weddingId}/devis`);
  return { success: "Prix convenu enregistré." };
}

export async function invoiceQuote(formData: FormData) {
  const session = await requireSession();
  if (!session.vendor) return;
  const quoteId = String(formData.get("id") ?? "");
  const weddingId = String(formData.get("wedding_id") ?? "");
  const supabase = await createClient();
  const { data: quote } = await supabase.from("quotes").select("*").eq("id", quoteId).maybeSingle();
  if (!quote || quote.vendor_id !== session.vendor.id || quote.status === "invoiced") return;
  const issued = await supabase.rpc("issue_invoice_from_quote", { p_quote: quoteId });
  if (issued.error && !relationMissing(issued.error)) {
    redirect(`/mariage/${weddingId}/devis?facture=erreur`);
  }
  if (issued.error) {
    const due = new Date();
    due.setUTCDate(due.getUTCDate() + 14);
    const { error } = await supabase.from("invoices").insert({
      wedding_id: quote.wedding_id,
      vendor_id: quote.vendor_id,
      quote_id: quote.id,
      number: await nextNumber("invoices", session.vendor.id),
      title: quote.title,
      amount_cents: quote.amount_cents,
      due_on: due.toISOString().slice(0, 10),
    });
    if (error) redirect(`/mariage/${weddingId}/devis?facture=erreur`);
    await supabase.from("quotes").update({ status: "invoiced" }).eq("id", quote.id);
  }
  const euros = (quote.amount_cents / 100).toLocaleString("fr-FR");
  await sendCoupleMail(supabase, weddingId, {
    subject: `Facture · ${quote.title}`,
    heading: "Votre facture",
    body: `${quote.title}, ${euros} €. L'échéance est dans 14 jours.`,
    buttonLabel: "Voir la facture",
    path: `/mariage/${weddingId}/devis`,
  });
  revalidatePath(`/mariage/${weddingId}/devis`);
  revalidatePath("/espace");
  revalidatePath("/tresorerie");
}

export async function markInvoicePaid(formData: FormData) {
  const session = await requireSession();
  if (!session.vendor) return;
  const id = String(formData.get("id") ?? "");
  const weddingId = String(formData.get("wedding_id") ?? "");
  const supabase = await createClient();
  const { data: invoice } = await supabase.from("invoices").select("vendor_id, wedding_id, amount_cents").eq("id", id).maybeSingle();
  if (!invoice || invoice.vendor_id !== session.vendor.id) return;
  const { data: rows, error: paymentsError } = await supabase.from("invoice_payments").select("amount_cents").eq("invoice_id", id);
  const paid = (rows ?? []).reduce((sum, row) => sum + row.amount_cents, 0);
  const rest = remainingCents(invoice.amount_cents, paid);
  if (rest > 0 && !relationMissing(paymentsError)) {
    const { error } = await supabase.from("invoice_payments").insert({
      invoice_id: id,
      vendor_id: invoice.vendor_id,
      wedding_id: invoice.wedding_id,
      kind: "solde",
      method: "virement",
      amount_cents: rest,
      paid_on: new Date().toISOString().slice(0, 10),
    });
    if (error && !relationMissing(error)) return;
  }
  await supabase.from("invoices").update({ status: "paid" }).eq("id", id);
  revalidatePath(`/mariage/${weddingId}/devis`);
  revalidatePath("/espace");
  revalidatePath("/tresorerie");
}

export async function recordPayment(weddingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.vendor) return { error: "Complétez d'abord votre vitrine." };
  const invoiceId = String(formData.get("invoice_id") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const method = String(formData.get("method") ?? "");
  const paidOn = String(formData.get("paid_on") ?? "");
  const cents = eurosToCents(String(formData.get("amount") ?? ""));
  if (!isPaymentKind(kind) || !isPaymentMethod(method)) return { error: "Choisissez le type et le moyen de paiement." };
  if (cents === null || cents <= 0) return { error: "Indiquez un montant en euros." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) return { error: "Indiquez la date du paiement." };
  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, vendor_id, wedding_id, amount_cents")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!invoice || invoice.wedding_id !== weddingId || invoice.vendor_id !== session.vendor.id) {
    return { error: "Facture introuvable." };
  }
  const { data: rows, error: paymentsError } = await supabase.from("invoice_payments").select("amount_cents").eq("invoice_id", invoiceId);
  if (relationMissing(paymentsError)) return { error: "Les paiements ne sont pas encore ouverts." };
  const paid = (rows ?? []).reduce((sum, row) => sum + row.amount_cents, 0);
  const rest = remainingCents(invoice.amount_cents, paid);
  if (rest <= 0) return { error: "Cette facture est déjà acquittée." };
  if (cents > rest) return { error: `Il reste ${formatEuros(rest)}.` };
  const { error } = await supabase.from("invoice_payments").insert({
    invoice_id: invoiceId,
    vendor_id: invoice.vendor_id,
    wedding_id: invoice.wedding_id,
    kind,
    method,
    amount_cents: cents,
    paid_on: paidOn,
  });
  if (error) return { error: messageFromError(error) };
  if (invoiceSettled(invoice.amount_cents, paid + cents)) {
    await supabase.from("invoices").update({ status: "paid" }).eq("id", invoiceId);
  }
  revalidatePath(`/mariage/${weddingId}/devis`);
  revalidatePath("/espace");
  revalidatePath("/tresorerie");
  return { success: invoiceSettled(invoice.amount_cents, paid + cents) ? "Paiement enregistré. Facture acquittée." : "Paiement enregistré." };
}

export async function saveBillingIdentity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.vendor) return { error: "Complétez d'abord votre vitrine." };
  const siret = String(formData.get("siret") ?? "").replace(/\s/g, "");
  const legalAddress = String(formData.get("legal_address") ?? "").trim();
  const paymentTerms = String(formData.get("payment_terms") ?? "").trim();
  const vatExempt = formData.get("vat_exempt") === "on";
  if (siret && !/^\d{14}$/.test(siret)) return { error: "Le SIRET comporte 14 chiffres." };
  if (legalAddress.length > 240) return { error: "L'adresse est trop longue." };
  if (paymentTerms.length < 2 || paymentTerms.length > 240) return { error: "Indiquez les conditions de paiement." };
  const supabase = await createClient();
  const { error } = await supabase.from("vendor_billing_identity").upsert(
    {
      vendor_id: session.vendor.id,
      siret,
      legal_address: legalAddress,
      vat_exempt: vatExempt,
      payment_terms: paymentTerms,
    },
    { onConflict: "vendor_id" },
  );
  if (error) {
    if (relationMissing(error)) return { error: "Les mentions légales ne sont pas encore ouvertes." };
    return { error: messageFromError(error) };
  }
  revalidatePath("/reglages");
  return { success: "Mentions de facture enregistrées." };
}

export async function createDeposit(weddingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.vendor) return { error: "Complétez d'abord votre vitrine." };
  const cents = eurosToCents(String(formData.get("amount") ?? ""));
  const due = frenchDateToIso(String(formData.get("due_on") ?? ""));
  if (cents === null || cents <= 0) return { error: "Indiquez le montant de l'acompte." };
  if (!due) return { error: "Indiquez l'échéance au format jj/mm/aaaa." };
  const supabase = await createClient();
  const { error } = await supabase.from("deposits").insert({
    wedding_id: weddingId,
    vendor_id: session.vendor.id,
    amount_cents: cents,
    due_on: due,
  });
  if (error) return { error: messageFromError(error) };
  revalidatePath(`/mariage/${weddingId}/devis`);
  return { success: "Acompte noté." };
}

export async function payDeposit(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const weddingId = String(formData.get("wedding_id") ?? "");
  const supabase = await createClient();
  const { data: deposit } = await supabase.from("deposits").select("*").eq("id", id).maybeSingle();
  if (!deposit || deposit.status === "paid") redirect(`/mariage/${weddingId}/devis`);
  if (!stripeEnabled()) redirect(`/mariage/${weddingId}/devis?paiement=ferme`);
  const { data: vendor } = await supabase.from("vendor_profiles").select("stripe_account_id").eq("id", deposit.vendor_id).maybeSingle();
  const checkout = await createDepositCheckout({
    amountCents: deposit.amount_cents,
    title: "Acompte de mariage",
    successUrl: `${siteUrl()}/mariage/${weddingId}/devis?paiement=ok`,
    cancelUrl: `${siteUrl()}/mariage/${weddingId}/devis?paiement=annule`,
    vendorAccount: vendor?.stripe_account_id ?? null,
  });
  if (!checkout.url) redirect(`/mariage/${weddingId}/devis?paiement=ferme`);
  await supabase.from("deposits").update({ stripe_session_id: "checkout" }).eq("id", deposit.id);
  redirect(checkout.url);
}

export async function submitReview(weddingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const vendorId = String(formData.get("vendor_id") ?? "");
  const rating = Number(formData.get("rating") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Choisissez une note de 1 à 5." };
  const supabase = await createClient();
  const { error } = await supabase.from("reviews").insert({
    wedding_id: weddingId,
    vendor_id: vendorId,
    author_id: session.userId,
    rating,
    body,
  });
  if (error) return { error: messageFromError(error) };
  revalidatePath(`/mariage/${weddingId}`);
  return { success: "Avis envoyé. Le prestataire le publie s'il le souhaite." };
}

export async function moderateReview(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (status !== "published" && status !== "rejected") return;
  const supabase = await createClient();
  await supabase.from("reviews").update({ status }).eq("id", id);
  revalidatePath("/espace");
}
