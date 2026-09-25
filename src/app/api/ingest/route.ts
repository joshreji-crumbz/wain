import { normaliseQuery } from "@/lib/brands";
import { places } from "@/lib/data";
import { searchText } from "@/lib/google";
import { askJson, askTextWithSearch } from "@/lib/llm";
import { matchPlace, normaliseName, sameName } from "@/lib/normalise";
import { fetchReelMeta, handleFromUrl } from "@/lib/reel";
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

const DELIVERY = /https?:\/\/[^\s)\]"'<>]*\b(?:talabat|deliveroo|noon|careem|zomato|smiles)\b[^\s)\]"'<>]*/gi;

/** Order links only count when the research actually printed them. */
function deliveryLinks(text: string): string[] {
  return [...new Set((text.match(DELIVERY) ?? []).map((u) => u.replace(/[.,]+$/, "")))].slice(
    0,
    4,
  );
}

const STOP = new Set([
  "cafe",
  "caf",
  "restaurant",
  "the",
  "and",
  "bar",
  "kitchen",
  "house",
  "food",
  "uae",
  "dubai",
  "abu",
  "dhabi",
  "sharjah",
]);

/**
 * Google Text Search always answers, so "Culture Café" in Sharjah comes back as
 * every cafe near the user. Only rows that carry a distinctive word of the
 * reel's venue name are that venue.
 */
function namedLike(guess: string, name: string): boolean {
  if (sameName(guess, name)) return true;
  const words = normaliseName(guess)
    .split(" ")
    .filter((w) => w.length >= 4 && !STOP.has(w));
  const target = ` ${normaliseName(name)} `;
  return words.length > 0 && words.some((w) => target.includes(` ${w}`));
}

/**
 * Reads the post's own caption and creator first, then searches the web to turn
 * that caption into a named venue. Never invents a restaurant when both fail.
 */
async function lookupReel(url: string): Promise<{ text: string; read: boolean }> {
  const post = await fetchReelMeta(url);
  const handle = post?.creator || handleFromUrl(url);
  const known = post
    ? `Platform: ${post.platform}\nCreator: ${post.creator}\nCaption: ${post.caption}`
    : `The post page could not be read (private, removed or login-walled).${
        handle ? ` The creator handle in the link is ${handle}.` : ""
      } Search for the link itself and for what that creator has posted instead.`;
  const text = await askTextWithSearch({
    instructions:
      "You work out which restaurant a short food video is about. You are given whatever the post page itself says. Use the caption, hashtags and creator to search the live web and name the venue, its city or area, and the dishes and prices shown. State plainly what you could not find — never guess a restaurant name.",
    content: `Video link: ${url}\n${known}`,
    city: "Abu Dhabi",
    country: "AE",
  });
  return { text, read: post !== null };
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
  const text = transcript?.trim() || (looked as { text: string }).text;

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
          .filter((g) => !extraction.place_guess || namedLike(extraction.place_guess, g.name_en))
          .sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0)),
      ];
    } catch {
      results = seeded;
    }
  }

  // A link we couldn't read and couldn't place is a dead end the user has to be
  // told about, rather than a silent empty result.
  const unreadable = looked !== null && !looked.read;
  const hint =
    unreadable && !match && !results.length
      ? "That post is private, removed or not indexed, so I can't read it. Paste its caption or transcript, or send a screenshot of the video, and I'll find the place."
      : unreadable
        ? "I couldn't open that post itself, so this comes from what the web says about the link."
        : null;

  return Response.json({
    transcript: text,
    from_web: looked !== null,
    post_read: looked === null ? null : looked.read,
    hint,
    delivery: deliveryLinks(text),
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
