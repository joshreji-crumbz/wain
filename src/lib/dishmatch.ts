import { distanceMeters, placesWithin } from "./data";
import type { Origin } from "./results";
import type { Place } from "./types";

export const DISH_RADIUS_M = 5000;

export type DishRead = {
  dish_en: string;
  dish_ar: string;
  cuisines: string[];
  protein: string;
  keywords: string[];
};

export type DishHit = {
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
  const name = `${dish.dish_en} ${dish.dish_ar}`.toLowerCase();
  const needles = [dish.dish_en, dish.dish_ar, ...dish.keywords]
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length > 3)
    // Ingredient keywords ("beef", "cheese") turn every steak into a burger,
    // so only words that name the dish itself count.
    .filter((k) => name.includes(k));

  const matched = place.menu.filter((item) => {
    const text = `${item.name_en} ${item.name_ar} ${item.variants.join(" ")}`.toLowerCase();
    return needles.some((n) => text.includes(n));
  });

  const cuisineHit = place.cuisine.some((c) =>
    dish.cuisines.some((d) => c.toLowerCase().includes(d.toLowerCase())),
  );

  return { matched, cuisineHit };
}

export function matchDish(dish: DishRead, origin: Origin, radiusM = DISH_RADIUS_M): DishHit[] {
  const hits: DishHit[] = [];

  for (const place of placesWithin(origin, radiusM)) {
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

  return hits;
}
