"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import PlaceCard from "./PlaceCard";
import type { ChatMessage, LocalisedText, MenuItem, Place, Post, Register } from "@/lib/types";

const MapPanel = dynamic(() => import("./MapPanel"), { ssr: false });

type Act = "photo" | "reel" | "posts" | "chat";

type RankedPost = Post & { summary: string };

type DishSearch = {
  dish: { dish_en: string; dish_ar: string };
  radius_m: number;
  places: {
    place: Place;
    distance_m: number;
    reason: string;
    matched_items: { name_en: string; name_ar: string; price_aed: number }[];
  }[];
};

type Enrichment = {
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

function isRtl(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}

function Spinner() {
  return (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-amber-400" />
  );
}

export default function WainApp() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [active, setActive] = useState<Place | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [act, setAct] = useState<Act>("photo");
  const [register, setRegister] = useState<Register | "auto">("auto");
  const [detected, setDetected] = useState<Register>("khaleeji");
  const [showOverrides, setShowOverrides] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Act 1 — storefront photo
  const [photo, setPhoto] = useState<string | null>(null);
  const [lat, setLat] = useState("24.5005");
  const [lng, setLng] = useState("54.3870");
  const [signText, setSignText] = useState<{ ar: string; en: string } | null>(null);
  const [dishHits, setDishHits] = useState<DishSearch | null>(null);
  const [showManualGps, setShowManualGps] = useState(false);
  const manualGps = useRef(false);
  const [gpsStatus, setGpsStatus] = useState("default location (Al Maryah)");

  // Act 2 — reel
  const [transcript, setTranscript] = useState("");
  const [reelUrl, setReelUrl] = useState("");
  const [extraction, setExtraction] = useState<Record<string, unknown> | null>(null);
  const [localised, setLocalised] = useState<LocalisedText | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  // Act 3 — who's been here
  const [posts, setPosts] = useState<RankedPost[]>([]);
  const [mostOrdered, setMostOrdered] = useState<{ dish: string; count: number } | null>(null);

  // Map search — one place, three spellings
  const [search, setSearch] = useState("");
  const [searchHit, setSearchHit] = useState<{
    query: string;
    matched_on: string;
    method: string;
    variants: string[];
  } | null>(null);

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [dishes, setDishes] = useState<MenuItem[]>([]);
  const [listening, setListening] = useState(false);
  const [enrich, setEnrich] = useState<Enrichment | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    fetch("/api/places")
      .then((r) => r.json())
      .then((d) => setPlaces(d.places));
  }, []);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (manualGps.current) return;
        setLat(pos.coords.latitude.toFixed(5));
        setLng(pos.coords.longitude.toFixed(5));
        setGpsStatus("using your GPS");
      },
      () => {
        if (manualGps.current) return;
        setGpsStatus("GPS unavailable, using Al Maryah");
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  async function call<T>(url: string, body: unknown, label: string): Promise<T | null> {
    setBusy(label);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "request failed");
      return data as T;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(null);
    }
  }

  function onPhotoPicked(file: File) {
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function identifyPhoto() {
    if (!photo) return;
    const data = await call<{
      sign: { sign_text_ar: string; sign_text_en: string };
      match: { place: Place; distance_m: number; confidence: number } | null;
    }>("/api/photo", { image: photo, lat: Number(lat), lng: Number(lng) }, "Reading the sign…");
    if (!data) return;
    setDishHits(null);
    setSignText({ ar: data.sign.sign_text_ar, en: data.sign.sign_text_en });
    if (data.match) {
      setActive(data.match.place);
      setDistance(data.match.distance_m);
    } else {
      setError("No place within 500 m matched that sign.");
    }
  }

  async function findDish() {
    if (!photo) return;
    const data = await call<DishSearch>(
      "/api/dish",
      { image: photo, lat: Number(lat), lng: Number(lng) },
      "Identifying the dish…",
    );
    if (!data) return;
    setSignText(null);
    setDishHits(data);
    if (!data.places.length) {
      setError(
        data.dish.dish_en
          ? `No place within 5 km serves ${data.dish.dish_en} in our data.`
          : "That photo doesn't look like food.",
      );
    }
  }

  async function ingestReel() {
    const data = await call<{
      extraction: Record<string, unknown>;
      match: { place: Place } | null;
    }>("/api/ingest", { transcript, url: reelUrl }, "Extracting from the reel…");
    if (!data) return;
    setExtraction(data.extraction);
    if (data.match) {
      setActive(data.match.place);
      setDistance(null);
    }
    const loc = await call<LocalisedText>(
      "/api/localise",
      { text: transcript, register },
      "Localising…",
    );
    if (loc) setLocalised(loc);
  }

  async function loadPosts() {
    if (!active) return;
    const data = await call<{
      posts: RankedPost[];
      most_ordered: { dish: string; count: number } | null;
    }>(
      "/api/posts",
      { placeId: active.id, register: register === "auto" ? detected : register },
      "Ranking creator posts…",
    );
    if (!data) return;
    setPosts(data.posts);
    setMostOrdered(data.most_ordered);
  }

  async function send(text: string) {
    if (!text.trim() || !active) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    const data = await call<{ reply: string; dishes: MenuItem[]; register: Register }>(
      "/api/chat",
      { message: text, placeId: active.id, history: messages },
      "…",
    );
    if (!data) return;
    setMessages([...next, { role: "assistant", content: data.reply }]);
    setDishes(data.dishes);
    if (data.register) setDetected(data.register);
  }

  function selectPlace(p: Place, distanceM: number | null = null) {
    setActive(p);
    setSearchHit(null);
    setDistance(distanceM);
    setPosts([]);
    setMostOrdered(null);
    setMessages([]);
    setDishes([]);
    setEnrich(null);
    fetch("/api/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Enrichment | null) => d?.google && setEnrich(d))
      .catch(() => {});
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;
    const data = await call<{
      match: { place: Place; method: string; matched_on: string } | null;
      variants: string[];
    }>("/api/search", { query: search }, "Matching the name…");
    if (!data) return;
    if (!data.match) {
      setSearchHit(null);
      setError(`No seeded place matches "${search}".`);
      return;
    }
    selectPlace(data.match.place);
    setSearch("");
    setSearchHit({
      query: search,
      matched_on: data.match.matched_on,
      method: data.match.method,
      variants: data.variants,
    });
  }

  async function toggleMic() {
    if (listening) {
      recorder.current?.stop();
      setListening(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("This browser can't record audio. Type instead.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone permission denied.");
      return;
    }

    const mime = ["audio/mp4", "audio/webm"].find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: rec.mimeType });
      if (blob.size < 1000) return;
      const body = new FormData();
      body.append("audio", blob, `speech.${rec.mimeType.includes("mp4") ? "mp4" : "webm"}`);
      setBusy("transcribing…");
      try {
        const res = await fetch("/api/transcribe", { method: "POST", body });
        const data = await res.json();
        setBusy(null);
        if (data.text) send(data.text);
        else setError(data.error ?? "Could not transcribe that.");
      } catch {
        setBusy(null);
        setError("Could not transcribe that.");
      }
    };
    recorder.current = rec;
    rec.start();
    setListening(true);
  }

  const acts: { id: Act; label: string }[] = [
    { id: "photo", label: "1 · Storefront" },
    { id: "reel", label: "2 · Reel" },
    { id: "posts", label: "3 · Who's been here" },
    { id: "chat", label: "Chat" },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#100d0b] text-zinc-100 md:h-screen">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-baseline gap-3">
          <span className="text-xl font-bold tracking-[0.2em] text-zinc-50">
            WAIN <span className="font-normal tracking-normal text-amber-400">وين</span>
          </span>
          <span className="hidden text-xs text-zinc-500 sm:inline">
            See it. Ask it. <span className="text-amber-400">Find it.</span>
          </span>
        </div>
        <button
          onClick={() => setShowOverrides((v) => !v)}
          className="text-[11px] text-zinc-500 underline"
        >
          {register === "auto" ? "auto" : register}
        </button>
      </header>
      {showOverrides && (
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2 text-xs">
          <span className="text-zinc-500">Reply in</span>
          {(["auto", "khaleeji", "arabizi", "english"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRegister(r)}
              className={`rounded-full px-3 py-1 ${
                register === r
                  ? "bg-amber-500 text-black"
                  : "border border-white/15 text-zinc-400"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="flex min-h-0 flex-1 flex-col border-white/10 md:w-[46%] md:min-w-[420px] md:flex-none md:border-r">
          <nav className="flex gap-1 border-b border-white/10 px-3 py-2">
            {acts.map((a) => (
              <button
                key={a.id}
                onClick={() => setAct(a.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  act === a.id ? "bg-amber-500 text-black" : "text-zinc-400 hover:bg-white/5"
                }`}
              >
                {a.label}
              </button>
            ))}
          </nav>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {busy && (
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300">
                <Spinner /> {busy}
              </div>
            )}
            {error && (
              <div className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300">
                {error}
              </div>
            )}

            {act === "photo" && (
              <section className="space-y-3">
                {!photo && !active && (
                  <div className="pb-1 pt-2">
                    <h1 className="text-4xl font-semibold leading-tight text-zinc-50">
                      See it.
                      <br />
                      Ask it.
                      <br />
                      <span className="text-amber-400">Find it.</span>
                    </h1>
                    <p className="mt-3 text-sm text-zinc-400">
                      Your guide to Gulf restaurants, powered by what you see and how you speak.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-5 text-sm font-semibold text-amber-200">
                    <span className="text-2xl leading-none">📷</span>
                    وين هذا؟
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => e.target.files?.[0] && onPhotoPicked(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                  <label className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-sm font-medium text-zinc-300">
                    <span className="text-2xl leading-none">⬆</span>
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && onPhotoPicked(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-zinc-500">
                  Storefront → we read the Arabic/English sign and cross-check GPS. A plate of
                  food → we find who serves it within 5 km.
                </p>

                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>{gpsStatus}</span>
                  <button onClick={() => setShowManualGps((v) => !v)} className="underline">
                    set location
                  </button>
                </div>
                {showManualGps && (
                  <div className="flex gap-2">
                    <input
                      value={lat}
                      onChange={(e) => {
                        manualGps.current = true;
                        setGpsStatus("manual location");
                        setLat(e.target.value);
                      }}
                      className="w-32 rounded-lg border border-white/15 bg-transparent px-2 py-1 text-xs"
                      placeholder="lat"
                    />
                    <input
                      value={lng}
                      onChange={(e) => {
                        manualGps.current = true;
                        setGpsStatus("manual location");
                        setLng(e.target.value);
                      }}
                      className="w-32 rounded-lg border border-white/15 bg-transparent px-2 py-1 text-xs"
                      placeholder="lng"
                    />
                  </div>
                )}
                {photo && (
                  <div className="flex gap-2">
                    <button
                      onClick={identifyPhoto}
                      disabled={!!busy}
                      className="flex-1 rounded-xl bg-amber-500 px-3 py-3 text-sm font-semibold text-black disabled:opacity-40"
                    >
                      It&apos;s a storefront
                    </button>
                    <button
                      onClick={findDish}
                      disabled={!!busy}
                      className="flex-1 rounded-xl border border-white/15 px-3 py-3 text-sm font-medium text-zinc-200 disabled:opacity-40"
                    >
                      It&apos;s a dish
                    </button>
                  </div>
                )}
                {photo && (
                  <Image
                    src={photo}
                    alt="storefront"
                    width={640}
                    height={360}
                    unoptimized
                    className="max-h-48 w-auto rounded-xl border border-white/10 object-cover"
                  />
                )}
                {signText && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-zinc-300">
                    <div>sign (en): {signText.en || "—"}</div>
                    <div dir="rtl">sign (ar): {signText.ar || "—"}</div>
                  </div>
                )}
                {dishHits && dishHits.places.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-zinc-500">
                      {dishHits.dish.dish_en} · {dishHits.dish.dish_ar} — within{" "}
                      {dishHits.radius_m / 1000} km
                    </div>
                    {dishHits.places.map((h) => (
                      <button
                        key={h.place.id}
                        onClick={() => selectPlace(h.place, h.distance_m)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left text-xs hover:border-amber-400/60"
                      >
                        <div className="flex justify-between font-medium text-zinc-100">
                          <span>{h.place.names.en}</span>
                          <span className="text-zinc-500">{h.distance_m} m</span>
                        </div>
                        <div className="text-zinc-400">
                          {h.matched_items.length
                            ? h.matched_items
                                .map((m) => `${m.name_en} · AED ${m.price_aed}`)
                                .join(" · ")
                            : `${h.place.cuisine.join(", ")} — matched on cuisine`}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}

            {act === "reel" && (
              <section className="space-y-3">
                <p className="text-sm text-zinc-400">
                  Paste a reel URL and its transcript. WAIN extracts the place, dish and price,
                  then shows it in your register.
                </p>
                <input
                  value={reelUrl}
                  onChange={(e) => setReelUrl(e.target.value)}
                  placeholder="https://www.tiktok.com/…"
                  className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 text-xs"
                />
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={5}
                  dir={isRtl(transcript) ? "rtl" : "ltr"}
                  placeholder="Reel transcript (English, Khaleeji or Arabizi)…"
                  className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm"
                />
                <button
                  onClick={ingestReel}
                  disabled={!transcript.trim() || !!busy}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-40"
                >
                  Show it in my language
                </button>
                {extraction && (
                  <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-3 text-[11px] text-zinc-300">
                    {JSON.stringify(extraction, null, 2)}
                  </pre>
                )}
                {localised && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                        {showOriginal ? "original" : register}
                      </span>
                      <button
                        onClick={() => setShowOriginal((v) => !v)}
                        className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-zinc-400"
                      >
                        {showOriginal ? "show localised" : "show original"}
                      </button>
                    </div>
                    <p
                      dir={isRtl(showOriginal ? localised.original : localised.localised) ? "rtl" : "ltr"}
                      className="text-sm leading-relaxed text-zinc-100"
                    >
                      {showOriginal ? localised.original : localised.localised}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                      {localised.flags.halal === true && (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-300">halal</span>
                      )}
                      {localised.flags.alcohol && (
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-300">alcohol</span>
                      )}
                      {localised.flags.pork && (
                        <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-rose-300">pork</span>
                      )}
                      {localised.prices_aed.map((p) => (
                        <span key={p} className="rounded-full bg-white/10 px-2 py-0.5 text-zinc-300">
                          {p} AED
                        </span>
                      ))}
                    </div>
                    {localised.dish_notes.length > 0 && (
                      <ul className="mt-2 space-y-1 text-[11px] text-zinc-400">
                        {localised.dish_notes.map((d) => (
                          <li key={d.dish}>
                            <b>{d.dish}</b> — {d.note}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </section>
            )}

            {act === "posts" && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">مين راح هناك؟ Arabic creators first.</p>
                  <button
                    onClick={loadPosts}
                    disabled={!active || !!busy}
                    className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-40"
                  >
                    Load posts
                  </button>
                </div>
                {mostOrdered && (
                  <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
                    most ordered: <b>{mostOrdered.dish}</b>, {mostOrdered.count} posts
                  </div>
                )}
                <ul className="space-y-2">
                  {posts.map((p) => (
                    <li key={p.url} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                        <span className="rounded bg-white/10 px-1.5 py-0.5">{p.lang}</span>
                        <span className="rounded bg-white/10 px-1.5 py-0.5">{p.creator_region}</span>
                        <span>{p.creator}</span>
                        <span>· {p.posted}</span>
                        {p.sample && (
                          <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-amber-300">sample</span>
                        )}
                      </div>
                      <p
                        dir={isRtl(p.summary) ? "rtl" : "ltr"}
                        className="mt-1.5 text-sm text-zinc-100"
                      >
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

            {act === "chat" && (
              <section className="space-y-3">
                {!active && (
                  <p className="text-sm text-zinc-500">Pick a place on the map first.</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {["شو أطلب؟ أبي شي حار تحت خمسين", "ما آكل لحم", "shu atlub? abi shay 7ar"].map(
                    (q) => (
                      <button
                        key={q}
                        onClick={() => send(q)}
                        disabled={!active || !!busy}
                        dir={isRtl(q) ? "rtl" : "ltr"}
                        className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-400 disabled:opacity-40"
                      >
                        {q}
                      </button>
                    ),
                  )}
                </div>
                <div className="space-y-2">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      dir={isRtl(m.content) ? "rtl" : "ltr"}
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        m.role === "user"
                          ? "ml-auto bg-amber-500 text-black"
                          : "bg-white/10 text-zinc-100"
                      }`}
                    >
                      {m.content}
                    </div>
                  ))}
                  <div ref={chatEnd} />
                </div>
                {dishes.length > 0 && (
                  <ul className="space-y-1">
                    {dishes.map((d) => (
                      <li
                        key={d.name_en}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                      >
                        <span>
                          {d.name_en} <span dir="rtl">· {d.name_ar}</span>
                          <span className="ml-2 text-[11px] text-zinc-500">{d.source}</span>
                        </span>
                        <span className="font-semibold text-amber-400">{d.price_aed} AED</span>
                      </li>
                    ))}
                  </ul>
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send(input);
                  }}
                  className="flex gap-2"
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    dir={isRtl(input) ? "rtl" : "ltr"}
                    placeholder="اكتب بالخليجي، Arabizi أو English…"
                    className="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm placeholder:text-zinc-500"
                  />
                  <button
                    type="button"
                    onClick={toggleMic}
                    disabled={!active || !!busy}
                    title="Ask by voice — tap to record, tap again to send"
                    className={`rounded-full px-3 py-2 text-sm ${
                      listening ? "bg-rose-500 text-white" : "border border-white/15 text-zinc-300"
                    } disabled:opacity-40`}
                  >
                    {listening ? "● stop" : "🎙"}
                  </button>
                  <button
                    type="submit"
                    disabled={!active || !!busy}
                    className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
                  >
                    Send
                  </button>
                </form>
              </section>
            )}
          </div>

          {active && (
            <div className="max-h-[55vh] overflow-y-auto border-t border-white/10 p-4">
              <PlaceCard
                place={active}
                distanceM={distance}
                source="seed.json"
                live={{
                  website: enrich?.google?.website,
                  instagram: enrich?.socials?.instagram,
                  maps: enrich?.google?.maps,
                  menu: enrich?.socials?.menu_links[0],
                }}
              />
              {enrich?.google && (
                <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>live from Google Places</span>
                    {enrich.google.open_now !== null && (
                      <span className={enrich.google.open_now ? "text-emerald-400" : "text-rose-400"}>
                        {enrich.google.open_now ? "open now" : "closed"}
                      </span>
                    )}
                  </div>
                  {enrich.photo && (
                    <Image
                      src={enrich.photo}
                      alt={enrich.google.name}
                      width={640}
                      height={320}
                      unoptimized
                      className="mt-2 h-32 w-full rounded-xl object-cover"
                    />
                  )}
                  <div className="mt-2 text-sm text-zinc-200">
                    {enrich.google.rating !== null && (
                      <span className="text-amber-400">
                        ★ {enrich.google.rating} ({enrich.google.ratings_count})
                      </span>
                    )}
                    {enrich.google.phone && (
                      <span className="text-zinc-400"> · {enrich.google.phone}</span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    {enrich.socials?.instagram && (
                      <a
                        href={enrich.socials.instagram}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-white/15 px-2 py-0.5 text-amber-300"
                      >
                        instagram
                      </a>
                    )}
                    {enrich.socials?.tiktok && (
                      <a
                        href={enrich.socials.tiktok}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-white/15 px-2 py-0.5 text-amber-300"
                      >
                        tiktok
                      </a>
                    )}
                    {enrich.socials?.menu_links.slice(0, 3).map((m, i) => (
                      <a
                        key={m}
                        href={m}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-white/15 px-2 py-0.5 text-zinc-300"
                      >
                        menu link {i + 1}
                      </a>
                    ))}
                  </div>
                  {enrich.google.reviews.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {enrich.google.reviews.map((r) => (
                        <li key={r.author + r.text.slice(0, 12)} className="text-xs text-zinc-400">
                          <span className="text-amber-400">★ {r.rating}</span> {r.author}
                          <p dir={isRtl(r.text) ? "rtl" : "ltr"} className="mt-0.5 text-zinc-300">
                            {r.text.slice(0, 180)}
                            {r.text.length > 180 ? "…" : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative h-56 w-full shrink-0 border-t border-white/10 md:h-auto md:min-w-0 md:flex-1 md:border-t-0">
          <MapPanel places={places} active={active} onSelect={(p) => selectPlace(p)} />
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] p-2">
            <form onSubmit={runSearch} className="pointer-events-auto flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="el fanar · الفنار · Al Fanar"
                dir={isRtl(search) ? "rtl" : "ltr"}
                className="flex-1 rounded-xl border border-white/10 bg-[#100d0b]/95 px-3 py-2 text-sm text-zinc-100 shadow placeholder:text-zinc-500"
              />
              <button
                type="submit"
                className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-black shadow"
              >
                find
              </button>
            </form>
            {searchHit && (
              <div className="pointer-events-auto mt-2 rounded-xl border border-white/10 bg-[#100d0b]/95 px-3 py-2 text-[11px] text-zinc-300 shadow">
                <span className="text-zinc-400">
                  “{searchHit.query}” → {searchHit.matched_on} ({searchHit.method})
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {searchHit.variants.map((v) => (
                    <span key={v} className="rounded bg-white/10 px-1.5 py-0.5">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
