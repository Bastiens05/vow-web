import { suggestionsFromBan } from "@/lib/domain/address";

const sources = [
  (query: string) => `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(query)}&autocomplete=1&limit=5`,
  (query: string) => `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&autocomplete=1&limit=5`,
];

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 3) return Response.json({ suggestions: [] });
  for (const source of sources) {
    try {
      const response = await fetch(source(query), { cache: "no-store" });
      if (!response.ok) continue;
      const suggestions = suggestionsFromBan(await response.json());
      if (suggestions.length > 0) return Response.json({ suggestions });
    } catch {
      // The next public endpoint is the fallback.
    }
  }
  return Response.json({ suggestions: [] });
}
