import { askJson, askTextWithSearch } from "@/lib/llm";
import { fetchMenuText, type MenuSource } from "@/lib/menu";
import type { MenuItem } from "@/lib/types";

type Extracted = {
  items: {
    name_en: string;
    name_ar: string;
    price_aed: number;
    section: string;
    spicy: number;
    protein: string;
  }[];
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name_en: { type: "string" },
          name_ar: { type: "string" },
          price_aed: { type: "number" },
          section: { type: "string" },
          spicy: { type: "number" },
          protein: { type: "string" },
        },
        required: ["name_en", "name_ar", "price_aed", "section", "spicy", "protein"],
      },
    },
  },
  required: ["items"],
};

const EXTRACT = [
  "You read a restaurant's own pages and list the dishes that are priced there.",
  "Include an item only when both its name and its price appear in the text — never estimate a price, and never add a dish that is not written down.",
  "price_aed is the number in AED (convert only if the page states another currency and its rate is given; otherwise skip the item).",
  "name_ar is the Arabic name if the page shows one, otherwise a natural Gulf-Arabic rendering of the dish name.",
  "spicy is 0-3 based on what the description says, 0 when it says nothing. protein is beef, chicken, lamb, seafood, veg or ''.",
  "At most 30 items, favouring mains and signatures. Return an empty list if the text is not a menu.",
].join(" ");

const SEARCH = [
  "You find what a specific restaurant charges for its dishes.",
  "Search the live web for its menu on its own site, Deliveroo, Talabat, Zomato or a review page, and quote the dish names with the prices exactly as published, in AED.",
  "Say plainly if you cannot find a priced menu. Never estimate a price.",
].join(" ");

export async function POST(request: Request) {
  const { name, city, website, menu_links } = (await request.json()) as {
    name: string;
    city?: string;
    website?: string;
    menu_links?: string[];
  };

  if (!name?.trim()) return Response.json({ error: "name is required" }, { status: 400 });

  let source: MenuSource = "none";
  let sourceUrl = "";
  let text = "";

  const fetched = await fetchMenuText(website ?? "", menu_links ?? []);
  if (fetched) {
    source = "official site";
    sourceUrl = fetched.source_url;
    text = fetched.text;
  } else {
    try {
      text = await askTextWithSearch({
        instructions: SEARCH,
        content: `Restaurant: ${name}${city ? `, ${city}` : ""}. What is on their menu and what does each dish cost?`,
        city: city ?? "Abu Dhabi",
        country: "AE",
      });
      source = "web";
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : "menu lookup failed" },
        { status: 502 },
      );
    }
  }

  let extracted: Extracted;
  try {
    extracted = await askJson<Extracted>({
      instructions: EXTRACT,
      content: `Restaurant: ${name}\n\n${text}`,
      schemaName: "menu_items",
      schema: SCHEMA,
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "menu extraction failed" },
      { status: 502 },
    );
  }

  const items: MenuItem[] = extracted.items
    .filter((i) => i.name_en.trim() && i.price_aed > 0)
    .map((i) => ({
      name_en: i.name_en,
      name_ar: i.name_ar,
      variants: i.section ? [i.section] : [],
      price_aed: Math.round(i.price_aed),
      spicy: Math.max(0, Math.min(3, Math.round(i.spicy))),
      protein: i.protein,
      source: source === "official site" ? "official menu" : "menu found on the web",
    }));

  return Response.json({
    items,
    source: items.length ? source : "none",
    source_url: sourceUrl,
  });
}
