"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import ChatDock from "./ChatDock";
import type { ChatMessage, MenuItem, Post, SearchResult } from "@/lib/types";
import { isRtl, metres } from "./ui";

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
};

export type RankedPost = Post & { summary: string };

const CHIPS: { id: string; label: string; test: (m: MenuItem) => boolean }[] = [
  { id: "spicy", label: "🌶 spicy", test: (m) => m.spicy >= 2 },
  { id: "cheap", label: "under 50 AED", test: (m) => m.price_aed < 50 },
  { id: "chicken", label: "chicken", test: (m) => /chicken|دجاج/i.test(m.protein + m.name_ar) },
  { id: "veg", label: "no meat", test: (m) => /veg|none|cheese/i.test(m.protein) },
];

function Action({ href, icon, label }: { href: string; icon: string; label: string }) {
  const disabled = !href;
  return (
    <a
      href={href || undefined}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noreferrer"
      aria-disabled={disabled}
      className={`flex flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[11px] ${
        disabled
          ? "pointer-events-none border-white/5 text-zinc-600"
          : "border-white/15 text-zinc-200"
      }`}
    >
      <span className="text-base leading-none">{icon}</span>
      {label}
    </a>
  );
}

export default function PlacePage({
  result,
  enrich,
  posts,
  mostOrdered,
  onBack,
  chat,
}: {
  result: SearchResult;
  enrich: Enrichment | null;
  posts: RankedPost[];
  mostOrdered: { dish: string; count: number } | null;
  onBack: () => void;
  chat: {
    messages: ChatMessage[];
    dishes: MenuItem[];
    input: string;
    setInput: (v: string) => void;
    send: (text: string) => void;
    mic: () => void;
    listening: boolean;
    busy: boolean;
  };
}) {
  const [chips, setChips] = useState<string[]>([]);
  const menu = useMemo(() => result.seed?.menu ?? [], [result.seed]);

  const filtered = useMemo(() => {
    if (!chips.length) return menu;
    return menu.filter((m) =>
      chips.every((c) => CHIPS.find((chip) => chip.id === c)?.test(m) ?? true),
    );
  }, [chips, menu]);

  const g = enrich?.google;
  const rating = result.rating ?? g?.rating ?? null;
  const openNow = result.open_now ?? g?.open_now ?? null;
  const maps =
    g?.maps ||
    result.seed?.links.maps ||
    `https://www.google.com/maps/search/?api=1&query=${result.lat},${result.lng}`;
  const menuLink = enrich?.socials?.menu_links[0] || g?.website || result.seed?.links.website || "";
  const instagram = enrich?.socials?.instagram || result.seed?.links.instagram || "";
  const phone = g?.phone ? `tel:${g.phone.replace(/\s/g, "")}` : "";

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#100d0b] text-zinc-100">
      <div className="flex items-center gap-3 border-b border-white/10 px-3 py-3">
        <button onClick={onBack} className="text-sm text-zinc-400">
          ← Back
        </button>
        <span className="truncate text-sm text-zinc-500">{result.address}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        <header className="mt-4 rounded-3xl border border-amber-400/15 bg-gradient-to-b from-amber-400/[0.12] to-white/[0.03] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur">
          <h1 className="text-2xl font-semibold text-zinc-50">{result.name_en}</h1>
          {result.name_ar && (
            <p dir="rtl" className="text-lg text-amber-300">
              {result.name_ar}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            {result.distance_m !== null && (
              <span className="text-zinc-400">{metres(result.distance_m)} away</span>
            )}
            {rating !== null && <span className="text-amber-400">★ {rating}</span>}
            {openNow !== null && (
              <span className={openNow ? "text-emerald-400" : "text-rose-400"}>
                {openNow ? "open now" : "closed"}
              </span>
            )}
            {result.source === "wain" && (
              <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-amber-300">
                WAIN data
              </span>
            )}
          </div>
        </header>

        {enrich?.photo && (
          <Image
            src={enrich.photo}
            alt={result.name_en}
            width={640}
            height={320}
            unoptimized
            className="mt-3 h-36 w-full rounded-2xl object-cover"
          />
        )}

        <div className="mt-3 flex gap-2">
          <Action href={maps} icon="➤" label="Directions" />
          <Action href={menuLink} icon="🍽" label="Menu" />
          <Action href={instagram} icon="◎" label="Instagram" />
          <Action href={phone} icon="✆" label="Call" />
        </div>

        <section className="mt-5">
          <h2 className="text-sm font-semibold text-zinc-200">What to order</h2>
          {menu.length === 0 ? (
            <p className="mt-2 text-xs text-zinc-500">
              I don&apos;t have their menu yet — ask below for distance, hours, rating or
              directions.
            </p>
          ) : (
            <>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CHIPS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() =>
                      setChips((v) =>
                        v.includes(c.id) ? v.filter((x) => x !== c.id) : [...v, c.id],
                      )
                    }
                    className={`rounded-full px-3 py-1 text-xs ${
                      chips.includes(c.id)
                        ? "bg-amber-500 text-black"
                        : "border border-white/15 text-zinc-400"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              <ul className="mt-2 space-y-1">
                {filtered.map((m) => (
                  <li
                    key={m.name_en}
                    className="flex items-center justify-between rounded-2xl border border-amber-400/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] px-3 py-2.5 text-sm backdrop-blur"
                  >
                    <span>
                      {m.name_en} <span dir="rtl">· {m.name_ar}</span>
                      <span className="ml-2 text-[11px] text-zinc-500">{m.source}</span>
                    </span>
                    <span className="font-semibold text-amber-400">{m.price_aed} AED</span>
                  </li>
                ))}
                {!filtered.length && (
                  <li className="text-xs text-zinc-500">Nothing on the menu fits those filters.</li>
                )}
              </ul>
            </>
          )}
        </section>

        {posts.length > 0 && (
          <section className="mt-5">
            <h2 className="text-sm font-semibold text-zinc-200">
              Who&apos;s been here <span className="text-zinc-500">مين راح هناك؟</span>
            </h2>
            {mostOrdered && (
              <div className="mt-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
                most ordered: <b>{mostOrdered.dish}</b>, {mostOrdered.count} posts
              </div>
            )}
            <ul className="mt-2 space-y-2">
              {posts.map((p) => (
                <li key={p.url} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                    <span className="rounded bg-white/10 px-1.5 py-0.5">{p.lang}</span>
                    <span className="rounded bg-white/10 px-1.5 py-0.5">{p.creator_region}</span>
                    <span>{p.creator}</span>
                    {p.sample && (
                      <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-amber-300">
                        sample
                      </span>
                    )}
                  </div>
                  <p dir={isRtl(p.summary) ? "rtl" : "ltr"} className="mt-1.5 text-sm text-zinc-100">
                    {p.summary}
                  </p>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-[11px] text-amber-400 underline"
                  >
                    original on {p.platform}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {g?.reviews?.length ? (
          <section className="mt-5 pb-4">
            <h2 className="text-sm font-semibold text-zinc-200">
              Google reviews <span className="text-[11px] text-zinc-500">live</span>
            </h2>
            <ul className="mt-2 space-y-2">
              {g.reviews.map((r) => (
                <li key={r.author + r.text.slice(0, 12)} className="text-xs text-zinc-400">
                  <span className="text-amber-400">★ {r.rating}</span> {r.author}
                  <p dir={isRtl(r.text) ? "rtl" : "ltr"} className="mt-0.5 text-zinc-300">
                    {r.text.slice(0, 180)}
                    {r.text.length > 180 ? "…" : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="space-y-2 pb-2 pt-4">
          {chat.messages.map((m, i) => (
            <div
              key={i}
              dir={isRtl(m.content) ? "rtl" : "ltr"}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.role === "user" ? "ml-auto bg-amber-500 text-black" : "bg-white/10 text-zinc-100"
              }`}
            >
              {m.content}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 px-3">
        <ChatDock
          pinned
          messages={chat.messages}
          dishes={chat.dishes}
          input={chat.input}
          setInput={chat.setInput}
          onSend={chat.send}
          onMic={chat.mic}
          listening={chat.listening}
          busy={chat.busy}
          placeholder={`Ask about ${result.name_en}…`}
        />
      </div>
    </div>
  );
}
