import { DISH_RADIUS_M, matchDish, type DishRead } from "@/lib/dishmatch";
import { searchText } from "@/lib/google";
import { askJson, imagePart, textPart } from "@/lib/llm";
import { sameName } from "@/lib/normalise";
import { googleRow } from "@/lib/results";
import type { SearchResult } from "@/lib/types";

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

  const origin = { lat, lng };
  const hits = matchDish(dish, origin);

  // Only seeded places have menus, so without Google the nearest real answer
  // is invisible whenever the dish isn't on one of those nine menus.
  let nearby: SearchResult[] = [];
  if (process.env.GOOGLE_MAPS_API_KEY) {
    try {
      const found = await searchText(dish.dish_en, origin, DISH_RADIUS_M, 10, "DISTANCE");
      nearby = found
        .map((g) => googleRow(g, origin))
        .filter((g): g is SearchResult => !!g)
        .filter((g) => (g.distance_m ?? 0) <= DISH_RADIUS_M)
        .filter(
          (g) =>
            !hits.some((h) => sameName(h.place.names.en, g.name_en)),
        )
        .sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0));
    } catch {
      nearby = [];
    }
  }

  return Response.json({
    dish,
    radius_m: DISH_RADIUS_M,
    places: hits.slice(0, 8),
    nearby,
  });
}
