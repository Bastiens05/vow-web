import { createClient } from "@/lib/supabase/server";

const POINT = /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/;

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return Response.json({ minutes: null }, { status: 401 });
  const url = new URL(request.url);
  const start = url.searchParams.get("start")?.trim() ?? "";
  const end = url.searchParams.get("end")?.trim() ?? "";
  if (!POINT.test(start) || !POINT.test(end)) return Response.json({ minutes: null }, { status: 400 });
  const remote = new URL("https://data.geopf.fr/navigation/itineraire");
  remote.searchParams.set("resource", "bdtopo-osrm");
  remote.searchParams.set("profile", "car");
  remote.searchParams.set("optimization", "fastest");
  remote.searchParams.set("timeUnit", "minute");
  remote.searchParams.set("distanceUnit", "meter");
  remote.searchParams.set("start", start);
  remote.searchParams.set("end", end);
  try {
    const response = await fetch(remote, { cache: "no-store" });
    if (!response.ok) return Response.json({ minutes: null });
    const body = (await response.json()) as { duration?: unknown };
    const minutes = typeof body.duration === "number" && Number.isFinite(body.duration) ? Math.max(1, Math.round(body.duration)) : null;
    return Response.json({ minutes });
  } catch {
    return Response.json({ minutes: null });
  }
}
