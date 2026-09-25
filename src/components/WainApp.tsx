"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import PlaceCard from "./PlaceCard";
import type { ChatMessage, LocalisedText, MenuItem, Place, Post, Register } from "@/lib/types";

const MapPanel = dynamic(() => import("./MapPanel"), { ssr: false });

type Act = "photo" | "reel" | "posts" | "chat";

type RankedPost = Post & { summary: string };

function isRtl(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}

function Spinner() {
  return (
    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-teal-700" />
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
  const chatEnd = useRef<HTMLDivElement>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);

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
      () => setGpsStatus("GPS unavailable, using Al Maryah"),
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
    setSignText({ ar: data.sign.sign_text_ar, en: data.sign.sign_text_en });
    if (data.match) {
      setActive(data.match.place);
      setDistance(data.match.distance_m);
    } else {
      setError("No place within 500 m matched that sign.");
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

  function toggleMic() {
    const Ctor =
      (window as WindowWithSpeech).SpeechRecognition ??
      (window as WindowWithSpeech).webkitSpeechRecognition;
    if (!Ctor) {
      setError("This browser has no built-in speech recognition. Type instead.");
      return;
    }
    if (listening) {
      recognition.current?.stop();
      setListening(false);
      return;
    }
    const rec = new Ctor();
    const spoken = register === "auto" ? detected : register;
    rec.lang = spoken === "english" ? "en-AE" : "ar-AE";
    rec.interimResults = false;
    rec.onresult = (event) => {
      const said = event.results[0][0].transcript;
      setListening(false);
      send(said);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognition.current = rec;
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
    <div className="flex min-h-screen w-full flex-col bg-zinc-50 md:h-screen">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
        <div className="flex items-baseline gap-3">
          <span className="text-xl font-bold tracking-tight text-teal-800">
            WAIN <span className="text-zinc-400">وين</span>
          </span>
          <span className="hidden text-xs text-zinc-500 sm:inline">
            See it. Ask it. Find it.
          </span>
        </div>
        <button
          onClick={() => setShowOverrides((v) => !v)}
          className="text-[11px] text-zinc-400 underline"
        >
          {register === "auto" ? "auto" : register}
        </button>
      </header>
      {showOverrides && (
        <div className="flex items-center gap-2 border-b border-zinc-200 bg-white px-4 py-2 text-xs">
          <span className="text-zinc-500">Reply in</span>
          {(["auto", "khaleeji", "arabizi", "english"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRegister(r)}
              className={`rounded-full px-3 py-1 ${
                register === r
                  ? "bg-teal-700 text-white"
                  : "border border-zinc-300 text-zinc-600"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="flex min-h-0 flex-1 flex-col border-zinc-200 bg-white md:w-[46%] md:min-w-[420px] md:flex-none md:border-r">
          <nav className="flex gap-1 border-b border-zinc-200 px-3 py-2">
            {acts.map((a) => (
              <button
                key={a.id}
                onClick={() => setAct(a.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  act === a.id ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {a.label}
              </button>
            ))}
          </nav>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            {busy && (
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Spinner /> {busy}
              </div>
            )}
            {error && (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {error}
              </div>
            )}

            {act === "photo" && (
              <section className="space-y-3">
                <p className="text-sm text-zinc-600">
                  Snap the storefront. WAIN reads the Arabic/English sign and cross-checks GPS.
                </p>
                <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 py-6 text-lg font-semibold text-white">
                  📷 وين هذا؟
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => e.target.files?.[0] && onPhotoPicked(e.target.files[0])}
                    className="hidden"
                  />
                </label>

                <div className="flex items-center justify-between text-[11px] text-zinc-400">
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
                      className="w-32 rounded-lg border border-zinc-300 px-2 py-1 text-xs"
                      placeholder="lat"
                    />
                    <input
                      value={lng}
                      onChange={(e) => {
                        manualGps.current = true;
                        setGpsStatus("manual location");
                        setLng(e.target.value);
                      }}
                      className="w-32 rounded-lg border border-zinc-300 px-2 py-1 text-xs"
                      placeholder="lng"
                    />
                  </div>
                )}
                {photo && (
                  <button
                    onClick={identifyPhoto}
                    disabled={!!busy}
                    className="w-full rounded-xl bg-zinc-900 px-3 py-3 text-sm font-medium text-white disabled:opacity-40"
                  >
                    Identify this place
                  </button>
                )}
                {photo && (
                  <Image
                    src={photo}
                    alt="storefront"
                    width={640}
                    height={360}
                    unoptimized
                    className="max-h-48 w-auto rounded-xl border border-zinc-200 object-cover"
                  />
                )}
                {signText && (
                  <div className="rounded-xl bg-zinc-100 p-3 text-xs text-zinc-700">
                    <div>sign (en): {signText.en || "—"}</div>
                    <div dir="rtl">sign (ar): {signText.ar || "—"}</div>
                  </div>
                )}
              </section>
            )}

            {act === "reel" && (
              <section className="space-y-3">
                <p className="text-sm text-zinc-600">
                  Paste a reel URL and its transcript. WAIN extracts the place, dish and price,
                  then shows it in your register.
                </p>
                <input
                  value={reelUrl}
                  onChange={(e) => setReelUrl(e.target.value)}
                  placeholder="https://www.tiktok.com/…"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs"
                />
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  rows={5}
                  dir={isRtl(transcript) ? "rtl" : "ltr"}
                  placeholder="Reel transcript (English, Khaleeji or Arabizi)…"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
                <button
                  onClick={ingestReel}
                  disabled={!transcript.trim() || !!busy}
                  className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                >
                  Show it in my language
                </button>
                {extraction && (
                  <pre className="overflow-x-auto rounded-xl bg-zinc-900 p-3 text-[11px] text-zinc-100">
                    {JSON.stringify(extraction, null, 2)}
                  </pre>
                )}
                {localised && (
                  <div className="rounded-xl border border-zinc-200 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-wide text-zinc-400">
                        {showOriginal ? "original" : register}
                      </span>
                      <button
                        onClick={() => setShowOriginal((v) => !v)}
                        className="rounded-full border border-zinc-300 px-2 py-0.5 text-[11px] text-zinc-600"
                      >
                        {showOriginal ? "show localised" : "show original"}
                      </button>
                    </div>
                    <p
                      dir={isRtl(showOriginal ? localised.original : localised.localised) ? "rtl" : "ltr"}
                      className="text-sm leading-relaxed text-zinc-800"
                    >
                      {showOriginal ? localised.original : localised.localised}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                      {localised.flags.halal === true && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">halal</span>
                      )}
                      {localised.flags.alcohol && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">alcohol</span>
                      )}
                      {localised.flags.pork && (
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-800">pork</span>
                      )}
                      {localised.prices_aed.map((p) => (
                        <span key={p} className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-700">
                          {p} AED
                        </span>
                      ))}
                    </div>
                    {localised.dish_notes.length > 0 && (
                      <ul className="mt-2 space-y-1 text-[11px] text-zinc-500">
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
                  <p className="text-sm text-zinc-600">مين راح هناك؟ Arabic creators first.</p>
                  <button
                    onClick={loadPosts}
                    disabled={!active || !!busy}
                    className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                  >
                    Load posts
                  </button>
                </div>
                {mostOrdered && (
                  <div className="rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-900">
                    most ordered: <b>{mostOrdered.dish}</b>, {mostOrdered.count} posts
                  </div>
                )}
                <ul className="space-y-2">
                  {posts.map((p) => (
                    <li key={p.url} className="rounded-xl border border-zinc-200 p-3">
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5">{p.lang}</span>
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5">{p.creator_region}</span>
                        <span>{p.creator}</span>
                        <span>· {p.posted}</span>
                        {p.sample && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">sample</span>
                        )}
                      </div>
                      <p
                        dir={isRtl(p.summary) ? "rtl" : "ltr"}
                        className="mt-1.5 text-sm text-zinc-800"
                      >
                        {p.summary}
                      </p>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-[11px] text-teal-700 underline"
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
                        className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 disabled:opacity-40"
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
                          ? "ml-auto bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-900"
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
                        className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                      >
                        <span>
                          {d.name_en} <span dir="rtl">· {d.name_ar}</span>
                          <span className="ml-2 text-[11px] text-zinc-400">{d.source}</span>
                        </span>
                        <span className="font-medium">{d.price_aed} AED</span>
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
                    className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={toggleMic}
                    disabled={!active || !!busy}
                    title="Ask by voice (ar-AE)"
                    className={`rounded-lg px-3 py-2 text-sm ${
                      listening ? "bg-rose-600 text-white" : "border border-zinc-300 text-zinc-600"
                    } disabled:opacity-40`}
                  >
                    {listening ? "● rec" : "🎙"}
                  </button>
                  <button
                    type="submit"
                    disabled={!active || !!busy}
                    className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                  >
                    Send
                  </button>
                </form>
              </section>
            )}
          </div>

          {active && (
            <div className="border-t border-zinc-200 p-4">
              <PlaceCard place={active} distanceM={distance} source="seed.json" />
            </div>
          )}
        </div>

        <div className="relative h-56 w-full shrink-0 border-t border-zinc-200 md:h-auto md:min-w-0 md:flex-1 md:border-t-0">
          <MapPanel places={places} active={active} onSelect={(p) => selectPlace(p)} />
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] p-2">
            <form onSubmit={runSearch} className="pointer-events-auto flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="el fanar · الفنار · Al Fanar"
                dir={isRtl(search) ? "rtl" : "ltr"}
                className="flex-1 rounded-xl border border-zinc-300 bg-white/95 px-3 py-2 text-sm shadow"
              />
              <button
                type="submit"
                className="rounded-xl bg-teal-700 px-3 py-2 text-sm font-medium text-white shadow"
              >
                find
              </button>
            </form>
            {searchHit && (
              <div className="pointer-events-auto mt-2 rounded-xl bg-white/95 px-3 py-2 text-[11px] text-zinc-600 shadow">
                <span className="text-zinc-500">
                  “{searchHit.query}” → {searchHit.matched_on} ({searchHit.method})
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {searchHit.variants.map((v) => (
                    <span key={v} className="rounded bg-zinc-100 px-1.5 py-0.5">
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
