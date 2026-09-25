import { askJson, askTextWithSearch } from "@/lib/llm";
import type { Post } from "@/lib/types";
import { host, isSocial } from "@/lib/creators";

type Found = {
  posts: {
    platform: string;
    url: string;
    creator: string;
    lang: string;
    posted: string;
    summary: string;
    dishes_mentioned: string[];
    /** Where the post was seen, when the permalink itself isn't indexed. */
    source_url: string;
  }[];
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    posts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          platform: { type: "string" },
          url: { type: "string" },
          creator: { type: "string" },
          lang: { type: "string" },
          posted: { type: "string" },
          summary: { type: "string" },
          dishes_mentioned: { type: "array", items: { type: "string" } },
          source_url: { type: "string" },
        },
        required: [
          "platform",
          "url",
          "creator",
          "lang",
          "posted",
          "summary",
          "dishes_mentioned",
          "source_url",
        ],
      },
    },
  },
  required: ["posts"],
};

const SEARCH_INSTRUCTIONS = [
  "You research which food creators have posted about one specific restaurant.",
  "Search the live web for TikTok and Instagram reels, tagged posts and hashtag pages for this exact venue, then food blogs and review videos.",
  "List what you actually found: the creator's @handle, the platform, a link (the post permalink if one is indexed, otherwise the creator's profile page), the page you saw it on, roughly when it was posted, what they ordered or said, and the language.",
  "Prefer Gulf and Arabic-speaking creators. At most 6. Never invent a handle or a link.",
].join(" ");

/** The search pass answers in prose; a second pass turns it into rows. */
export async function POST(request: Request) {
  const { name, address, city } = (await request.json()) as {
    name: string;
    address?: string;
    city?: string;
  };
  if (!name) return Response.json({ error: "name is required" }, { status: 400 });

  const where = `${name}${address ? `, ${address}` : ""}${city ? `, ${city}` : ""}`;

  let found: Found;
  try {
    const notes = await askTextWithSearch({
      instructions: SEARCH_INSTRUCTIONS,
      content: `Restaurant: ${where}`,
      city: city ?? "Abu Dhabi",
      country: "AE",
    });
    found = await askJson<Found>({
      instructions:
        "Turn these research notes into rows. Use only handles and URLs that appear in the notes — never invent one, and drop any entry without a URL. lang is 'ar', 'arabizi' or 'en'. posted is YYYY-MM or 'unknown'. summary is one short line.",
      content: notes,
      schemaName: "creator_posts",
      schema: SCHEMA,
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "search failed" },
      { status: 502 },
    );
  }

  const posts: (Post & { summary: string; web: true; source_url: string })[] = found.posts
    .filter((p) => host(p.url) !== null)
    .sort((a, b) => Number(isSocial(b.url)) - Number(isSocial(a.url)))
    .map((p) => ({
      place_id: "",
      sample: false,
      web: true,
      platform: p.platform,
      url: p.url,
      creator: p.creator.startsWith("@") ? p.creator : `@${p.creator}`,
      creator_region: p.lang === "en" ? "other" : "gulf",
      lang: p.lang,
      posted: p.posted,
      transcript: p.summary,
      summary: p.summary,
      dishes_mentioned: p.dishes_mentioned,
      source_url: p.source_url,
    }));

  return Response.json({ posts });
}
