import Fuse from "fuse.js";
import type { Place } from "./types";

const ARABIZI_DIGITS: Record<string, string> = {
  "2": "ا",
  "3": "ع",
  "5": "خ",
  "6": "ط",
  "7": "ح",
  "8": "ق",
  "9": "ص",
};

const AR_DIACRITICS = /[\u064B-\u0652\u0640]/g;

/**
 * Collapses Arabic, Arabizi and English spellings of the same name onto one
 * comparable string: diacritics dropped, alef/ya/ta-marbuta unified, Arabizi
 * digits mapped to their Arabic letters, and the al/el article stripped.
 */
export function normaliseName(input: string): string {
  let s = input.toLowerCase().trim();
  s = s.replace(AR_DIACRITICS, "");
  s = s.replace(/[\u0623\u0625\u0622\u0671]/g, "ا");
  s = s.replace(/\u0649/g, "ي");
  s = s.replace(/\u0629/g, "ه");
  s = s.replace(/\u0624/g, "و");
  s = s.replace(/\u0626/g, "ي");
  s = s.replace(/[0-9\u0660-\u0669]/g, (d) => {
    const ascii = d.charCodeAt(0) >= 0x0660 ? String(d.charCodeAt(0) - 0x0660) : d;
    return ARABIZI_DIGITS[ascii] ?? ascii;
  });
  s = s.replace(/^(al|el)[\s-]+/g, "");
  s = s.replace(/\bال/g, "");
  s = s.replace(/\b(al|el)\b/g, "");
  s = s.replace(/[^\p{L}\p{N}]+/gu, "");
  return s;
}

/**
 * Words that every second venue carries, so they must not be what two names
 * are judged similar on: "Ali Bhai Restaurant" fuzzy-matched Asha's purely
 * through its @ashasrestaurants handle.
 */
const GENERIC = new Set([
  "restaurant",
  "restaurants",
  "resto",
  "cafe",
  "cafes",
  "caffe",
  "coffee",
  "kitchen",
  "grill",
  "grills",
  "bbq",
  "house",
  "bar",
  "lounge",
  "bistro",
  "eatery",
  "food",
  "foods",
  "shop",
  "official",
  "uae",
  "dubai",
  "abudhabi",
  "sharjah",
  "the",
  "and",
  "by",
  "مطعم",
  "مطاعم",
  "كافيه",
  "مقهى",
]);

/** The part of a name that actually identifies the venue, normalised. */
export function distinctive(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/[@_.]+/g, " ")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w && !GENERIC.has(w));
  return normaliseName(words.join(" "));
}

function variantsOf(place: Place): string[] {
  return [
    place.names.en,
    place.names.ar,
    ...place.names.arabizi,
    ...place.names.handles,
  ].filter(Boolean);
}

/**
 * One name containing the other only means they are the same place when the
 * shorter one covers most of the longer: "Flamingo Room by tashas" happens to
 * contain "ashas", but it is not Asha's.
 */
function contains(a: string, b: string): boolean {
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return long.includes(short) && short.length / long.length >= 0.6;
}

/**
 * Google prints a branch suffix ("Grand Beirut restaurant The Galleria Mall")
 * where the seed carries the bare name, so exact equality double-lists a place.
 */
export function sameName(a: string, b: string): boolean {
  const [na, nb] = [normaliseName(a), normaliseName(b)];
  if (!na || !nb) return false;
  const [short, long] = na.length <= nb.length ? [na, nb] : [nb, na];
  return na === nb || (short.length >= 6 && long.startsWith(short));
}

export type MatchResult = {
  place: Place;
  score: number;
  matchedOn: string;
  method: "exact" | "normalised" | "fuzzy";
} | null;

export function matchPlace(query: string, candidates: Place[]): MatchResult {
  if (!query.trim() || candidates.length === 0) return null;

  for (const place of candidates) {
    for (const v of variantsOf(place)) {
      if (v.toLowerCase().trim() === query.toLowerCase().trim()) {
        return { place, score: 1, matchedOn: v, method: "exact" };
      }
    }
  }

  const nq = normaliseName(query);
  for (const place of candidates) {
    for (const v of variantsOf(place)) {
      const nv = normaliseName(v);
      if (nv && (nv === nq || contains(nv, nq))) {
        return { place, score: 0.95, matchedOn: v, method: "normalised" };
      }
    }
  }

  // Fuzzy matching only gets the distinctive part of each name; a shared
  // "restaurant" or "cafe" is not evidence of anything.
  const dq = distinctive(query);
  if (!dq) return null;

  // "Grand Beirut restaurant The Galleria Mall" is the branch printout of a
  // seeded name, which survives once the generic words are gone.
  for (const place of candidates) {
    for (const v of variantsOf(place)) {
      const dv = distinctive(v);
      if (dv.length >= 6 && (dq === dv || dq.startsWith(dv) || dv.startsWith(dq))) {
        return { place, score: 0.9, matchedOn: v, method: "normalised" };
      }
    }
  }

  const index = candidates
    .flatMap((place) =>
      variantsOf(place).map((v) => ({ place, variant: v, key: distinctive(v) })),
    )
    .filter((row) => row.key);
  const fuse = new Fuse(index, {
    keys: ["key"],
    includeScore: true,
    threshold: 0.45,
    ignoreLocation: true,
  });
  const [best] = fuse.search(dq);
  if (!best) return null;
  return {
    place: best.item.place,
    score: 1 - (best.score ?? 1),
    matchedOn: best.item.variant,
    method: "fuzzy",
  };
}
