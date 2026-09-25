/** Helpers for creator links found by the web-search route. */

/** The brand's own account, offered when no creator posted a reel we can link. */
export type BrandProfile = { platform: string; handle: string; url: string };

const HOSTS = [
  "instagram.com",
  "tiktok.com",
  "youtube.com",
  "youtu.be",
  "x.com",
  "twitter.com",
];

export function host(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Social posts come first; food blogs are kept as a weaker fallback. */
export function isSocial(url: string): boolean {
  const h = host(url);
  return h !== null && HOSTS.some((s) => h === s || h.endsWith(`.${s}`));
}

/**
 * A profile page is not the post the user asked for, so an actual permalink
 * ("/video/…", "/reel/…", "/p/…", "watch?v=…") always outranks one.
 */
export function isPermalink(url: string): boolean {
  return /\/(?:video|reel|reels|p|shorts|status)\/|[?&]v=/i.test(url);
}

/**
 * Creators post about a chain, not a branch: searching "Tim Hortons - Galleria
 * Mall, Al Maryah Island" finds nothing, "Tim Hortons" finds everything. Google
 * prints the branch after a dash, comma or bracket, so cut there.
 */
export function brandName(name: string): string {
  const cut = name
    .split(/\s[-–—|]\s|[(（]|,/)[0]
    .replace(/\bbranch\b\s*$/i, "")
    .trim();
  return cut.length >= 3 ? cut : name.trim();
}

