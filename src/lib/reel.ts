/** What a public video page tells us about itself before any model is involved. */
export type ReelMeta = {
  caption: string;
  creator: string;
  thumbnail: string | null;
  platform: string;
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

function platformOf(url: string): string {
  const h = new URL(url).hostname.replace(/^www\./, "");
  if (h.endsWith("tiktok.com")) return "TikTok";
  if (h.endsWith("instagram.com")) return "Instagram";
  if (h.endsWith("youtube.com") || h === "youtu.be") return "YouTube";
  return h;
}

/**
 * Instagram has no public oEmbed without a token and serves a login wall to
 * the page itself, but the embed view of a public post is still readable.
 */
function embedUrl(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([\w-]+)/i);
  return m ? `https://www.instagram.com/${m[1] === "reels" ? "reel" : m[1]}/${m[2]}/embed/captioned/` : null;
}

/** The handle is in the URL itself on TikTok, even when the page won't load. */
export function handleFromUrl(url: string): string {
  return url.match(/(?:tiktok\.com|youtube\.com)\/(@[\w.]+)/i)?.[1] ?? "";
}

function oembedEndpoint(url: string): string | null {
  const p = platformOf(url);
  if (p === "TikTok") return `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  if (p === "YouTube")
    return `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
  return null;
}

function meta(html: string, property: string): string {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`,
    "i",
  );
  return re.exec(html)?.[1] ?? "";
}

function decode(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/**
 * Reads the caption and creator straight from the platform: oEmbed where it is
 * public, otherwise the page's Open Graph tags. Returns null when the post is
 * private, removed or login-walled — we never guess in that case.
 */
export async function fetchReelMeta(url: string): Promise<ReelMeta | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  const platform = platformOf(url);

  const endpoint = oembedEndpoint(url);
  if (endpoint) {
    try {
      const res = await fetch(endpoint, { headers: { "User-Agent": UA } });
      if (res.ok) {
        const data = (await res.json()) as {
          title?: string;
          author_name?: string;
          author_url?: string;
          thumbnail_url?: string;
        };
        const handle = data.author_url?.match(/@[\w.]+/)?.[0] ?? data.author_name ?? "";
        if (data.title || handle)
          return {
            caption: data.title ?? "",
            creator: handle,
            thumbnail: data.thumbnail_url ?? null,
            platform,
          };
      }
    } catch {
      // fall through to the page scrape
    }
  }

  for (const target of [url, embedUrl(url)].filter((u): u is string => !!u)) {
    try {
      const res = await fetch(target, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      const caption = decode(meta(html, "og:description") || meta(html, "description"));
      const title = decode(meta(html, "og:title"));
      // The embed page carries the caption in the document, not in meta tags.
      const embedded = decode(
        html.match(/class="Caption"[\s\S]{0,4000}?<\/div>/i)?.[0]?.replace(/<[^>]+>/g, " ") ?? "",
      )
        .replace(/\s+/g, " ")
        .trim();
      const handle =
        html.match(/class="UsernameText">([^<]+)</i)?.[1] ??
        title.match(/@[\w.]+/)?.[0] ??
        handleFromUrl(url);
      if (!caption && !title && !embedded) continue;
      return {
        caption: [title, caption, embedded].filter(Boolean).join(" — ").slice(0, 1200),
        creator: handle.startsWith("@") || !handle ? handle : `@${handle}`,
        thumbnail: meta(html, "og:image") || null,
        platform,
      };
    } catch {
      // try the next candidate, then give up honestly
    }
  }
  return null;
}
