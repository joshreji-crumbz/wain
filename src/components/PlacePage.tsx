"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import ChatBubble from "./ChatBubble";
import ChatDock from "./ChatDock";
import {
  BackIcon,
  BookmarkIcon,
  ChevronIcon,
  DirectionsIcon,
  DotsIcon,
  InstagramIcon,
  MenuIcon,
  PhoneIcon,
  PlayIcon,
  ShareIcon,
  VerifiedIcon,
  WebsiteIcon,
} from "./icons";
import type { BrandProfile } from "@/lib/creators";
import type { ChatMessage, MenuItem, Post, SearchResult } from "@/lib/types";
import { Spinner, dishImage, isRtl, metres } from "./ui";

export type Enrichment = {
  google: {
    name: string;
    address: string;
    rating: number | null;
    ratings_count: number | null;
    price_level: string;
    website: string;
    phone: string;
    maps: string;
    open_now: boolean | null;
    hours: string[];
    reviews: { author: string; rating: number | null; text: string; lang: string }[];
  } | null;
  socials: { instagram: string; tiktok: string; menu_links: string[] } | null;
  photo: string | null;
  photos?: string[];
};

export type RankedPost = Post & { summary: string };

/** What the camera produced, when the user arrived here from a photo. */
export type Saw = {
  photo: string;
  dish: string | null;
  item: { name_en: string; price_aed: number } | null;
};

/** Names an order button after the app it opens. */
function orderName(url: string): string {
  const host = url.match(/https?:\/\/(?:www\.)?([^/]+)/)?.[1] ?? "";
  const app = ["talabat", "deliveroo", "noon", "careem", "zomato", "smiles"].find((p) =>
    host.includes(p),
  );
  return app ? app[0].toUpperCase() + app.slice(1) : host;
}

function Action({
  href,
  icon,
  label,
  primary,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  if (!href) return null;
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noreferrer"
      className={`flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-3 text-[11px] font-medium ${
        primary
          ? "bg-[#F2A23A] text-black"
          : "glass text-white/90"
      }`}
    >
      {icon}
      {label}
    </a>
  );
}

export default function PlacePage({
  result,
  enrich,
  posts,
  mostOrdered,
  findingCreators,
  brandProfiles,
  liveMenu,
  findingMenu,
  saw,
  onBack,
  onOtherBranches,
  otherBranches,
  chat,
}: {
  result: SearchResult;
  enrich: Enrichment | null;
  posts: RankedPost[];
  mostOrdered: { dish: string; count: number } | null;
  findingCreators: boolean;
  brandProfiles: BrandProfile[];
  /** Menu read off the place's own pages, for places with no seeded menu. */
  liveMenu: { items: MenuItem[]; source: string } | null;
  findingMenu: boolean;
  saw: Saw | null;
  onBack: () => void;
  onOtherBranches?: () => void;
  otherBranches?: number;
  chat: {
    messages: ChatMessage[];
    dishes: MenuItem[];
    input: string;
    setInput: (v: string) => void;
    send: (text: string) => void;
    mic: () => void;
    onSpeak: (text: string) => void;
    speaking: string | null;
    listening: boolean;
    busy: boolean;
  };
}) {
  const [fullMenu, setFullMenu] = useState(false);
  const menu = useMemo(
    () => (result.seed?.menu.length ? result.seed.menu : (liveMenu?.items ?? [])),
    [result.seed, liveMenu],
  );
  const menuNote = result.seed?.menu.length
    ? "sample menu"
    : liveMenu?.source === "official site"
      ? "from their website"
      : liveMenu
        ? "menu found on the web"
        : "";

  const g = enrich?.google;
  const rating = result.rating ?? g?.rating ?? null;
  const openNow = result.open_now ?? g?.open_now ?? null;
  const maps =
    g?.maps ||
    result.seed?.links.maps ||
    `https://www.google.com/maps/search/?api=1&query=${result.lat},${result.lng}`;
  const menuLink = enrich?.socials?.menu_links[0] || result.seed?.links.website || "";
  // Delivery pages are the one link people actually want after the map.
  const order = (enrich?.socials?.menu_links ?? []).filter((l) =>
    /talabat|deliveroo|noon|careem|zomato|smiles/i.test(l),
  );
  const instagram = enrich?.socials?.instagram || result.seed?.links.instagram || "";
  const website = g?.website || result.seed?.links.website || "";
  const phone = g?.phone ? `tel:${g.phone.replace(/\s/g, "")}` : "";
  const hero = enrich?.photo ?? saw?.photo ?? null;
  const thumbs = (enrich?.photos ?? []).filter((p) => p !== hero).slice(0, 2);
  const priceBand =
    result.seed?.price_band ??
    { PRICE_LEVEL_INEXPENSIVE: "$", PRICE_LEVEL_MODERATE: "$$", PRICE_LEVEL_EXPENSIVE: "$$$", PRICE_LEVEL_VERY_EXPENSIVE: "$$$$" }[
      g?.price_level ?? ""
    ] ??
    "";
  const cuisine = (result.seed?.cuisine ?? []).slice(0, 2).join(" · ");
  const meta = [result.address.split(",")[0], result.distance_m !== null ? metres(result.distance_m) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#0B0907] text-white">
      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        <div className="relative h-60 w-full">
          {hero ? (
            <Image
              src={hero}
              alt={result.name_en}
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-b from-[#2a1f14] to-[#0B0907]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-[#0B0907]" />

          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 pt-[calc(env(safe-area-inset-top)+12px)]">
            <button
              onClick={onBack}
              aria-label="Back"
              className="rounded-full bg-black/40 p-2 text-white backdrop-blur"
            >
              <BackIcon />
            </button>
            <div className="flex gap-2 text-white">
              <span className="rounded-full bg-black/40 p-2 backdrop-blur">
                <BookmarkIcon />
              </span>
              <span className="rounded-full bg-black/40 p-2 backdrop-blur">
                <ShareIcon />
              </span>
              <span className="rounded-full bg-black/40 p-2 backdrop-blur">
                <DotsIcon />
              </span>
            </div>
          </div>

          {thumbs.length > 0 && (
            <div className="absolute bottom-16 right-3 flex gap-2">
              {thumbs.map((t) => (
                <Image
                  key={t}
                  src={t}
                  alt=""
                  width={64}
                  height={80}
                  unoptimized
                  className="h-20 w-16 rounded-xl border border-white/20 object-cover"
                />
              ))}
            </div>
          )}
        </div>

        <div className="relative z-10 -mt-6 px-4">
          <h1 className="flex items-center gap-2 text-[26px] font-bold leading-tight">
            {result.name_en}
            {result.source === "wain" && (
              <VerifiedIcon className="h-5 w-5 text-[#F2A23A]" />
            )}
          </h1>
          {result.name_ar && (
            <p dir="rtl" className="text-left text-lg text-[#A89F94]">
              {result.name_ar}
            </p>
          )}
          <p className="mt-1 truncate text-sm text-[#A89F94]">{meta}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm">
            {priceBand && <span className="text-[#A89F94]">{priceBand}</span>}
            {cuisine && <span className="text-[#A89F94]">{cuisine}</span>}
            {rating !== null && (
              <span className="text-[#F2A23A]">
                ★ {rating}
                {result.ratings_count ? (
                  <span className="text-[#A89F94]"> ({result.ratings_count})</span>
                ) : null}
              </span>
            )}
            {openNow !== null && (
              <span className={openNow ? "text-emerald-400" : "text-rose-400"}>
                ● {openNow ? "Open now" : "Closed"}
              </span>
            )}
          </p>

          <div className="mt-4 flex gap-2">
            <Action
              href={maps}
              icon={<DirectionsIcon />}
              label="Directions"
              primary
            />
            <Action href={menuLink} icon={<MenuIcon />} label="Menu" />
            <Action href={instagram} icon={<InstagramIcon />} label="Instagram" />
            <Action
              href={website || phone}
              icon={website ? <WebsiteIcon /> : <PhoneIcon />}
              label={website ? "Website" : "Call"}
            />
          </div>

          {order.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {order.map((l) => (
                <a
                  key={l}
                  href={l}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-[#F2A23A]/40 bg-[#F2A23A]/10 px-3 py-1 text-xs text-[#F2A23A]"
                >
                  Order on {orderName(l)}
                </a>
              ))}
            </div>
          )}

          {otherBranches ? (
            <button
              onClick={onOtherBranches}
              className="mt-3 flex w-full items-center justify-between rounded-2xl px-1 text-sm text-[#F2A23A]"
            >
              {otherBranches} other branches nearby
              <ChevronIcon className="h-4 w-4" />
            </button>
          ) : null}

          {saw && (
            <section className="mt-5">
              <h2 className="text-[15px] font-semibold">You saw</h2>
              <div className="glass mt-2 flex items-center gap-3 p-3">
                <Image
                  src={saw.photo}
                  alt=""
                  width={56}
                  height={56}
                  unoptimized
                  className="h-14 w-14 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1 text-sm">
                  {saw.item ? (
                    <>
                      <p className="text-[#A89F94]">This looks like their</p>
                      <p className="truncate font-semibold">{saw.item.name_en}</p>
                      <p className="text-[#A89F94]">
                        AED {saw.item.price_aed} (from menu)
                      </p>
                    </>
                  ) : (
                    <p className="truncate">
                      <span className="text-[#A89F94]">You saw: </span>
                      {saw.dish ?? "this place"}
                    </p>
                  )}
                </div>
                <ChevronIcon className="h-5 w-5 shrink-0 text-[#A89F94]" />
              </div>
            </section>
          )}

          <section className="mt-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[15px] font-semibold">
                What to try
                {menuNote && (
                  <span className="ml-2 text-[11px] font-normal text-[#A89F94]">
                    {menuNote}
                  </span>
                )}
              </h2>
              {menu.length > 0 && (
                <button
                  onClick={() => setFullMenu((v) => !v)}
                  className="text-xs text-[#F2A23A]"
                >
                  {fullMenu ? "Show less" : "See full menu →"}
                </button>
              )}
            </div>

            {menu.length === 0 && findingMenu ? (
              <div className="glass mt-2 flex items-center gap-2 p-4 text-sm text-[#A89F94]">
                <Spinner /> looking for their menu…
              </div>
            ) : menu.length === 0 ? (
              <button
                onClick={() => chat.send("شو عندهم؟ what do you know about this place?")}
                className="glass mt-2 flex w-full items-center justify-between p-4 text-left text-sm"
              >
                No menu yet — ask WAIN
                <ChevronIcon className="h-4 w-4 text-[#A89F94]" />
              </button>
            ) : fullMenu ? (
              <ul className="mt-2 space-y-1.5">
                {menu.map((m) => (
                  <li
                    key={m.name_en}
                    className="glass flex items-center justify-between px-3 py-2.5 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {m.name_en} <span dir="rtl">· {m.name_ar}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-[#F2A23A]">
                      AED {m.price_aed}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="no-scrollbar mt-2 flex gap-3 overflow-x-auto pb-1">
                {menu.slice(0, 8).map((m) => (
                  <li key={m.name_en} className="w-32 shrink-0">
                    <Image
                      src={dishImage(`${m.name_en} ${m.name_ar}`)}
                      alt={m.name_en}
                      width={160}
                      height={120}
                      className="h-24 w-32 rounded-2xl object-cover"
                    />
                    <p className="mt-1.5 truncate text-[13px] font-medium">
                      {m.name_en}
                    </p>
                    <p className="text-[12px] text-[#A89F94]">AED {m.price_aed}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {(posts.length > 0 || findingCreators || brandProfiles.length > 0) && (
            <section className="mt-5">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[15px] font-semibold">Seen on social</h2>
                {findingCreators ? (
                  <span className="flex items-center gap-1.5 text-xs text-[#A89F94]">
                    <Spinner /> finding creators…
                  </span>
                ) : (
                  mostOrdered && (
                    <span className="text-xs text-[#A89F94]">
                      most ordered: {mostOrdered.dish}
                    </span>
                  )
                )}
              </div>
              <ul className="no-scrollbar mt-2 flex gap-3 overflow-x-auto pb-1">
                {posts.map((p) => (
                  <li key={p.url} className="w-32 shrink-0">
                    <a href={p.url} target="_blank" rel="noreferrer">
                      <span className="relative block">
                        <Image
                          src={dishImage(p.summary)}
                          alt=""
                          width={160}
                          height={200}
                          className="h-36 w-32 rounded-2xl object-cover"
                        />
                        <span className="absolute inset-0 rounded-2xl bg-black/25" />
                        <span className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white">
                          <PlayIcon className="h-3.5 w-3.5" />
                        </span>
                        {(p.sample || p.web) && (
                          <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-[#F2A23A]">
                            {p.sample ? "sample" : "from the web"}
                          </span>
                        )}
                      </span>
                      <p className="mt-1.5 truncate text-[13px]">{p.creator}</p>
                    </a>
                  </li>
                ))}
              </ul>
              {!findingCreators && posts.length === 0 && brandProfiles.length > 0 && (
                <>
                  <p className="mt-1 text-xs text-[#A89F94]">
                    No creator posts found — here&apos;s the brand itself.
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {brandProfiles.map((b) => (
                      <li key={b.url}>
                        <a
                          href={b.url}
                          target="_blank"
                          rel="noreferrer"
                          className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px]"
                        >
                          <span className="text-[#F2A23A]">{b.platform}</span>
                          {b.handle}
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          {g?.reviews?.length ? (
            <section className="mt-5">
              <h2 className="text-[15px] font-semibold">Google reviews</h2>
              <ul className="mt-2 space-y-2">
                {g.reviews.slice(0, 3).map((r) => (
                  <li key={r.author + r.text.slice(0, 12)} className="glass p-3 text-xs">
                    <span className="text-[#F2A23A]">★ {r.rating}</span>{" "}
                    <span className="text-[#A89F94]">{r.author}</span>
                    <p
                      dir={isRtl(r.text) ? "rtl" : "ltr"}
                      className="mt-1 text-[13px] text-white/85"
                    >
                      {r.text.slice(0, 170)}
                      {r.text.length > 170 ? "…" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="space-y-2 pb-4 pt-5">
            {chat.messages.map((m, i) => (
              <ChatBubble
                key={i}
                message={m}
                onSpeak={chat.onSpeak}
                speaking={chat.speaking === m.content}
                compact
              />
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/8 bg-[#0B0907]/95 px-3 backdrop-blur">
        <ChatDock
          pinned
          messages={chat.messages}
          dishes={chat.dishes}
          input={chat.input}
          setInput={chat.setInput}
          onSend={chat.send}
          onMic={chat.mic}
          onSpeak={chat.onSpeak}
          speaking={chat.speaking}
          listening={chat.listening}
          busy={chat.busy}
          placeholder={`Ask about ${result.name_en}…`}
        />
      </div>
    </div>
  );
}
