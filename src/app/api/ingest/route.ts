import { places } from "@/lib/data";
import { askJson } from "@/lib/llm";
import { matchPlace } from "@/lib/normalise";

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

export async function POST(request: Request) {
  const { transcript, url } = (await request.json()) as {
    transcript: string;
    url?: string;
  };
  if (!transcript?.trim())
    return Response.json({ error: "transcript required" }, { status: 400 });

  const extraction = await askJson<Extraction>({
    instructions: `You extract structured data from Gulf food reel transcripts. The speech is often Khaleeji Arabic code-switched with English, or Arabizi ("el karak 3andhom 7elw").
Pull the restaurant name as spoken (any spelling), the main dish, the price in AED ("45 dirhams bas" = 45), and the area.
"language" is one of: ar-khaleeji, arabizi, en, mixed. Return empty strings and null for anything not stated.`,
    content: url ? `URL: ${url}\nTranscript: ${transcript}` : transcript,
    schemaName: "reel_extraction",
    schema: SCHEMA,
  });

  const match = matchPlace(extraction.place_guess, places);

  return Response.json({
    transcript,
    extraction,
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
