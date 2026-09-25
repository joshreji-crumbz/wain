import { distanceMeters, places } from "@/lib/data";
import { searchNearbyFood } from "@/lib/google";
import { sameName } from "@/lib/normalise";
import { googleRow, seedRow } from "@/lib/results";
import type { SearchResult } from "@/lib/types";

const SEED_RADIUS_M = 2000;

/** Food vendors around wherever the user has just dragged the map to. */
export async function POST(request: Request) {
  const { lat, lng, radius_m } = (await request.json()) as {
    lat: number;
    lng: number;
    radius_m?: number;
  };
  if (typeof lat !== "number" || typeof lng !== "number") {
    return Response.json({ error: "lat and lng are required" }, { status: 400 });
  }

  const centre = { lat, lng };
  const radius = Math.min(Math.max(radius_m ?? 1500, 300), 20000);

  const seeded = places
    .filter((p) => distanceMeters(centre, p) <= Math.max(radius, SEED_RADIUS_M))
    .map((p) => seedRow(p, centre));

  let google: SearchResult[] = [];
  let googleError: string | null = null;
  if (process.env.GOOGLE_MAPS_API_KEY) {
    try {
      const found = await searchNearbyFood(centre, radius);
      google = found
        .map((g) => googleRow(g, centre))
        .filter((g): g is SearchResult => !!g)
        .filter((g) => !seeded.some((s) => sameName(s.name_en, g.name_en)));
    } catch (e) {
      googleError = e instanceof Error ? e.message : String(e);
    }
  }

  const results = [...seeded, ...google].sort(
    (a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0),
  );

  return Response.json({ results, radius_m: radius, google_error: googleError });
}
