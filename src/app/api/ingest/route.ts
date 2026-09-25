import { normaliseQuery } from "@/lib/brands";
import { places } from "@/lib/data";
import { searchText } from "@/lib/google";
import { askJson, askTextWithSearch } from "@/lib/llm";
import { matchPlace, sameName } from "@/lib/normalise";
import { fetchReelMeta } from "@/lib/reel";
import { googleRow, seedRow } from "@/lib/results";
import type { SearchResult } from "@/lib/types";

type Extraction = {
  place_guess: string;
  dish: string;
  price_aed: number | null;
  area: string;
  language: string;
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    place_guess: { type: "string" },
    dish: { type: "string" },
    price_aed: { type: ["number", "null"] },
    area: { type: "string" },
    language: { type: "string" },
  },
  required: ["place_guess", "dish", "price_aed", "area", "language"],
};

const RADIUS_M = 5000;

/**
 * Reads the post's own caption and creator first, then searches the web to turn
 * that caption into a named venue. Never invents a restaurant when both fail.
 */
async function lookupReel(url: string): Promise<string> {
  const post = await fetchReelMeta(url);
  const known = post
    ? `Platform: ${post.platform}\nCreator: ${post.creator}\nCaption: ${post.caption}`
    : "The post page could not be read (private, removed or login-walled).";
  return askTextWithSearch({
    instructions:
      "You work out which restaurant a short food video is about. You are given whatever the post page itself says. Use the caption, hashtags and creator to search the live web and name the venue, its city or area, and the dishes and prices shown. State plainly what you could not find — never guess a restaurant name.",
    content: `Video link: ${url}\n${known}`,
    city: "Abu Dhabi",
    country: "AE",
  });
}

export async function POST(request: Request) {
  const { transcript, url, lat, lng } = (await request.json()) as {
    transcript?: string;
    url?: string;
    lat?: number;
    lng?: number;
  };
  if (!transcript?.trim() && !url?.trim())
    return Response.json({ error: "a reel link or transcript is required" }, { status: 400 });

  const looked = transcript?.trim() ? null : await lookupReel(url as string);
  const text = transcript?.trim() || (looked as string);

  const extraction = await askJson<Extraction>({
    instructions: `You extract structured data from Gulf food reels. The speech is often Khaleeji Arabic code-switched with English, or Arabizi ("el karak 3andhom 7elw").
Pull the restaurant name as spoken (any spelling), the main dish, the price in AED ("45 dirhams bas" = 45), and the area.
"language" is one of: ar-khaleeji, arabizi, en, mixed. Return empty strings and null for anything not stated.`,
    content: url ? `URL: ${url}\n${text}` : text,
    schemaName: "reel_extraction",
    schema: SCHEMA,
  });

  const hit = matchPlace(extraction.place_guess, places);
  // A loose fuzzy hit sends the user to the wrong restaurant, so only a
  // confident name match counts as the reel's place.
  const match = hit && (hit.method !== "fuzzy" || hit.score >= 0.7) ? hit : null;

  // What the reel points at is only useful if the user can open it, so the
  // place guess is searched near them the same way Explore does.
  const origin = typeof lat === "number" && typeof lng === "number" ? { lat, lng } : null;
  const query = extraction.place_guess || extraction.dish;
  let results: SearchResult[] = [];
  if (origin && query && process.env.GOOGLE_MAPS_API_KEY) {
    const seeded = match ? [seedRow(match.place, origin)] : [];
    try {
      const found = await searchText(normaliseQuery(query).query, origin, RADIUS_M, 8);
      results = [
        ...seeded,
        ...found
          .map((g) => googleRow(g, origin))
          .filter((g): g is SearchResult => !!g)
          .filter((g) => (g.distance_m ?? 0) <= RADIUS_M)
          .filter(
            (g) => !seeded.some((s) => sameName(s.name_en, g.name_en)),
          )
          .sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0)),
      ];
    } catch {
      results = seeded;
    }
  }

  return Response.json({
    transcript: text,
    from_web: looked !== null,
    extraction,
    results,
    match: match
      ? {
          place: match.place,
          confidence: Math.round(match.score * 100) / 100,
          method: match.method,
          matched_on: match.matchedOn,
        }
      : null,
  });
}
