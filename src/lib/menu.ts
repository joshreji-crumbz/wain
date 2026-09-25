/** Reading a real menu off a restaurant's own pages: Places has no menu field. */

const UA = "Mozilla/5.0 (compatible; WAIN/1.0)";
const PAGE_CHARS = 12000;
const TOTAL_CHARS = 30000;

export type MenuSource = "official site" | "web" | "none";

export type FetchedMenu = {
  text: string;
  source_url: string;
};

function textOf(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** A page is only worth sending to the model if prices are actually on it. */
export function hasPrices(text: string): boolean {
  const hits = text.match(/(?:aed|درهم|dhs?)\s?\d{1,4}|\d{1,4}\s?(?:aed|درهم|dhs)/gi);
  return (hits?.length ?? 0) >= 3;
}

async function page(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    // A PDF menu can't be read as HTML; the link is still shown in the UI.
    if (!type.includes("html")) return null;
    return textOf(await res.text()).slice(0, PAGE_CHARS);
  } catch {
    return null;
  }
}

function candidates(website: string, menuLinks: string[]): string[] {
  const urls = [...menuLinks.slice(0, 3)];
  if (website) {
    urls.push(website);
    for (const path of ["menu", "menus", "our-menu", "food-menu"]) {
      try {
        urls.push(new URL(path, website.endsWith("/") ? website : `${website}/`).toString());
      } catch {
        // An unparseable website URL simply contributes no candidates.
      }
    }
  }
  return [...new Set(urls)].filter((u) => /^https?:\/\//i.test(u));
}

/**
 * Menus hide behind delivery links, a /menu path or the homepage itself, so try
 * each in turn and keep whatever actually quotes prices.
 */
export async function fetchMenuText(
  website: string,
  menuLinks: string[],
): Promise<FetchedMenu | null> {
  const urls = candidates(website, menuLinks);
  const pages = await Promise.all(urls.map(async (u) => ({ url: u, text: await page(u) })));

  const priced = pages.filter((p) => p.text && hasPrices(p.text));
  if (!priced.length) return null;

  let text = "";
  for (const p of priced) {
    if (text.length >= TOTAL_CHARS) break;
    text += `\n\n--- ${p.url} ---\n${p.text}`;
  }

  return { text: text.slice(0, TOTAL_CHARS), source_url: priced[0].url };
}
