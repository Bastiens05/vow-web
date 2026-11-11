import { NextResponse } from "next/server";
import { textPdf } from "@/lib/domain/money";
import { needConflicts } from "@/lib/domain/needs";
import { createClient } from "@/lib/supabase/server";
import { getWeddingSpace } from "@/server/data";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const space = await getWeddingSpace(id);
  const supabase = await createClient();
  const [{ data: rows }, { data: limit }] = await Promise.all([
    supabase.from("technical_needs").select("*").eq("wedding_id", id),
    supabase.from("venue_limits").select("power_w").eq("wedding_id", id).maybeSingle(),
  ]);
  const names = new Map(space.members.map((member) => [member.userId, member.fullName]));
  const lines = [
    `Besoins techniques · ${space.title}`,
    limit?.power_w ? `Capacité du lieu : ${limit.power_w} W` : "Capacité du lieu non indiquée",
    "",
  ];
  for (const row of rows ?? []) {
    lines.push(
      `${names.get(row.user_id) || "Prestataire"} — ${row.vehicle || "véhicule ?"} — ${row.power_w} W — ${row.parking || "place ?"}`,
    );
  }
  const conflicts = needConflicts(
    (rows ?? []).map((row) => ({
      userId: row.user_id,
      name: names.get(row.user_id) || "Prestataire",
      accessStart: row.access_start,
      accessEnd: row.access_end,
      parking: row.parking,
      powerW: row.power_w,
    })),
    limit?.power_w ?? null,
  );
  if (conflicts.length) {
    lines.push("", "Conflits");
    conflicts.forEach((conflict) => lines.push(conflict.message));
  }
  const pdf = textPdf(lines);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="besoins-${id}.pdf"`,
    },
  });
}
