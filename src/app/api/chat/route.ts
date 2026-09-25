import { WAIN_SYSTEM_PROMPT } from "@/lib/config";
import { getPlace } from "@/lib/data";
import { askJson } from "@/lib/llm";
import type { ChatMessage, SearchResult } from "@/lib/types";

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
  const { message, placeId, history, nearby } = (await request.json()) as {
    message: string;
    placeId?: string;
    history: ChatMessage[];
    nearby?: SearchResult[];
  };

  const place = placeId ? getPlace(placeId) : undefined;
  if (placeId && !place) return Response.json({ error: "unknown place" }, { status: 404 });

  const transcript = (history ?? [])
    .slice(-6)
    .map((m) => `${m.role === "user" ? "User" : "WAIN"}: ${m.content}`)
    .join("\n");

  // Without a selected place the nearby results are the only grounding we have,
  // so the model recommends places rather than dishes.
  const grounding = place
    ? `PLACE DATA (the only source of truth, JSON):\n${JSON.stringify(place)}\n\nAnswer the user's latest message. "dish_ids" must contain the exact name_en values of any dishes you recommend, and nothing else.`
    : `NEARBY PLACES (the only source of truth, JSON). No single place is selected, so recommend from these and say how far away they are. Never invent a place, a dish or a price:\n${JSON.stringify(
        (nearby ?? []).slice(0, 12).map((r) => ({
          name_en: r.name_en,
          name_ar: r.name_ar,
          address: r.address,
          distance_m: r.distance_m,
          rating: r.rating,
          open_now: r.open_now,
          menu: r.seed?.menu ?? [],
          has_menu: !!r.seed,
        })),
      )}\n\nLeave "dish_ids" empty unless the dish appears in one of the menus above.`;

  const result = await askJson<ChatResult>({
    instructions: `${WAIN_SYSTEM_PROMPT}\n\n${grounding}\n\n"register" is the register you replied in.`,
    content: `${transcript ? `${transcript}\n` : ""}User: ${message}`,
    schemaName: "wain_chat",
    schema: SCHEMA,
  });

  const menu = place
    ? place.menu
    : (nearby ?? []).flatMap((r) => r.seed?.menu ?? []);
  const dishes = menu.filter((m) => result.dish_ids.includes(m.name_en));

  return Response.json({ ...result, dishes, place_id: place?.id ?? null });
}
