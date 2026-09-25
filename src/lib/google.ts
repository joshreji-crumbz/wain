const PLACES = "https://places.googleapis.com/v1";

const DETAIL_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "priceLevel",
  "websiteUri",
  "nationalPhoneNumber",
  "googleMapsUri",
  "regularOpeningHours.weekdayDescriptions",
  "regularOpeningHours.openNow",
  "photos.name",
  "reviews.text",
  "reviews.rating",
  "reviews.originalText",
  "reviews.authorAttribution.displayName",
].join(",");

export type GooglePlace = {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  googleMapsUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[]; openNow?: boolean };
  photos?: { name: string }[];
  reviews?: {
    rating?: number;
    text?: { text: string; languageCode?: string };
    originalText?: { text: string; languageCode?: string };
    authorAttribution?: { displayName?: string };
  }[];
};

function key(): string {
  const k = process.env.GOOGLE_MAPS_API_KEY;
  if (!k) throw new Error("GOOGLE_MAPS_API_KEY is not set");
  return k;
}

/** Place ids are stored in the seed as `…/maps/place/?q=place_id:ChIJ…`. */
export function placeIdFromMapsUrl(url: string): string | null {
  const m = url.match(/place_id:([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

export async function placeDetails(placeId: string): Promise<GooglePlace> {
  const res = await fetch(`${PLACES}/places/${placeId}?languageCode=en`, {
    headers: { "X-Goog-Api-Key": key(), "X-Goog-FieldMask": DETAIL_FIELDS },
  });
  if (!res.ok) throw new Error(`places details ${res.status}: ${await res.text()}`);
  return res.json();
}

/**
 * "burger" ranked by relevance returns the most famous burger place in the
 * emirate, not the one across the mall, so dish searches ask for DISTANCE.
 */
export async function searchText(
  query: string,
  origin: { lat: number; lng: number },
  radiusM = 2000,
  maxResultCount = 5,
  rank: "RELEVANCE" | "DISTANCE" = "RELEVANCE",
): Promise<GooglePlace[]> {
  const res = await fetch(`${PLACES}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key(),
      "X-Goog-FieldMask": `places.${DETAIL_FIELDS.split(",").join(",places.")}`,
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: "en",
      maxResultCount,
      rankPreference: rank,
      locationBias: {
        circle: { center: { latitude: origin.lat, longitude: origin.lng }, radius: radiusM },
      },
    }),
  });
  if (!res.ok) throw new Error(`places searchText ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { places?: GooglePlace[] };
  return data.places ?? [];
}

/** Every kind of food vendor a pin on the map should stand for. */
const FOOD_TYPES = [
  "restaurant",
  "cafe",
  "coffee_shop",
  "bakery",
  "meal_takeaway",
  "ice_cream_shop",
  "juice_shop",
  "sandwich_shop",
  "dessert_shop",
];

/** Panning the map asks "what food is here?", which is a nearby, not a text, search. */
export async function searchNearbyFood(
  centre: { lat: number; lng: number },
  radiusM = 1500,
  maxResultCount = 20,
): Promise<GooglePlace[]> {
  const res = await fetch(`${PLACES}/places:searchNearby`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key(),
      "X-Goog-FieldMask": `places.${DETAIL_FIELDS.split(",").join(",places.")}`,
    },
    body: JSON.stringify({
      includedTypes: FOOD_TYPES,
      languageCode: "en",
      maxResultCount,
      rankPreference: "DISTANCE",
      locationRestriction: {
        circle: {
          center: { latitude: centre.lat, longitude: centre.lng },
          radius: Math.min(radiusM, 50000),
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`places searchNearby ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { places?: GooglePlace[] };
  return data.places ?? [];
}

export async function photoUrl(photoName: string, maxPx = 800): Promise<string | null> {
  const res = await fetch(
    `${PLACES}/${photoName}/media?maxHeightPx=${maxPx}&skipHttpRedirect=true&key=${key()}`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { photoUri?: string };
  return data.photoUri ?? null;
}

export type SiteLinks = {
  instagram: string;
  tiktok: string;
  menu_links: string[];
};

/**
 * Places has no menu field: the official site is the only authoritative hop to
 * a menu or a social handle, so read the homepage HTML and pull both out.
 */
export async function siteLinks(website: string): Promise<SiteLinks> {
  const empty: SiteLinks = { instagram: "", tiktok: "", menu_links: [] };
  if (!website) return empty;
  let html: string;
  try {
    const res = await fetch(website, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WAIN/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return empty;
    html = await res.text();
  } catch {
    return empty;
  }

  const first = (re: RegExp) => html.match(re)?.[0] ?? "";
  const instagram = first(/https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.]+/);
  const tiktok = first(/https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9_.]+/);

  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) =>
    m[1].replace(/&amp;/g, "&"),
  );
  const menu_links = [
    ...new Set(
      hrefs
        .map((h) => {
          try {
            return new URL(h, website);
          } catch {
            return null;
          }
        })
        .filter((u): u is URL => !!u && /^https?:$/.test(u.protocol))
        // Page builders inline their own asset URLs, which often contain the
        // word "menu"; only a human-facing page or PDF is a real menu link.
        .filter((u) => !/\.(css|js|mjs|json|png|jpe?g|svg|woff2?)$/i.test(u.pathname))
        .filter((u) => !/parastorage|gstatic|googleapis|cloudflare|wixstatic/i.test(u.hostname))
        .filter(
          (u) =>
            /menu|قائمة|\.pdf$/i.test(u.pathname) ||
            /deliveroo|talabat|zomato|noon|careem/i.test(u.hostname),
        )
        .map((u) => u.toString()),
    ),
  ].slice(0, 5);

  return { instagram, tiktok, menu_links };
}
