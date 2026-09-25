export type MenuItem = {
  name_en: string;
  name_ar: string;
  variants: string[];
  price_aed: number;
  spicy: number;
  protein: string;
  source: string;
};

export type PlaceTags = {
  family_section: boolean;
  shisha: boolean;
  suhoor: boolean;
  iftar_deal: boolean;
  halal: boolean;
  alcohol: boolean;
  pork: boolean;
  max_group: number;
};

export type Place = {
  id: string;
  sample?: boolean;
  names: {
    en: string;
    ar: string;
    arabizi: string[];
    handles: string[];
  };
  area: string;
  lat: number;
  lng: number;
  hours: string;
  tags: PlaceTags;
  price_band: string;
  cuisine: string[];
  links: { website: string; instagram: string; maps: string };
  menu: MenuItem[];
};

export type Post = {
  place_id: string;
  sample?: boolean;
  platform: string;
  url: string;
  creator: string;
  creator_region: string;
  lang: string;
  posted: string;
  transcript: string;
  dishes_mentioned: string[];
};

export type Register = "khaleeji" | "arabizi" | "english";

export type LocalisedText = {
  original: string;
  localised: string;
  flags: { halal: boolean | null; alcohol: boolean; pork: boolean };
  dish_notes: { dish: string; note: string }[];
  prices_aed: number[];
};

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** A row in the Explore list: either a seeded WAIN place or a Google result. */
export type SearchResult = {
  source: "wain" | "google";
  id: string;
  place_id: string;
  name_en: string;
  name_ar: string;
  address: string;
  lat: number;
  lng: number;
  distance_m: number | null;
  open_now: boolean | null;
  rating: number | null;
  ratings_count: number | null;
  seed: Place | null;
};
