/**
 * Swaps sample data for one "hero" place with real data.
 *
 *   node scripts/swap-hero.mjs hero.json
 *
 * hero.json:
 * {
 *   "placeId": "grand-beirut",
 *   "menu": [
 *     { "name_en": "Hummus Beiruti", "name_ar": "حمص بيروتي",
 *       "variants": ["classic"], "price_aed": 32, "spicy": 0, "protein": "vegetarian" }
 *   ],
 *   "posts": [
 *     { "platform": "instagram", "creator": "@realhandle", "creator_region": "gulf",
 *       "lang": "ar", "posted": "2025-09-01", "url": "https://instagram.com/p/…",
 *       "transcript": "…", "dishes_mentioned": ["Hummus Beiruti"] }
 *   ]
 * }
 *
 * Menu items get source "official menu"; posts get sample:false. Everything
 * else in seed.json / posts.json is left untouched and stays marked sample.
 */
import { readFileSync, writeFileSync } from "node:fs";

const [, , heroPath] = process.argv;
if (!heroPath) {
  console.error("usage: node scripts/swap-hero.mjs hero.json");
  process.exit(1);
}

const hero = JSON.parse(readFileSync(heroPath, "utf8"));
const seed = JSON.parse(readFileSync("data/seed.json", "utf8"));
const posts = JSON.parse(readFileSync("data/posts.json", "utf8"));

const place = seed.places.find((p) => p.id === hero.placeId);
if (!place) {
  console.error(`unknown placeId ${hero.placeId}`);
  process.exit(1);
}

if (hero.menu?.length) {
  place.menu = hero.menu.map((m) => ({
    name_en: m.name_en,
    name_ar: m.name_ar ?? "",
    variants: m.variants ?? [],
    price_aed: m.price_aed,
    spicy: m.spicy ?? 0,
    protein: m.protein ?? "",
    source: "official menu",
  }));
}

if (hero.posts?.length) {
  const others = posts.posts.filter((p) => p.place_id !== hero.placeId);
  const real = hero.posts.map((p) => ({
    place_id: hero.placeId,
    platform: p.platform,
    creator: p.creator,
    creator_region: p.creator_region ?? "gulf",
    lang: p.lang,
    posted: p.posted,
    url: p.url,
    transcript: p.transcript,
    dishes_mentioned: p.dishes_mentioned ?? [],
    sample: false,
  }));
  posts.posts = [...others, ...real];
}

writeFileSync("data/seed.json", `${JSON.stringify(seed, null, 2)}\n`);
writeFileSync("data/posts.json", `${JSON.stringify(posts, null, 2)}\n`);
console.log(
  `${hero.placeId}: ${place.menu.length} menu items (official menu), ` +
    `${posts.posts.filter((p) => p.place_id === hero.placeId).length} posts`,
);
