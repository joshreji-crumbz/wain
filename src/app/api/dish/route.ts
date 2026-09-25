import { DISH_RADIUS_M, matchDish, type DishRead } from "@/lib/dishmatch";
import { askJson, imagePart, textPart } from "@/lib/llm";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    dish_en: { type: "string" },
    dish_ar: { type: "string" },
    cuisines: { type: "array", items: { type: "string" } },
    protein: { type: "string" },
    keywords: { type: "array", items: { type: "string" } },
  },
  required: ["dish_en", "dish_ar", "cuisines", "protein", "keywords"],
};

export async function POST(request: Request) {
  const { image, lat, lng } = (await request.json()) as {
    image: string;
    lat: number;
    lng: number;
  };

  if (!image) return Response.json({ error: "image required" }, { status: 400 });

  const dish = await askJson<DishRead>({
    instructions: `You identify a single dish from a photo of food, for a Gulf food discovery app.
Name the dish the way a menu in the UAE would name it, in English and in Arabic.
"cuisines" are the cuisines that typically serve it (e.g. lebanese, indian, japanese, american).
"keywords" are the words likely to appear in a menu line for this dish (main ingredient, cooking style, common menu synonyms), lowercase, at most six.
If the photo is not food, return empty strings and empty arrays.`,
    content: [textPart("What dish is this?"), imagePart(image)],
    schemaName: "dish_read",
    schema: SCHEMA,
  });

  if (!dish.dish_en) {
    return Response.json({ dish, radius_m: DISH_RADIUS_M, places: [] });
  }

  const hits = matchDish(dish, { lat, lng });

  return Response.json({ dish, radius_m: DISH_RADIUS_M, places: hits.slice(0, 8) });
}
