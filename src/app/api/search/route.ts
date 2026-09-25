import { normaliseQuery } from "@/lib/brands";
import { distanceMeters, places } from "@/lib/data";
import { searchText } from "@/lib/google";
import { matchPlace, normaliseName } from "@/lib/normalise";
import type { Place, SearchResult } from "@/lib/types";

const RADIUS_M = 5000;

function seedRow(place: Place, origin: { lat: number; lng: number } | null): SearchResult {
  return {
    source: "wain",
    id: place.id,
    place_id: place.id,
    name_en: place.names.en,
    name_ar: place.names.ar,
    address: place.area,
    lat: place.lat,
    lng: place.lng,
    distance_m: origin ? Math.round(distanceMeters(origin, place)) : null,
    open_now: null,
    rating: null,
    ratings_count: null,
    seed: place,
  };
}

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
        .filter((g) => g.location)
        .map((g) => {
          const point = { lat: g.location!.latitude, lng: g.location!.longitude };
          return {
            source: "google" as const,
            id: g.id,
            place_id: g.id,
            name_en: g.displayName?.text ?? "",
            name_ar: "",
            address: g.formattedAddress ?? "",
            lat: point.lat,
            lng: point.lng,
            distance_m: Math.round(distanceMeters(origin, point)),
            open_now: g.regularOpeningHours?.openNow ?? null,
            rating: g.rating ?? null,
            ratings_count: g.userRatingCount ?? null,
            seed: null,
          };
        })
        .filter((g) => (g.distance_m ?? 0) <= RADIUS_M)
        .filter(
          (g) =>
            !seeded.some(
              (s) => normaliseName(s.name_en) === normaliseName(g.name_en),
            ),
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
