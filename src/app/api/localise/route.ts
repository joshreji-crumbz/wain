import { askJson } from "@/lib/llm";
import type { LocalisedText } from "@/lib/types";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    localised: { type: "string" },
    flags: {
      type: "object",
      additionalProperties: false,
      properties: {
        halal: { type: ["boolean", "null"] },
        alcohol: { type: "boolean" },
        pork: { type: "boolean" },
      },
      required: ["halal", "alcohol", "pork"],
    },
    dish_notes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { dish: { type: "string" }, note: { type: "string" } },
        required: ["dish", "note"],
      },
    },
    prices_aed: { type: "array", items: { type: "number" } },
  },
  required: ["localised", "flags", "dish_notes", "prices_aed"],
};

const INSTRUCTIONS: Record<string, string> = {
  khaleeji:
    "Rewrite the text in natural spoken Khaleeji Arabic (Gulf dialect), the way someone from Abu Dhabi actually talks. NEVER use Modern Standard Arabic. Use words like أبي، شو، وايد، زين، حار، هني. Keep it the same length and tone as the original.",
  english:
    "Rewrite the text in natural casual English, the way someone would caption a food video. Keep it the same length and tone as the original.",
  arabizi:
    "Rewrite the text in Gulf Arabizi (Arabic typed in Latin letters with digits: 3=ع, 7=ح, 5=خ, 2=ء). Keep it casual and the same length as the original.",
};

export async function POST(request: Request) {
  const { text, register } = (await request.json()) as {
    text: string;
    register: string;
  };
  if (!text) return Response.json({ error: "text required" }, { status: 400 });

  const style = INSTRUCTIONS[register] ?? INSTRUCTIONS.khaleeji;

  const result = await askJson<Omit<LocalisedText, "original">>({
    instructions: `You localise Gulf food content, you do not just translate it. ${style}
Convert any price to AED (1 USD = 3.67 AED, 1 SAR = 0.98 AED) and state it in AED.
Add a one-line explanation for any dish a non-local would not know.
Set flags only when the source text mentions halal status, alcohol or pork; otherwise halal is null and alcohol/pork are false.
Never invent facts that are not in the source text.`,
    content: text,
    schemaName: "localised_text",
    schema: SCHEMA,
  });

  return Response.json({ original: text, ...result } satisfies LocalisedText);
}
