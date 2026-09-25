import seed from "../../data/seed.json";
import postsData from "../../data/posts.json";
import type { Place, Post } from "./types";

export const places = seed.places as Place[];
export const posts = postsData.posts as Post[];

export function getPlace(id: string): Place | undefined {
  return places.find((p) => p.id === id);
}

export function getPosts(placeId: string): Post[] {
  return posts.filter((p) => p.place_id === placeId);
}

const EARTH_RADIUS_M = 6371000;

export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function placesWithin(
  origin: { lat: number; lng: number },
  radiusM: number,
): Place[] {
  return places.filter((p) => distanceMeters(origin, p) <= radiusM);
}
