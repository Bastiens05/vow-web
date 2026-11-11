import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { isVendorCategory, categoryLabel } from "@/lib/domain/categories";
import {
  ASSISTANT_DAILY_LIMIT,
  clipText,
  coupleRemaining,
  parseProgrammeSlots,
  splitBudget,
} from "@/lib/domain/assistant";
import { questionTemplate } from "@/lib/domain/questions";
import { canSeeSheet } from "@/lib/domain/trades";
import { sortTimelineSlots } from "@/lib/domain/format";
import { createClient } from "@/lib/supabase/server";
import { getCoupleFocus, getWeddingSpace, listMessages, type WeddingSpace } from "@/server/data";

type Audience = "couple" | "vendor";

function audienceOf(space: WeddingSpace): Audience {
  return space.role === "couple" || space.actingAsCouple ? "couple" : "vendor";
}

async function consumeTurn(): Promise<"ok" | "limited" | "unavailable"> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consume_assistant_turn", { p_limit: ASSISTANT_DAILY_LIMIT });
  if (error || typeof data !== "number") return "unavailable";
  return data < 0 ? "limited" : "ok";
}

function tradeOf(space: WeddingSpace) {
  const category = space.session.vendor?.category;
  return category && isVendorCategory(category) ? category : null;
}

async function snapshot(space: WeddingSpace): Promise<string> {
  const supabase = await createClient();
  const audience = audienceOf(space);
  const category = tradeOf(space);
  const wedding = space.wedding;
  const [{ data: slots }, { data: practical }, { data: directory }] = await Promise.all([
    supabase.from("timeline_slots").select("title, starts_at, place, sort_order, created_at").eq("wedding_id", space.wedding.id),
    supabase
      .from("wedding_practical")
      .select("ceremony_address, reception_address, notes")
      .eq("wedding_id", space.wedding.id)
      .maybeSingle(),
    supabase.rpc("wedding_directory", { p_wedding_id: space.wedding.id }),
  ]);
  const ordered = sortTimelineSlots(
    (slots ?? []).map((slot) => ({
      title: slot.title,
      startsAt: slot.starts_at,
      place: slot.place,
      sortOrder: slot.sort_order,
      createdAt: slot.created_at,
    })),
  );
  const programme = ordered
    .slice(0, 12)
    .map((slot) => `${slot.startsAt.slice(0, 5)} ${slot.title}${slot.place ? ` · ${slot.place}` : ""}`)
    .join("\n");
  const vendors = (directory ?? [])
    .filter((person) => person.member_role === "vendor")
    .map((person) => {
      const trade = person.category && isVendorCategory(person.category) ? categoryLabel(person.category) : "Prestataire";
      return `${person.business_name || person.full_name} · ${trade} · ${person.user_id}`;
    });
  const lines = [
    `Mariage : ${space.title}, ${wedding.wedding_date}, ${[wedding.venue_name, wedding.venue_city].filter(Boolean).join(" ") || "lieu à préciser"}.`,
    `Rôle : ${audience === "couple" ? "mariés" : category ? categoryLabel(category) : "prestataire"}.`,
    programme ? `Programme :\n${programme}` : "Programme : aucun.",
    practical
      ? `Lieu : cérémonie ${clipText(practical.ceremony_address || "—", 120)} ; réception ${clipText(practical.reception_address || "—", 120)}.`
      : "Infos du lieu : pas encore renseignées.",
    vendors.length ? `Prestataires :\n${vendors.join("\n")}` : "Prestataires : aucun.",
  ];
  if (audience === "couple") {
    const focus = await getCoupleFocus(space.wedding.id);
    const { data: vault } = await supabase.from("vault_items").select("id").eq("wedding_id", space.wedding.id).limit(1);
    const { data: budget } = await supabase.from("wedding_budgets").select("total_cents").eq("wedding_id", space.wedding.id).maybeSingle();
    const open = coupleRemaining({ ...focus, weddingId: space.wedding.id, hasVault: (vault ?? []).length > 0 });
    lines.push(open.length ? `À faire : ${open.map((item) => item.label).join(", ")}.` : "À faire : rien d'ouvert.");
    lines.push(budget ? `Budget global : ${budget.total_cents / 100} €.` : "Budget global : non fixé.");
  } else {
    const messages = await listMessages(space.wedding.id, space.session.userId, space.session.userId);
    const recent = messages.slice(-6).map((message) => `${message.mine ? "Moi" : "Couple"} : ${clipText(message.body, 140)}`);
    if (recent.length) lines.push(`Derniers messages :\n${recent.join("\n")}`);
    if (category && canSeeSheet("vendor", category, "photos")) {
      const { data: groups } = await supabase.from("photo_groups").select("title").eq("wedding_id", space.wedding.id).order("sort_order").limit(12);
      lines.push(groups?.length ? `Groupes photo : ${groups.map((group) => group.title).join(", ")}.` : "Groupes photo : aucun.");
    }
    if (category && canSeeSheet("vendor", category, "guests")) {
      const { count } = await supabase.from("guests").select("id", { count: "exact", head: true }).eq("wedding_id", space.wedding.id);
      lines.push(`Invités notés : ${count ?? 0}.`);
    }
  }
  return lines.join("\n");
}

function instructions(audience: Audience): string {
  return [
    "Tu es l'assistant VOW. Tu vouvoies, en français, avec des phrases courtes et un ton calme.",
    "Tu ne vois que le contexte déjà filtré pour cette personne. Tu n'inventes aucun fait.",
    "Tu n'envoies aucun message et tu n'enregistres rien. Une proposition reste une proposition.",
    audience === "couple"
      ? "Outils : whatsLeft, proposeProgramme, draftVendorMessage, suggestBudget. Utilise-les dès que la demande correspond."
      : "Outils : summarizeWedding, draftReply, suggestChecklist. Utilise-les dès que la demande correspond.",
    "Après un outil, résume le résultat en une ou deux phrases. N'annonce jamais que c'est enregistré ou envoyé.",
  ].join("\n");
}

export async function prepareAssistant(weddingId: string | null): Promise<
  | { ok: false; status: number; message: string }
  | { ok: true; system: string; tools: ToolSet; activeTools: string[]; weddingId: string }
> {
  const turn = await consumeTurn();
  if (turn === "limited") return { ok: false, status: 429, message: "Vous avez atteint les 30 messages du jour. On reprend demain." };
  if (turn === "unavailable") return { ok: false, status: 503, message: "Assistant indisponible pour le moment." };
  if (!weddingId) return { ok: false, status: 400, message: "Assistant indisponible pour le moment." };
  let space: WeddingSpace;
  try {
    space = await getWeddingSpace(weddingId);
  } catch {
    return { ok: false, status: 404, message: "Assistant indisponible pour le moment." };
  }
  const audience = audienceOf(space);
  const context = await snapshot(space);
  const tools = audience === "couple" ? coupleTools(space) : vendorTools(space);
  return {
    ok: true,
    system: `${instructions(audience)}\n\nContexte :\n${context}`,
    tools,
    activeTools: Object.keys(tools),
    weddingId: space.wedding.id,
  };
}

function coupleTools(space: WeddingSpace): ToolSet {
  const weddingId = space.wedding.id;
  return {
    whatsLeft: tool({
      description: "Liste ce qu'il reste à faire pour ces mariés, uniquement avec les données qu'ils peuvent voir.",
      inputSchema: z.object({}),
      execute: async () => {
        const supabase = await createClient();
        const focus = await getCoupleFocus(weddingId);
        const { data: vault } = await supabase.from("vault_items").select("id").eq("wedding_id", weddingId).limit(1);
        const items = coupleRemaining({ ...focus, weddingId, hasVault: (vault ?? []).length > 0 });
        return { kind: "todo" as const, weddingId, items };
      },
    }),
    proposeProgramme: tool({
      description: "Propose un programme du jour J. N'enregistre rien. Le couple confirmera dans l'interface.",
      inputSchema: z.object({
        slots: z
          .array(
            z.object({
              title: z.string(),
              startsAt: z.string(),
              place: z.string().optional(),
              notes: z.string().optional(),
            }),
          )
          .min(2)
          .max(12),
      }),
      execute: async ({ slots }) => {
        const parsed = parseProgrammeSlots(slots);
        if (!parsed) return { kind: "note" as const, weddingId, text: "Le programme proposé n'est pas utilisable." };
        const supabase = await createClient();
        const { count } = await supabase.from("timeline_slots").select("id", { count: "exact", head: true }).eq("wedding_id", weddingId);
        return { kind: "programme" as const, weddingId, slots: parsed, hasSteps: (count ?? 0) > 0 };
      },
    }),
    draftVendorMessage: tool({
      description: "Rédige un brouillon pour un prestataire de ce mariage. N'envoie rien.",
      inputSchema: z.object({
        vendorUserId: z.string().uuid(),
        text: z.string().min(2).max(800),
      }),
      execute: async ({ vendorUserId, text }) => {
        const supabase = await createClient();
        const { data: directory } = await supabase.rpc("wedding_directory", { p_wedding_id: weddingId });
        const vendor = (directory ?? []).find((person) => person.member_role === "vendor" && person.user_id === vendorUserId);
        if (!vendor) return { kind: "note" as const, weddingId, text: "Ce prestataire n'est pas sur le mariage." };
        return {
          kind: "draft" as const,
          weddingId,
          vendorUserId,
          vendorName: vendor.business_name || vendor.full_name || "Prestataire",
          text: text.trim(),
        };
      },
    }),
    suggestBudget: tool({
      description: "Suggère une répartition du budget des mariés. N'enregistre rien.",
      inputSchema: z.object({}),
      execute: async () => {
        const supabase = await createClient();
        const { data } = await supabase.from("wedding_budgets").select("total_cents").eq("wedding_id", weddingId).maybeSingle();
        const total = data?.total_cents ?? 0;
        return { kind: "budget" as const, weddingId, totalCents: total, lines: splitBudget(total) };
      },
    }),
  };
}

function vendorTools(space: WeddingSpace): ToolSet {
  const weddingId = space.wedding.id;
  const category = tradeOf(space);
  return {
    summarizeWedding: tool({
      description: "Résume ce mariage avec les seules informations visibles pour ce métier.",
      inputSchema: z.object({}),
      execute: async () => ({ kind: "summary" as const, weddingId, text: await snapshot(space) }),
    }),
    draftReply: tool({
      description: "Rédige une réponse au couple. N'envoie rien.",
      inputSchema: z.object({ text: z.string().min(2).max(800) }),
      execute: async ({ text }) => ({
        kind: "draft" as const,
        weddingId,
        vendorUserId: space.session.userId,
        vendorName: "Le couple",
        text: text.trim(),
      }),
    }),
    suggestChecklist: tool({
      description: "Propose un questionnaire pour ce métier. Ne le crée pas tant que la personne n'a pas confirmé.",
      inputSchema: z.object({
        extra: z.array(z.string()).max(3).optional(),
      }),
      execute: async ({ extra }) => {
        const base = category ? questionTemplate(category) : questionTemplate("other");
        const added = (extra ?? []).map((prompt) => prompt.trim()).filter((prompt) => prompt.length >= 8 && prompt.length <= 160).slice(0, 3);
        return {
          kind: "checklist" as const,
          weddingId,
          title: category ? `Questions · ${categoryLabel(category)}` : "Questions",
          prompts: [...base, ...added].slice(0, 8),
        };
      },
    }),
  };
}
