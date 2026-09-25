import { distanceMeters, placesWithin } from "@/lib/data";
import { askJson, imagePart, textPart } from "@/lib/llm";
import type { Place } from "@/lib/types";

const DISH_RADIUS_M = 5000;

type DishRead = {
  dish_en: string;
  dish_ar: string;
  cuisines: string[];
  protein: string;
  keywords: string[];
};

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

type Hit = {
  place: Place;
  distance_m: number;
  matched_items: { name_en: string; name_ar: string; price_aed: number; source: string }[];
  reason: "menu item" | "cuisine";
};

/**
 * A dish photo names no restaurant, so score every place on its own menu text.
 * Keywords are matched as whole phrases: splitting them into words makes
 * connectives ("with") and fragments ("chickpeas" inside "Chicken") match
 * every menu.
 */
function score(place: Place, dish: DishRead) {
  const needles = [dish.dish_en, dish.dish_ar, ...dish.keywords]
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length > 3);

  const matched = place.menu.filter((item) => {
    const text = `${item.name_en} ${item.name_ar} ${item.variants.join(" ")}`.toLowerCase();
    return needles.some((n) => text.includes(n));
  });

  const cuisineHit = place.cuisine.some((c) =>
    dish.cuisines.some((d) => c.toLowerCase().includes(d.toLowerCase())),
  );

  return { matched, cuisineHit };
}

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
  const hits: Hit[] = [];

  for (const place of placesWithin(origin, DISH_RADIUS_M)) {
    const { matched, cuisineHit } = score(place, dish);
    if (!matched.length && !cuisineHit) continue;
    hits.push({
      place,
      distance_m: Math.round(distanceMeters(origin, place)),
      matched_items: matched.map((m) => ({
        name_en: m.name_en,
        name_ar: m.name_ar,
        price_aed: m.price_aed,
        source: m.source,
      })),
      reason: matched.length ? "menu item" : "cuisine",
    });
  }

  hits.sort((a, b) => {
    if (a.matched_items.length !== b.matched_items.length) {
      return b.matched_items.length - a.matched_items.length;
    }
    return a.distance_m - b.distance_m;
  });

  return Response.json({ dish, radius_m: DISH_RADIUS_M, places: hits.slice(0, 8) });
}
