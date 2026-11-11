"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eurosToCents } from "@/lib/domain/money";
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

export async function invoiceQuote(formData: FormData) {
  const session = await requireSession();
  if (!session.vendor) return;
  const quoteId = String(formData.get("id") ?? "");
  const weddingId = String(formData.get("wedding_id") ?? "");
  const supabase = await createClient();
  const { data: quote } = await supabase.from("quotes").select("*").eq("id", quoteId).maybeSingle();
  if (!quote) return;
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
  if (error) return;
  await supabase.from("quotes").update({ status: "invoiced" }).eq("id", quote.id);
  const euros = (quote.amount_cents / 100).toLocaleString("fr-FR");
  await sendCoupleMail(supabase, weddingId, {
    subject: `Facture · ${quote.title}`,
    heading: "Votre facture",
    body: `${quote.title}, ${euros} €. L'échéance est dans 14 jours.`,
    buttonLabel: "Voir la facture",
    path: `/mariage/${weddingId}/devis`,
  });
  revalidatePath(`/mariage/${weddingId}/devis`);
}

export async function markInvoicePaid(formData: FormData) {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const weddingId = String(formData.get("wedding_id") ?? "");
  const supabase = await createClient();
  await supabase.from("invoices").update({ status: "paid" }).eq("id", id);
  revalidatePath(`/mariage/${weddingId}/devis`);
  revalidatePath("/espace");
}

export async function createDeposit(weddingId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  if (!session.vendor) return { error: "Complétez d'abord votre vitrine." };
  const cents = eurosToCents(String(formData.get("amount") ?? ""));
  const due = String(formData.get("due_on") ?? "");
  if (cents === null || cents <= 0) return { error: "Indiquez le montant de l'acompte." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return { error: "Indiquez une date d'échéance." };
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
