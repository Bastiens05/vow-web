import type { Metadata } from "next";
import Link from "next/link";
import { Clock, FolderOpen, Users, Wallet, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { categoryLabel, isVendorCategory } from "@/lib/domain/categories";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReviewForm } from "@/components/wedding/review-form";
import { LineIcon, SettingsGroup, SettingsLink } from "@/components/wedding/settings-list";
import { canDeliver } from "@/lib/domain/trades";
import { countLabel, moneyStatus, questionStatus, sheetStatus } from "@/lib/domain/overview";
import { reminderKindLabel } from "@/lib/domain/reminders";
import { createClient } from "@/lib/supabase/server";
import { setReminders } from "@/server/actions/signatures";
import { formatEuros } from "@/lib/domain/money";
import { formatLongDate, formatSlotTime, todayIso } from "@/lib/domain/format";
import { countdownLabel, daysUntil } from "@/lib/domain/next-actions";
import { siteUrl } from "@/lib/env";
import { recommendVendor } from "@/server/actions/relay";
import { getWeddingSpace } from "@/server/data";

export const metadata: Metadata = { title: "Mariage" };

export default async function WeddingOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reco?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const space = await getWeddingSpace(id);
  const supabase = await createClient();
  const vendorIds = space.members.filter((member) => member.role === "vendor").map((member) => member.userId);
  const showGallery = canDeliver(space.actingAsCouple ? "couple" : space.role, space.session.vendor?.category ?? null);
  const showInvite = space.host;
  const [vendors, reminders, questions, items, practical, stops, quotes, invoices, documents, deliveries, invites, vendorInvites, budgetLines, weddingBudget, requests, slots] = await Promise.all([
    vendorIds.length
      ? supabase.from("vendor_profiles").select("id, business_name, user_id, category").in("user_id", vendorIds)
      : Promise.resolve({ data: [] as { id: string; business_name: string; user_id: string; category: string }[] }),
    supabase.from("reminders").select("id, milestone, kind").eq("wedding_id", id).order("created_at", { ascending: false }),
    supabase.from("questionnaires").select("id").eq("wedding_id", id),
    supabase.from("questionnaire_items").select("answer, questionnaire_id"),
    supabase.from("wedding_practical").select("ceremony_address, reception_address, postal_address, notes").eq("wedding_id", id).maybeSingle(),
    supabase.from("wedding_stops").select("id").eq("wedding_id", id),
    supabase.from("quotes").select("id").eq("wedding_id", id),
    supabase.from("invoices").select("status, amount_cents").eq("wedding_id", id),
    supabase.from("documents").select("id").eq("wedding_id", id),
    showGallery ? supabase.from("deliveries").select("id").eq("wedding_id", id) : Promise.resolve({ data: [] as { id: string }[] }),
    showInvite
      ? supabase.from("invitations").select("id").eq("wedding_id", id).is("accepted_at", null)
      : Promise.resolve({ data: [] as { id: string }[] }),
    supabase.from("invitations").select("id").eq("wedding_id", id).eq("invited_role", "vendor").is("accepted_at", null),
    supabase.from("budget_lines").select("amount_cents, paid").eq("wedding_id", id),
    supabase.from("wedding_budgets").select("total_cents").eq("wedding_id", id).maybeSingle(),
    supabase.from("wedding_document_requests").select("status").eq("wedding_id", id),
    supabase.from("timeline_slots").select("title, starts_at").eq("wedding_id", id).order("sort_order"),
  ]);
  const questionIds = new Set((questions.data ?? []).map((row) => row.id));
  const answers = (items.data ?? []).filter((row) => questionIds.has(row.questionnaire_id)).map((row) => row.answer);
  const sheet = practical.data;
  const filled = Boolean(
    sheet && [sheet.ceremony_address, sheet.reception_address, sheet.postal_address, sheet.notes].some((value) => value.trim()),
  );
  const deliveryIds = (deliveries.data ?? []).map((delivery) => delivery.id);
  const files = deliveryIds.length
    ? await supabase.from("delivery_files").select("id").in("delivery_id", deliveryIds)
    : { data: [] as { id: string }[] };
  const galleryCount = files.data?.length ?? 0;
  const fiche = space.actingAsCouple ? "Infos pratiques" : "Ma fiche";
  const vendorCount = space.members.filter((member) => member.role === "vendor").length;
  const documentCount = documents.data?.length ?? 0;
  const budgetText =
    space.role === "couple" || space.actingAsCouple
      ? "Privé"
      : moneyStatus((invoices.data ?? []).map((row) => row.status), quotes.data?.length ?? 0);
  const nextStep = countdownLabel(daysUntil(space.wedding.wedding_date, todayIso()));
  const vendorStat = vendorStatCard(vendorCount, vendorInvites.data?.length ?? 0);
  const documentStat = documentStatCard(requests.data ?? [], documentCount);
  const budgetStat = budgetStatCard(budgetLines.data ?? [], weddingBudget.data?.total_cents ?? null, invoices.data ?? [], budgetText);
  const stepStat = stepStatCard(slots.data ?? [], space.wedding.wedding_date, nextStep);
  return (
    <div className="grid gap-6">
      <div className="relative z-10 -mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard href={`/mariage/${id}/equipe`} icon={Users} title="Prestataires" {...vendorStat} />
        <SummaryCard href={`/mariage/${id}/documents`} icon={FolderOpen} title="Documents" {...documentStat} />
        <SummaryCard
          href={space.role === "couple" || space.actingAsCouple ? `/mariage/${id}/budget` : `/mariage/${id}/devis`}
          icon={Wallet}
          title="Budget"
          {...budgetStat}
        />
        <SummaryCard href={`/mariage/${id}/jour`} icon={Clock} title="Prochaine étape" {...stepStat} />
      </div>
      <Card>
        <h2 className="text-lg font-semibold tracking-tight">{space.role === "couple" || space.actingAsCouple ? "Prestataires" : "Membres"}</h2>
        <ul className="mt-4 space-y-2">
          {(space.role === "couple" || space.actingAsCouple ? space.members.filter((member) => member.role === "vendor") : space.members).map((member) => {
            const profile = (vendors.data ?? []).find((vendor) => vendor.user_id === member.userId);
            const trade = profile?.category && isVendorCategory(profile.category) ? categoryLabel(profile.category) : null;
            const coupleRow = (space.role === "couple" || space.actingAsCouple) && member.role === "vendor";
            const body = (
              <>
                <div>
                  <p className="font-medium">{profile?.business_name || member.fullName}</p>
                  <p className="text-sm text-muted">{coupleRow ? trade || "Métier à préciser" : member.email}</p>
                </div>
                {coupleRow ? null : (
                  <Badge>
                    {space.actingAsCouple && member.userId === space.session.userId
                      ? "Essai mariés"
                      : member.role === "vendor"
                        ? "Prestataire"
                        : "Couple"}
                  </Badge>
                )}
              </>
            );
            return (
              <li key={member.userId}>
                {coupleRow ? (
                  <Link href={`/mariage/${id}/messages?avec=${member.userId}`} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl px-1 transition active:scale-[0.99]">
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-center justify-between gap-3">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
        {space.role === "couple" || space.actingAsCouple ? (
          space.members.some((member) => member.role === "vendor") ? null : (
            <p className="mt-3 text-sm text-muted">Aucun prestataire pour l&apos;instant.</p>
          )
        ) : null}
      </Card>
      <section className="grid gap-5">
        {space.actingAsCouple || space.role === "couple" ? null : (
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Votre métier</h2>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{countdownLabel(daysUntil(space.wedding.wedding_date, todayIso()))}</p>
          <p className="mt-1 text-sm text-muted">Le jour J, les mariés tiennent les horaires. Vous suivez la version active.</p>
        </div>
        )}
        <SettingsGroup title="Préparer">
          {(questions.data ?? []).length === 0 && (space.role === "couple" || space.actingAsCouple) ? null : (
          <SettingsLink href={`/mariage/${id}/questions`} label="Questions" status={questionStatus(answers)} icon={<QuestionIcon />} />
          )}
          <SettingsLink href={`/mariage/${id}/pratique`} label={fiche} status={sheetStatus(filled)} icon={<SheetIcon />} />
          <SettingsLink
            href={`/mariage/${id}/carte`}
            label="Carte"
            status={countLabel(stops.data?.length ?? 0, "lieu", "lieux", "À compléter")}
            icon={<MapIcon />}
          />
        </SettingsGroup>
        <SettingsGroup title="Gérer">
          <SettingsLink
            href={`/mariage/${id}/devis`}
            label="Devis et factures"
            status={moneyStatus((invoices.data ?? []).map((row) => row.status), quotes.data?.length ?? 0)}
            icon={<InvoiceIcon />}
          />
          <SettingsLink
            href={`/mariage/${id}/documents`}
            label="Documents"
            status={countLabel(documents.data?.length ?? 0, "fichier", "fichiers")}
            icon={<FileIcon />}
          />
          {showGallery ? (
            <SettingsLink href={`/mariage/${id}/galerie`} label="Galerie" status={countLabel(galleryCount, "fichier", "fichiers")} icon={<CameraIcon />} />
          ) : null}
        </SettingsGroup>
        {space.actingAsCouple || space.role === "couple" ? (
          <SettingsGroup title="Mariage">
            <SettingsLink href={`/mariage/${id}/rsvp`} label="Réponses des invités" status="RSVP" icon={<PeopleIcon />} />
            <SettingsLink href={`/mariage/${id}/tables`} label="Plan de table" status="Tables" icon={<PeopleIcon />} />
            <SettingsLink href={`/mariage/${id}/budget`} label="Budget" status="Privé" icon={<InvoiceIcon />} />
            <SettingsLink href={`/mariage/${id}/site`} label="Page des mariés" status="Site" icon={<InviteIcon />} />
            <SettingsLink href={`/mariage/${id}/rdv`} label="Rendez-vous" status="Créneaux" icon={<MapIcon />} />
          </SettingsGroup>
        ) : null}
        <SettingsGroup title="Équipe">
          <SettingsLink
            href={`/mariage/${id}/equipe`}
            label="Équipe"
            status={countLabel(space.members.length, "personne", "personnes")}
            icon={<PeopleIcon />}
          />
          {showInvite ? (
            <SettingsLink
              href={`/mariage/${id}/inviter`}
              label="Inviter quelqu'un"
              status={countLabel(invites.data?.length ?? 0, "en attente", "en attente", "Aucune")}
              icon={<InviteIcon />}
            />
          ) : null}
        </SettingsGroup>
        <SettingsGroup title="Lieu">
          <SettingsLink href={`/mariage/${id}/pluie`} label="Plan pluie" status="Repli" icon={<MapIcon />} />
          <SettingsLink href={`/mariage/${id}/besoins`} label="Besoins techniques" status="Fiches" icon={<SheetIcon />} />
        </SettingsGroup>
        {showInvite || (reminders.data ?? []).length > 0 ? (
          <SettingsGroup title="Rappels">
            {showInvite ? (
              <form action={setReminders} className="flex min-h-11 items-center justify-between gap-3 border-b border-black/10 px-4">
                <span className="text-sm font-medium">Rappels avant le mariage</span>
                <input type="hidden" name="wedding_id" value={id} />
                <input type="hidden" name="enabled" value={space.wedding.reminders_enabled ? "off" : "on"} />
                <button
                  type="submit"
                  aria-pressed={space.wedding.reminders_enabled}
                  aria-label={space.wedding.reminders_enabled ? "Rappels activés" : "Rappels coupés"}
                  className={`relative h-7 w-12 shrink-0 rounded-full ${space.wedding.reminders_enabled ? "bg-ink" : "bg-black/15"}`}
                >
                  <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-ivory ${space.wedding.reminders_enabled ? "left-5" : "left-0.5"}`} />
                </button>
              </form>
            ) : null}
            {(reminders.data ?? []).map((reminder) => (
              <div key={reminder.id} className="flex min-h-11 items-center justify-between gap-3 border-b border-black/10 px-4 text-sm last:border-b-0">
                <span>{reminderKindLabel(reminder.kind)}</span>
                <span className="text-muted">J-{reminder.milestone}</span>
              </div>
            ))}
          </SettingsGroup>
        ) : null}
      </section>
      {space.actingAsCouple ? (
        <ReviewForm weddingId={id} vendors={(vendors.data ?? []).map((vendor) => ({ id: vendor.id, name: vendor.business_name }))} />
      ) : null}
      {space.role === "vendor" && !space.actingAsCouple && space.wedding.wedding_date < todayIso() ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">Recommander un confrère</h2>
          <p className="text-sm text-muted">Le lien compte les clics et les demandes de devis qui en viennent.</p>
          {query.reco ? <p className="break-all text-sm">{siteUrl()}/r/{query.reco}</p> : null}
          {(vendors.data ?? [])
            .filter((vendor) => vendor.user_id !== space.session.userId)
            .map((vendor) => (
              <form key={vendor.id} action={recommendVendor}>
                <input type="hidden" name="wedding_id" value={id} />
                <input type="hidden" name="vendor_id" value={vendor.id} />
                <Button type="submit" variant="secondary">
                  Lien pour {vendor.business_name}
                </Button>
              </form>
            ))}
        </Card>
      ) : null}
    </div>
  );
}

function QuestionIcon() {
  return (
    <LineIcon>
      <path d="M8 9a4 4 0 1 1 6.3 3.3c-.8.6-1.3 1.2-1.3 2.2" />
      <path d="M12 18h.1" />
    </LineIcon>
  );
}

function SheetIcon() {
  return (
    <LineIcon>
      <path d="M7 3h7l5 5v13H7V3Z" />
    </LineIcon>
  );
}

function MapIcon() {
  return (
    <LineIcon>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
      <circle cx="12" cy="11" r="1.6" />
    </LineIcon>
  );
}

function InvoiceIcon() {
  return (
    <LineIcon>
      <path d="M7 3h10v18l-2-1.2L13 21l-2-1.2L9 21l-2-1.2V3Z" />
      <path d="M9 8h6M9 12h6" />
    </LineIcon>
  );
}

function FileIcon() {
  return (
    <LineIcon>
      <path d="M7 3h7l5 5v13H7V3Z" />
      <path d="M14 3v5h5" />
    </LineIcon>
  );
}

function SummaryCard({
  href,
  icon: Icon,
  title,
  value,
  detail,
  progress,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  value: string;
  detail: string;
  progress: number | null;
}) {
  return (
    <Link href={href} className="rounded-[28px] border border-line bg-paper p-5 text-center shadow-[var(--vow-shadow)] transition active:scale-[0.99]">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-accent text-accent">
        <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
      </span>
      <p className="mt-4 text-base font-medium text-ink">{title}</p>
      <p className="mt-2 font-serif text-4xl font-normal leading-none text-ink">{value}</p>
      <p className="mt-2 text-sm leading-6 text-ink">{detail}</p>
      {progress === null ? null : (
        <span className="mt-4 block h-1.5 overflow-hidden rounded-full bg-accent-soft">
          <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.round(progress * 100)}%` }} />
        </span>
      )}
    </Link>
  );
}

function vendorStatCard(confirmed: number, waiting: number) {
  const expected = confirmed + waiting;
  if (expected === 0) return { value: "À ajouter", detail: "Aucun prestataire pour l'instant", progress: null };
  return {
    value: String(confirmed),
    detail: `${confirmed} confirmé${confirmed > 1 ? "s" : ""} sur ${expected}`,
    progress: confirmed / expected,
  };
}

function documentStatCard(requests: { status: string }[], files: number) {
  if (requests.length === 0) {
    if (files === 0) return { value: "À ajouter", detail: "Aucun document pour l'instant", progress: null };
    return { value: String(files), detail: files > 1 ? `${files} fichiers déposés` : "1 fichier déposé", progress: null };
  }
  const done = requests.filter((row) => row.status === "validated").length;
  const pending = requests.length - done;
  return {
    value: pending === 0 ? "À jour" : String(pending),
    detail: `${done} validé${done > 1 ? "s" : ""} sur ${requests.length}`,
    progress: done / requests.length,
  };
}

function budgetStatCard(
  lines: { amount_cents: number; paid: boolean }[],
  plannedTotal: number | null,
  invoices: { status: string; amount_cents: number }[],
  fallback: string,
) {
  const planned = lines.reduce((sum, line) => sum + line.amount_cents, 0) || plannedTotal || 0;
  const spent = lines.filter((line) => line.paid).reduce((sum, line) => sum + line.amount_cents, 0);
  if (planned > 0) {
    return { value: formatEuros(spent), detail: `sur ${formatEuros(planned)}`, progress: Math.min(1, spent / planned) };
  }
  const billed = invoices.reduce((sum, row) => sum + row.amount_cents, 0);
  const paid = invoices.filter((row) => row.status === "paid").reduce((sum, row) => sum + row.amount_cents, 0);
  if (billed > 0) {
    return { value: formatEuros(paid), detail: `sur ${formatEuros(billed)} facturé`, progress: Math.min(1, paid / billed) };
  }
  if (fallback === "Aucun" || fallback === "Privé") return { value: "À ajouter", detail: "Aucun montant prévu", progress: null };
  return { value: fallback, detail: "D'après les devis et factures", progress: null };
}

function stepStatCard(slots: { title: string; starts_at: string }[], weddingDate: string, countdown: string) {
  const next = slots[0];
  if (!next) return { value: "À ajouter", detail: formatLongDate(weddingDate), progress: null };
  const time = /^\d{2}:\d{2}/.test(next.starts_at) ? formatSlotTime(next.starts_at) : "";
  return { value: next.title, detail: time ? `${formatLongDate(weddingDate)} · ${time}` : countdown, progress: null };
}

function CameraIcon() {
  return (
    <LineIcon>
      <path d="M4 8h4l2-2h4l2 2h4v10H4V8Z" />
      <circle cx="12" cy="13" r="3" />
    </LineIcon>
  );
}

function PeopleIcon() {
  return (
    <LineIcon>
      <circle cx="9" cy="9" r="3" />
      <path d="M4 19c.6-2.5 2.5-4 5-4s4.4 1.5 5 4" />
    </LineIcon>
  );
}

function InviteIcon() {
  return (
    <LineIcon>
      <circle cx="10" cy="9" r="3" />
      <path d="M4 19c.6-2.5 2.6-4 6-4" />
      <path d="M17 11v6M14 14h6" />
    </LineIcon>
  );
}
