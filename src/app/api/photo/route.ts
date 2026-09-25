import { normaliseQuery } from "@/lib/brands";
import { distanceMeters, places, placesWithin } from "@/lib/data";
import { matchDish, type DishRead } from "@/lib/dishmatch";
import { searchText } from "@/lib/google";
import { askJson, imagePart, textPart } from "@/lib/llm";
import { matchPlace, normaliseName } from "@/lib/normalise";
import { googleRow, seedRow, type Origin } from "@/lib/results";
import type { SearchResult } from "@/lib/types";

const BRANCH_RADIUS_M = 5000;

type PhotoRead = {
  kind: "brand" | "dish" | "unclear";
  brand_name: string;
  sign_text_ar: string;
  sign_text_en: string;
  dish_en: string;
  dish_ar: string;
  cuisines: string[];
  keywords: string[];
  evidence: string;
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    kind: { type: "string", enum: ["brand", "dish", "unclear"] },
    brand_name: { type: "string" },
    sign_text_ar: { type: "string" },
    sign_text_en: { type: "string" },
    dish_en: { type: "string" },
    dish_ar: { type: "string" },
    cuisines: { type: "array", items: { type: "string" } },
    keywords: { type: "array", items: { type: "string" } },
    evidence: { type: "string" },
  },
  required: [
    "kind",
    "brand_name",
    "sign_text_ar",
    "sign_text_en",
    "dish_en",
    "dish_ar",
    "cuisines",
    "keywords",
    "evidence",
  ],
};

const INSTRUCTIONS = `You look at one photo taken by someone standing in a Gulf city and decide what it can be used to find.

Choose exactly one "kind":
- "brand": a restaurant name is legible anywhere in the photo — a storefront sign, a cup, a bag, a napkin, a receipt, a menu header, a delivery box. Gulf signs are often bilingual, and the Arabic is usually a transliteration of the brand rather than a translation.
- "dish": food is the subject and no brand name is legible.
- "unclear": neither a brand nor food can be made out.

Rules:
- Transcribe Arabic letter by letter exactly as written; never translate it into the Arabic field, and never invent letters. Leave a field empty rather than guessing.
- "brand_name" is the brand as it would be searched on a map, in English where you can (e.g. "كنتاكي" → "KFC").
- For a dish, name it the way a UAE menu would, and give at most six lowercase "keywords" likely to appear in a menu line for it.
- "evidence" is one short line naming what you actually saw and where, written for the user:
  - brand: "Found: KFC on the cup" / "Found: الفنار on the storefront sign"
  - dish: "Looks like shawarma — no brand visible"
  - unclear: "Can't make out a sign or a dish"`;

function brandResults(brand: string, origin: Origin) {
  const hit = matchPlace(brand, placesWithin(origin, BRANCH_RADIUS_M));
  const q = normaliseName(brand);
  const seeded = places
    .filter((p) => {
      const names = [p.names.en, p.names.ar, ...p.names.arabizi].map(normaliseName);
      return names.some((n) => n && (n.includes(q) || q.includes(n)));
    })
    .filter((p) => distanceMeters(origin, p) <= BRANCH_RADIUS_M);

  const ordered = hit && !seeded.some((p) => p.id === hit.place.id) ? [hit.place, ...seeded] : seeded;
  return ordered
    .map((p) => seedRow(p, origin))
    .sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0));
}

export async function POST(request: Request) {
  const { image, lat, lng } = (await request.json()) as {
    image: string;
    lat: number;
    lng: number;
  };

  if (!image) return Response.json({ error: "image required" }, { status: 400 });

  const origin = { lat, lng };
  const nearby = placesWithin(origin, 500);
  const candidates = nearby.map((p) => `${p.names.en} / ${p.names.ar}`).join("\n");

  const read = await askJson<PhotoRead>({
    instructions: INSTRUCTIONS,
    content: [
      textPart(
        `What can this photo be used to find?\n\nRestaurants standing within 500 m of the camera (use one of these exact names for brand_name if the photo clearly shows one of them):\n${
          candidates || "(none)"
        }`,
      ),
      imagePart(image),
    ],
    schemaName: "photo_read",
    schema: SCHEMA,
  });

  const sign = {
    sign_text_ar: read.sign_text_ar,
    sign_text_en: read.sign_text_en,
    best_guess_name: read.brand_name,
  };

  let googleError: string | null = null;
  async function google(query: string, seeded: SearchResult[]): Promise<SearchResult[]> {
    if (!process.env.GOOGLE_MAPS_API_KEY) return [];
    try {
      const found = await searchText(query, origin, BRANCH_RADIUS_M, 10);
      return found
        .map((g) => googleRow(g, origin))
        .filter((g): g is SearchResult => !!g)
        .filter((g) => (g.distance_m ?? 0) <= BRANCH_RADIUS_M)
        .filter(
          (g) => !seeded.some((s) => normaliseName(s.name_en) === normaliseName(g.name_en)),
        )
        .sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0));
    } catch (e) {
      googleError = e instanceof Error ? e.message : String(e);
      return [];
    }
  }

  // Tier 1 — a legible brand: show its branches, nearest first.
  if (read.kind === "brand" && read.brand_name.trim()) {
    const brand = normaliseQuery(read.brand_name).brand ?? read.brand_name;
    const seeded = brandResults(brand, origin);
    const results = [...seeded, ...(await google(brand, seeded))];
    const first = results[0];
    return Response.json({
      tier: "brand",
      evidence: read.evidence,
      brand,
      sign,
      radius_m: BRANCH_RADIUS_M,
      results,
      dish: null,
      google_error: googleError,
      nearby_count: nearby.length,
      // Kept for callers of the original sign-matching response.
      match: first?.seed
        ? {
            place: first.seed,
            confidence: 1,
            method: "brand",
            matched_on: brand,
            distance_m: first.distance_m,
          }
        : null,
    });
  }

  // Tier 2 — food only: who nearby serves it.
  if (read.kind === "dish" && read.dish_en.trim()) {
    const dish: DishRead = {
      dish_en: read.dish_en,
      dish_ar: read.dish_ar,
      cuisines: read.cuisines,
      protein: "",
      keywords: read.keywords,
    };
    const hits = matchDish(dish, origin, BRANCH_RADIUS_M).slice(0, 8);
    const seeded = hits.map((h) => seedRow(h.place, origin));
    const results = [
      ...seeded,
      ...(await google(`${read.dish_en} restaurant`, seeded)),
    ].slice(0, 12);

    return Response.json({
      tier: "dish",
      evidence: read.evidence,
      brand: null,
      sign,
      radius_m: BRANCH_RADIUS_M,
      dish: { dish_en: read.dish_en, dish_ar: read.dish_ar },
      matches: hits.map((h) => ({
        place_id: h.place.id,
        matched_items: h.matched_items,
        reason: h.reason,
      })),
      results,
      google_error: googleError,
      nearby_count: nearby.length,
      match: null,
    });
  }

  // Tier 3 — nothing usable: ask rather than guess.
  return Response.json({
    tier: "unclear",
    evidence: read.evidence || "Can't make out a sign or a dish",
    question: "Point at the sign, or at the plate — or type the name and I'll look it up.",
    brand: null,
    sign,
    dish: null,
    results: [],
    radius_m: BRANCH_RADIUS_M,
    google_error: googleError,
    nearby_count: nearby.length,
    match: null,
  });
}
