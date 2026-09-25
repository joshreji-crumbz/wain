import { places } from "@/lib/data";
import { matchPlace, normaliseName } from "@/lib/normalise";

export async function POST(request: Request) {
  const { query } = (await request.json()) as { query: string };
  if (!query?.trim()) return Response.json({ error: "query required" }, { status: 400 });

  const match = matchPlace(query, places);
  if (!match) return Response.json({ match: null, normalised: normaliseName(query) });

  const variants = [
    match.place.names.en,
    match.place.names.ar,
    ...match.place.names.arabizi,
    ...match.place.names.handles,
  ].filter(Boolean);

  return Response.json({
    match: {
      place: match.place,
      score: Math.round(match.score * 100) / 100,
      method: match.method,
      matched_on: match.matchedOn,
    },
    normalised: normaliseName(query),
    variants,
  });
}
