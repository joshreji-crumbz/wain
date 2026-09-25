import { normaliseQuery } from "@/lib/brands";
import { places } from "@/lib/data";
import { searchText } from "@/lib/google";
import { matchPlace, normaliseName, sameName } from "@/lib/normalise";
import { googleRow, seedRow } from "@/lib/results";
import type { Place, SearchResult } from "@/lib/types";

const RADIUS_M = 5000;

/** Seeded places whose name, Arabic name, Arabizi or cuisine matches the query. */
function seedMatches(query: string): Place[] {
  const q = normaliseName(query);
  if (!q) return [];
  const hit = matchPlace(query, places);
  // A loose fuzzy hit on an unrelated brand ("kfc") would otherwise outrank
  // the real Google results, so only confident matches lead the list.
  const best = hit && (hit.method !== "fuzzy" || hit.score >= 0.7) ? hit : null;
  const byText = places.filter((p) => {
    const haystack = [
      p.names.en,
      p.names.ar,
      ...p.names.arabizi,
      ...p.cuisine,
      p.area,
      ...p.menu.map((m) => m.name_en),
    ]
      .map(normaliseName)
      .join(" ");
    return haystack.includes(q);
  });
  const ordered = best ? [best.place, ...byText.filter((p) => p.id !== best.place.id)] : byText;
  return ordered;
}

export async function POST(request: Request) {
  const { query, lat, lng } = (await request.json()) as {
    query: string;
    lat?: number;
    lng?: number;
  };
  if (!query?.trim()) return Response.json({ error: "query required" }, { status: 400 });

  const origin =
    typeof lat === "number" && typeof lng === "number" ? { lat, lng } : null;
  const normalised = normaliseQuery(query);

  const seeded = seedMatches(query).map((p) => seedRow(p, origin));
  const variants = seeded[0]?.seed
    ? [
        seeded[0].seed.names.en,
        seeded[0].seed.names.ar,
        ...seeded[0].seed.names.arabizi,
      ].filter(Boolean)
    : [];

  let google: SearchResult[] = [];
  let googleError: string | null = null;
  if (origin && process.env.GOOGLE_MAPS_API_KEY) {
    try {
      const found = await searchText(normalised.query, origin, RADIUS_M, 12);
      google = found
        .map((g) => googleRow(g, origin))
        .filter((g): g is SearchResult => !!g)
        .filter((g) => (g.distance_m ?? 0) <= RADIUS_M)
        .filter(
          (g) =>
            !seeded.some((s) => sameName(s.name_en, g.name_en)),
        )
        .sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0));
    } catch (e) {
      googleError = e instanceof Error ? e.message : String(e);
    }
  }

  // Seeded places carry menus and cultural tags, so they lead the list.
  const results = [...seeded, ...google];

  return Response.json({
    query,
    normalised: normalised.query,
    brand: normalised.brand,
    radius_m: RADIUS_M,
    results,
    variants,
    google_error: googleError,
    // Kept for the earlier three-spellings demo callers.
    match: seeded[0]?.seed
      ? { place: seeded[0].seed, method: "normalised", matched_on: seeded[0].name_en }
      : null,
  });
}
