import { distanceMeters, placesWithin } from "@/lib/data";
import { askJson, imagePart, textPart } from "@/lib/llm";
import { matchPlace } from "@/lib/normalise";

type SignRead = {
  sign_text_ar: string;
  sign_text_en: string;
  best_guess_name: string;
  cuisine_hint: string;
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    sign_text_ar: { type: "string" },
    sign_text_en: { type: "string" },
    best_guess_name: { type: "string" },
    cuisine_hint: { type: "string" },
  },
  required: ["sign_text_ar", "sign_text_en", "best_guess_name", "cuisine_hint"],
};

export async function POST(request: Request) {
  const { image, lat, lng } = (await request.json()) as {
    image: string;
    lat: number;
    lng: number;
  };

  if (!image) return Response.json({ error: "image required" }, { status: 400 });

  const origin = { lat, lng };
  const nearby = placesWithin(origin, 500);

  const sign = await askJson<SignRead>({
    instructions:
      "You read restaurant storefront signs in Gulf cities. Signs are often bilingual Arabic/English. Transcribe exactly what is on the sign, do not invent. If a field is not visible, return an empty string.",
    content: [
      textPart(
        "Read the restaurant sign in this photo. Return the Arabic text, the English text, and your single best guess at the restaurant name.",
      ),
      imagePart(image),
    ],
    schemaName: "sign_read",
    schema: SCHEMA,
  });

  const queries = [sign.best_guess_name, sign.sign_text_en, sign.sign_text_ar].filter(
    (q) => q && q.trim(),
  );

  let best = null as ReturnType<typeof matchPlace>;
  for (const q of queries) {
    const m = matchPlace(q, nearby);
    if (m && (!best || m.score > best.score)) best = m;
  }

  return Response.json({
    sign,
    nearby_count: nearby.length,
    match: best
      ? {
          place: best.place,
          confidence: Math.round(best.score * 100) / 100,
          method: best.method,
          matched_on: best.matchedOn,
          distance_m: Math.round(distanceMeters(origin, best.place)),
        }
      : null,
    alternatives: nearby
      .filter((p) => p.id !== best?.place.id)
      .slice(0, 2)
      .map((p) => ({ id: p.id, name: p.names.en, distance_m: Math.round(distanceMeters(origin, p)) })),
  });
}
