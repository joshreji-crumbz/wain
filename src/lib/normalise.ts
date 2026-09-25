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

function variantsOf(place: Place): string[] {
  return [
    place.names.en,
    place.names.ar,
    ...place.names.arabizi,
    ...place.names.handles,
  ].filter(Boolean);
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
      if (nv && (nv === nq || nv.includes(nq) || nq.includes(nv))) {
        return { place, score: 0.95, matchedOn: v, method: "normalised" };
      }
    }
  }

  const index = candidates.flatMap((place) =>
    variantsOf(place).map((v) => ({ place, variant: v, key: normaliseName(v) })),
  );
  const fuse = new Fuse(index, {
    keys: ["key"],
    includeScore: true,
    threshold: 0.45,
    ignoreLocation: true,
  });
  const [best] = fuse.search(nq);
  if (!best) return null;
  return {
    place: best.item.place,
    score: 1 - (best.score ?? 1),
    matchedOn: best.item.variant,
    method: "fuzzy",
  };
}
