import { WAIN_SYSTEM_PROMPT } from "@/lib/config";
import { getPlace } from "@/lib/data";
import { askJson } from "@/lib/llm";
import type { ChatMessage } from "@/lib/types";

type ChatResult = {
  reply: string;
  register: "khaleeji" | "arabizi" | "english";
  dish_ids: string[];
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply: { type: "string" },
    register: { type: "string", enum: ["khaleeji", "arabizi", "english"] },
    dish_ids: { type: "array", items: { type: "string" } },
  },
  required: ["reply", "register", "dish_ids"],
};

export async function POST(request: Request) {
  const { message, placeId, history } = (await request.json()) as {
    message: string;
    placeId: string;
    history: ChatMessage[];
  };

  const place = getPlace(placeId);
  if (!place) return Response.json({ error: "unknown place" }, { status: 404 });

  const transcript = (history ?? [])
    .slice(-6)
    .map((m) => `${m.role === "user" ? "User" : "WAIN"}: ${m.content}`)
    .join("\n");

  const result = await askJson<ChatResult>({
    instructions: `${WAIN_SYSTEM_PROMPT}

PLACE DATA (the only source of truth, JSON):
${JSON.stringify(place)}

Answer the user's latest message. "dish_ids" must contain the exact name_en values of any dishes you recommend, and nothing else. "register" is the register you replied in.`,
    content: `${transcript ? `${transcript}\n` : ""}User: ${message}`,
    schemaName: "wain_chat",
    schema: SCHEMA,
  });

  const dishes = place.menu.filter((m) => result.dish_ids.includes(m.name_en));

  return Response.json({ ...result, dishes, place_id: place.id });
}
