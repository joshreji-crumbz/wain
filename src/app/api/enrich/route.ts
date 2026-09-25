import { getPlace } from "@/lib/data";
import {
  placeDetails,
  placeIdFromMapsUrl,
  photoUrl,
  searchText,
  siteLinks,
  type GooglePlace,
} from "@/lib/google";

export async function POST(request: Request) {
  const { id, query, lat, lng } = (await request.json()) as {
    id?: string;
    query?: string;
    lat?: number;
    lng?: number;
  };

  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return Response.json({ error: "GOOGLE_MAPS_API_KEY is not set" }, { status: 501 });
  }

  let google: GooglePlace | null = null;
  try {
    const seeded = id ? getPlace(id) : undefined;
    const placeId = seeded ? placeIdFromMapsUrl(seeded.links.maps) : null;
    if (placeId) {
      google = await placeDetails(placeId);
    } else {
      const text = query ?? seeded?.names.en;
      if (!text) return Response.json({ error: "id or query required" }, { status: 400 });
      const origin = {
        lat: lat ?? seeded?.lat ?? 24.5003,
        lng: lng ?? seeded?.lng ?? 54.3868,
      };
      google = (await searchText(text, origin))[0] ?? null;
    }
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }

  if (!google) return Response.json({ google: null, socials: null, photo: null });

  const [photo, socials] = await Promise.all([
    google.photos?.[0] ? photoUrl(google.photos[0].name) : Promise.resolve(null),
    siteLinks(google.websiteUri ?? ""),
  ]);

  return Response.json({
    google: {
      name: google.displayName?.text ?? "",
      address: google.formattedAddress ?? "",
      rating: google.rating ?? null,
      ratings_count: google.userRatingCount ?? null,
      price_level: google.priceLevel ?? "",
      website: google.websiteUri ?? "",
      phone: google.nationalPhoneNumber ?? "",
      maps: google.googleMapsUri ?? "",
      open_now: google.regularOpeningHours?.openNow ?? null,
      hours: google.regularOpeningHours?.weekdayDescriptions ?? [],
      reviews: (google.reviews ?? []).slice(0, 3).map((r) => ({
        author: r.authorAttribution?.displayName ?? "",
        rating: r.rating ?? null,
        text: r.originalText?.text ?? r.text?.text ?? "",
        lang: r.originalText?.languageCode ?? r.text?.languageCode ?? "",
      })),
    },
    socials,
    photo,
    source: "Google Places",
  });
}
