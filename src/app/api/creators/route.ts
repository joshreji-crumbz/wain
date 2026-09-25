import { askTextWithSearch } from "@/lib/llm";
import type { Post } from "@/lib/types";
import {
  type BrandProfile,
  brandName,
  host,
  isPermalink,
  isSocial,
} from "@/lib/creators";

export type WebPost = Post & { summary: string; web: true; source_url: string; exact: boolean };

const SEARCH_INSTRUCTIONS = [
  "You find public social posts about one restaurant brand.",
  "Search the live web for TikTok, Instagram and YouTube posts about this brand.",
  "Strongly prefer the post's own permalink (tiktok.com/@handle/video/..., instagram.com/reel/..., instagram.com/p/..., youtube.com/watch?v=... or /shorts/...). Only fall back to the creator's profile page when no permalink is indexed.",
  "Search by brand name only. The brand may have many branches, and a post about any branch counts — never add a mall, street or city to the search.",
  "Prefer Gulf and Arabic-speaking creators. Stop after 6 results — do not keep searching for more.",
  "Answer with nothing but data lines, one per post, in this exact pipe format and no other text:",
  "@handle | platform | url | ar|arabizi|en | YYYY-MM or unknown | one short line of what they ordered or said",
  "Never invent a handle or a URL. Output no lines at all if you found none.",
].join(" ");

/** Asked only when the creator search came back empty, so it stays one call in the good case. */
const BRAND_INSTRUCTIONS = [
  "Find the restaurant brand's own official TikTok and Instagram accounts, preferring its UAE/Gulf account over the global one.",
  "Answer with nothing but up to two lines in this exact pipe format and no other text:",
  "platform | url | @handle",
  "Never invent a handle or a URL. Output no lines at all if you found none.",
].join(" ");

/** Repeat opens of the same place shouldn't pay for the search again. */
const TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { at: number; posts: WebPost[]; brand: BrandProfile[] }>();

function parseBrand(notes: string): BrandProfile[] {
  const out: BrandProfile[] = [];
  for (const raw of notes.split("\n")) {
    const cols = raw.split("|").map((c) => c.trim());
    if (cols.length < 2 || !host(cols[1]) || !isSocial(cols[1])) continue;
    out.push({
      platform: cols[0].toLowerCase(),
      url: cols[1],
      handle: cols[2]?.startsWith("@") ? cols[2] : "",
    });
  }
  return out.filter((b, i, all) => all.findIndex((c) => c.url === b.url) === i).slice(0, 2);
}

function parse(notes: string): WebPost[] {
  const out: WebPost[] = [];
  for (const raw of notes.split("\n")) {
    const cols = raw.split("|").map((c) => c.trim());
    if (cols.length < 6) continue;
    const [handle, platform, url, lang, posted, ...rest] = cols;
    if (!host(url)) continue;
    const summary = rest.join(" | ");
    out.push({
      place_id: "",
      sample: false,
      web: true,
      platform: platform.toLowerCase(),
      url,
      creator: handle.startsWith("@") ? handle : `@${handle}`,
      creator_region: lang === "en" ? "other" : "gulf",
      lang: lang === "ar" || lang === "arabizi" ? lang : "en",
      posted: /^\d{4}-\d{2}$/.test(posted) ? posted : "unknown",
      transcript: summary,
      summary,
      dishes_mentioned: [],
      source_url: url,
      exact: isPermalink(url),
    });
  }
  return out;
}

/** One search pass that answers in parsable lines; a second one runs only when it found nothing. */
export async function POST(request: Request) {
  const { name, city } = (await request.json()) as {
    name: string;
    city?: string;
  };
  if (!name) return Response.json({ error: "name is required" }, { status: 400 });

  // A branch address narrows the search to nothing: creators post about the brand.
  const brandQuery = brandName(name);
  const hit = cache.get(brandQuery);
  if (hit && Date.now() - hit.at < TTL_MS)
    return Response.json({ posts: hit.posts, brand_profiles: hit.brand });

  let notes: string;
  try {
    notes = await askTextWithSearch({
      instructions: SEARCH_INSTRUCTIONS,
      content: `Restaurant brand: ${brandQuery}`,
      city: city ?? "Abu Dhabi",
      country: "AE",
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "search failed" },
      { status: 502 },
    );
  }

  const posts = parse(notes)
    .filter((p, i, all) => all.findIndex((q) => q.url === p.url) === i)
    .sort(
      (a, b) =>
        Number(b.exact) - Number(a.exact) ||
        Number(isSocial(b.url)) - Number(isSocial(a.url)),
    )
    .slice(0, 6);

  // Nothing from the creators: the brand's own feed is still worth showing.
  const brand = posts.length
    ? []
    : await askTextWithSearch({
        instructions: BRAND_INSTRUCTIONS,
        content: `Restaurant brand: ${brandQuery}`,
        city: city ?? "Abu Dhabi",
        country: "AE",
      })
        .then(parseBrand)
        .catch(() => []);

  cache.set(brandQuery, { at: Date.now(), posts, brand });
  return Response.json({ posts, brand_profiles: brand });
}
