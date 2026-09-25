import { distanceMeters } from "./data";
import type { GooglePlace } from "./google";
import type { Place, SearchResult } from "./types";

export type Origin = { lat: number; lng: number };

export function seedRow(place: Place, origin: Origin | null): SearchResult {
  return {
    source: "wain",
    id: place.id,
    place_id: place.id,
    name_en: place.names.en,
    name_ar: place.names.ar,
    address: place.area,
    lat: place.lat,
    lng: place.lng,
    distance_m: origin ? Math.round(distanceMeters(origin, place)) : null,
    open_now: null,
    rating: null,
    ratings_count: null,
    seed: place,
  };
}

/** Google places without coordinates can't be mapped or measured, so drop them. */
export function googleRow(g: GooglePlace, origin: Origin): SearchResult | null {
  if (!g.location) return null;
  const point = { lat: g.location.latitude, lng: g.location.longitude };
  return {
    source: "google",
    id: g.id,
    place_id: g.id,
    name_en: g.displayName?.text ?? "",
    name_ar: "",
    address: g.formattedAddress ?? "",
    lat: point.lat,
    lng: point.lng,
    distance_m: Math.round(distanceMeters(origin, point)),
    open_now: g.regularOpeningHours?.openNow ?? null,
    rating: g.rating ?? null,
    ratings_count: g.userRatingCount ?? null,
    seed: null,
  };
}
