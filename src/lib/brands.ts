import { normaliseName } from "./normalise";

/**
 * Google Places matches Latin brand names far better than their Arabic or
 * Arabizi spellings, so a query typed the way a Gulf user says it is rewritten
 * to the brand's Latin name before it reaches Places.
 */
const BRANDS: Record<string, string[]> = {
  KFC: ["كنتاكي", "كنتاكى", "كي اف سي", "kentaki", "kentucky", "kfc"],
  "McDonald's": ["ماكدونالدز", "ماكدونالد", "ماك", "makdonalds", "mcdonalds", "mac"],
  "Burger King": ["برجر كنج", "برغر كنج", "burger king", "burjer king"],
  "Pizza Hut": ["بيتزا هت", "pizza hut", "bitza hat"],
  "Domino's Pizza": ["دومينوز", "دومينو", "dominos", "domino"],
  Subway: ["صب واي", "صبواي", "sub way", "subway"],
  Starbucks: ["ستاربكس", "ستارباکس", "starbux", "starbucks"],
  "Al Baik": ["البيك", "al baik", "albaik", "elbaik"],
  Herfy: ["هرفي", "herfy", "harfi"],
  Kudu: ["كودو", "kudu"],
  "Shake Shack": ["شيك شاك", "shake shack", "shek shak"],
  "Tim Hortons": ["تيم هورتنز", "تيم هورتون", "tim hortons"],
  "Costa Coffee": ["كوستا", "costa"],
  "Texas Chicken": ["تكساس تشيكن", "texas chicken"],
  "Hardee's": ["هارديز", "hardees"],
  Zuma: ["زوما", "zuma"],
  Novikov: ["نوفيكوف", "novikov"],
  "Din Tai Fung": ["دين تاي فونج", "din tai fung"],
  "Grand Beirut": ["غراند بيروت", "grand beirut", "grand bayroot"],
  "Asha's": ["أشاز", "اشاز", "ashas", "asha"],
};

const LOOKUP = new Map<string, string>();
for (const [brand, spellings] of Object.entries(BRANDS)) {
  for (const s of [brand, ...spellings]) LOOKUP.set(normaliseName(s), brand);
}

/** Generic Arabic food words that Places understands better in English. */
const WORDS: Record<string, string> = {
  مطعم: "restaurant",
  مطاعم: "restaurants",
  كافيه: "cafe",
  مقهى: "cafe",
  قهوة: "coffee",
  حلويات: "dessert",
  شاورما: "shawarma",
  برجر: "burger",
  بيتزا: "pizza",
  دجاج: "chicken",
  سمك: "seafood",
  فطور: "breakfast",
};

/**
 * A spoken question ("وين أقدر آكل برجر قريب مني") is not a Places query; the
 * dish or brand inside it is. These carry no search signal in either language.
 */
const FILLER = new Set(
  [
    "وين","فين","اين","أين","ابي","أبي","ابغى","أبغى","شو","ايش","إيش","وش","في","فيه",
    "قريب","قريبه","قريبة","مني","منى","هنا","اقرب","أقرب","من","على","عن","لو","سمحت",
    "ممكن","احسن","أحسن","افضل","أفضل","اكل","آكل","اروح","أروح","اقدر","أقدر","انا","أنا",
    "where","can","i","we","eat","get","go","find","near","nearby","me","around","here",
    "best","good","great","a","an","the","is","are","there","any","some","to","for","of",
    "what","whats","which","show","tell","want","looking","something","place","places","spot","spots",
  ].map(normaliseName),
);

/** Keeps the words that could name a brand, dish or cuisine. */
function stripFiller(words: string[]): string[] {
  const kept = words.filter((w) => !FILLER.has(normaliseName(w)));
  return kept.length ? kept : words;
}

export type NormalisedQuery = {
  /** What we send to Places. */
  query: string;
  /** Brand the query was recognised as, if any. */
  brand: string | null;
};

export function normaliseQuery(raw: string): NormalisedQuery {
  const trimmed = raw.trim();
  const brand = LOOKUP.get(normaliseName(trimmed));
  if (brand) return { query: brand, brand };

  // Short queries are already search terms; long ones are usually questions.
  const all = trimmed.split(/\s+/).map((w) => w.replace(/[؟?!.,،]+$/, ""));
  const words = all.length > 3 ? stripFiller(all) : all;
  const mapped = words.map((w) => LOOKUP.get(normaliseName(w)) ?? WORDS[w] ?? w);
  const hitBrand = words
    .map((w) => LOOKUP.get(normaliseName(w)))
    .find((b): b is string => !!b);

  return { query: mapped.join(" "), brand: hitBrand ?? null };
}
