import { remainingCents } from "@/lib/domain/finance";
import { formatLongDate, weddingTitle } from "@/lib/domain/format";
import { unreadMessageCount, type ThreadMessage } from "@/lib/domain/message-reads";
import {
  buildVendorTodos,
  documentRequestOpen,
  weddingReadiness,
  type WeddingStep,
  type VendorTodo,
} from "@/lib/domain/vendor-home";
import { vendorVaultCategoryLabel } from "@/lib/domain/vendor-vault";
import { createClient } from "@/lib/supabase/server";

type HomeWedding = {
  id: string;
  partner_one_name: string;
  partner_two_name: string;
  wedding_date: string;
};

export async function loadVendorHome(input: {
  userId: string;
  vendorId: string;
  weddings: readonly HomeWedding[];
  today: string;
}): Promise<{ todos: VendorTodo[]; steps: Record<string, WeddingStep[]> }> {
  const supabase = await createClient();
  const ids = input.weddings.map((wedding) => wedding.id);
  const names = new Map(input.weddings.map((wedding) => [wedding.id, weddingTitle(wedding.partner_one_name, wedding.partner_two_name)]));
  const byDate = [...input.weddings].sort((a, b) => a.wedding_date.localeCompare(b.wedding_date));

  const [messages, quotes, requests, deposits, invoices, paymentsResult, signatures, vault] = await Promise.all([
    ids.length
      ? supabase.from("messages").select("id, wedding_id, author_id, vendor_user_id").in("wedding_id", ids).eq("vendor_user_id", input.userId)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from("quotes").select("wedding_id, status").eq("vendor_id", input.vendorId).in("wedding_id", ids).eq("status", "sent")
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from("wedding_document_requests").select("wedding_id, status").eq("vendor_id", input.vendorId).in("wedding_id", ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from("deposits").select("wedding_id, status, due_on").eq("vendor_id", input.vendorId).in("wedding_id", ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from("invoices").select("id, wedding_id, status, due_on, amount_cents").eq("vendor_id", input.vendorId).in("wedding_id", ids)
      : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from("invoice_payments").select("invoice_id, wedding_id, kind, amount_cents").eq("vendor_id", input.vendorId).in("wedding_id", ids)
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? supabase.from("signature_requests").select("wedding_id, status").eq("requested_by", input.userId).in("wedding_id", ids)
      : Promise.resolve({ data: [] }),
    supabase.from("vendor_vault_files").select("id, title, category, expires_on").eq("vendor_id", input.vendorId),
  ]);

  const messageRows = messages.data ?? [];
  const messageIds = messageRows.map((row) => row.id);
  const { data: reads } = messageIds.length
    ? await supabase.from("message_reads").select("message_id").in("message_id", messageIds).eq("user_id", input.userId)
    : { data: [] };
  const readIds = new Set((reads ?? []).map((row) => row.message_id));
  const threads = new Map<string, ThreadMessage[]>();
  for (const row of messageRows) {
    const list = threads.get(row.wedding_id) ?? [];
    list.push({ id: row.id, authorId: row.author_id, vendorUserId: row.vendor_user_id });
    threads.set(row.wedding_id, list);
  }

  const payments = paymentsResult.error ? [] : paymentsResult.data ?? [];
  const paidOnInvoice = new Map<string, number>();
  for (const payment of payments) {
    paidOnInvoice.set(payment.invoice_id, (paidOnInvoice.get(payment.invoice_id) ?? 0) + payment.amount_cents);
  }

  const quoteRows = quotes.data ?? [];
  const requestRows = requests.data ?? [];
  const depositRows = deposits.data ?? [];
  const invoiceRows = invoices.data ?? [];
  const signatureRows = signatures.data ?? [];

  const countBy = (rows: { wedding_id: string }[], keep: (row: { wedding_id: string }) => boolean) => {
    const totals = new Map<string, number>();
    for (const row of rows) {
      if (!keep(row)) continue;
      totals.set(row.wedding_id, (totals.get(row.wedding_id) ?? 0) + 1);
    }
    return byDate.flatMap((wedding) => {
      const count = totals.get(wedding.id) ?? 0;
      if (count < 1) return [];
      return [{ weddingId: wedding.id, names: names.get(wedding.id) ?? "Mariage", count }];
    });
  };

  const flagged = (weddingIds: Set<string>) =>
    byDate.flatMap((wedding) =>
      weddingIds.has(wedding.id) ? [{ weddingId: wedding.id, names: names.get(wedding.id) ?? "Mariage" }] : [],
    );

  const overdueDepositIds = new Set(
    depositRows.filter((row) => (row.status === "pending" || row.status === "reminded") && row.due_on < input.today).map((row) => row.wedding_id),
  );
  const overduePaymentIds = new Set(
    invoiceRows
      .filter((row) => {
        const paid = paidOnInvoice.get(row.id) ?? 0;
        return row.status === "pending" && Boolean(row.due_on && row.due_on < input.today) && remainingCents(row.amount_cents, paid) > 0;
      })
      .map((row) => row.wedding_id),
  );

  const steps: Record<string, WeddingStep[]> = {};
  for (const wedding of input.weddings) {
    const depositPaid =
      depositRows.some((row) => row.wedding_id === wedding.id && row.status === "paid") ||
      payments.some((row) => row.wedding_id === wedding.id && row.kind === "acompte");
    steps[wedding.id] = weddingReadiness({
      signatures: signatureRows.filter((row) => row.wedding_id === wedding.id),
      depositPaid,
      documentRequests: requestRows.filter((row) => row.wedding_id === wedding.id),
    });
  }

  const todos = buildVendorTodos({
    today: input.today,
    formatDate: formatLongDate,
    messages: byDate.flatMap((wedding) => {
      const thread = threads.get(wedding.id) ?? [];
      const count = unreadMessageCount(thread, input.userId, readIds);
      return count > 0 ? [{ weddingId: wedding.id, names: names.get(wedding.id) ?? "Mariage", count }] : [];
    }),
    quotes: countBy(quoteRows, () => true),
    documents: countBy(requestRows, (row) => "status" in row && documentRequestOpen(String(row.status))),
    overdueDeposits: flagged(overdueDepositIds),
    overduePayments: flagged(overduePaymentIds),
    vaultFiles: (vault.data ?? []).map((file) => ({
      id: file.id,
      label: file.title.trim() || vendorVaultCategoryLabel(file.category),
      expiresOn: file.expires_on,
    })),
  });

  return { todos, steps };
}
