"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Analyzing from "./Analyzing";
import BottomNav, { type Tab } from "./BottomNav";
import ChatDock from "./ChatDock";
import ExploreScreen from "./ExploreScreen";
import HomeScreen, { type PhotoOutcome } from "./HomeScreen";
import PlacePage, { type Enrichment, type RankedPost, type Saw } from "./PlacePage";
import ReelSheet from "./ReelSheet";
import { Spinner } from "./ui";
import type {
  ChatMessage,
  LocalisedText,
  MenuItem,
  Place,
  Register,
  SearchResult,
} from "@/lib/types";

const DEFAULT_ORIGIN = { lat: 24.5005, lng: 54.387 };

function seedToResult(place: Place, distanceM: number | null): SearchResult {
  return {
    source: "wain",
    id: place.id,
    place_id: place.id,
    name_en: place.names.en,
    name_ar: place.names.ar,
    address: place.area,
    lat: place.lat,
    lng: place.lng,
    distance_m: distanceM,
    open_now: null,
    rating: null,
    ratings_count: null,
    seed: place,
  };
}

/** "You saw" only claims a dish price when the photo route matched real menu data. */
function sawFor(
  outcome: PhotoOutcome | null,
  result: SearchResult,
  photo: string | null,
): Saw | null {
  if (!photo || !outcome || outcome.tier === "unclear") return null;
  const item = outcome.matches?.find((m) => m.place_id === result.id)?.matched_items[0];
  return {
    photo,
    dish: outcome.dish?.dish_en ?? outcome.brand,
    item: item ? { name_en: item.name_en, price_aed: item.price_aed } : null,
  };
}

export default function WainApp() {
  const [tab, setTab] = useState<Tab>("home");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Location
  const [lat, setLat] = useState(String(DEFAULT_ORIGIN.lat));
  const [lng, setLng] = useState(String(DEFAULT_ORIGIN.lng));
  const [gpsStatus, setGpsStatus] = useState("default location (Al Maryah)");
  const [showManualGps, setShowManualGps] = useState(false);
  const manualGps = useRef(false);
  const origin = useMemo(
    () => ({
      lat: Number(lat) || DEFAULT_ORIGIN.lat,
      lng: Number(lng) || DEFAULT_ORIGIN.lng,
    }),
    [lat, lng],
  );

  // Home — camera
  const [photo, setPhoto] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<PhotoOutcome | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saw, setSaw] = useState<Saw | null>(null);
  /** Branches of the brand just photographed, for the "other branches" link. */
  const [branchResults, setBranchResults] = useState<SearchResult[]>([]);

  // Reel
  const [reelOpen, setReelOpen] = useState(false);
  const [reelUrl, setReelUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [extraction, setExtraction] = useState<Record<string, unknown> | null>(null);
  const [reelHint, setReelHint] = useState<string | null>(null);
  const [reelStep, setReelStep] = useState<string | null>(null);
  const [reelDelivery, setReelDelivery] = useState<string[]>([]);
  const [reelResults, setReelResults] = useState<SearchResult[]>([]);
  const [localised, setLocalised] = useState<LocalisedText | null>(null);

  // Explore
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // Place page
  const [active, setActive] = useState<SearchResult | null>(null);
  const [enrich, setEnrich] = useState<Enrichment | null>(null);
  const [posts, setPosts] = useState<RankedPost[]>([]);
  const [mostOrdered, setMostOrdered] = useState<{ dish: string; count: number } | null>(null);
  const [findingCreators, setFindingCreators] = useState(false);
  const [liveMenu, setLiveMenu] = useState<{ items: MenuItem[]; source: string } | null>(
    null,
  );
  const [findingMenu, setFindingMenu] = useState(false);
  const [areaBusy, setAreaBusy] = useState(false);
  /** Guards against a slow creator search landing on a place the user left. */
  const openToken = useRef<string | null>(null);

  // Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [dishes, setDishes] = useState<MenuItem[]>([]);
  const [listening, setListening] = useState(false);
  const [detected, setDetected] = useState<Register>("khaleeji");
  const recorder = useRef<MediaRecorder | null>(null);

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

  const call = useCallback(async function call<T>(
    url: string,
    body: unknown,
    label: string,
  ): Promise<T | null> {
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
  }, []);

  /** Places around the user for a free-text question, without touching the UI. */
  const searchFor = useCallback(
    async (text: string): Promise<SearchResult[]> => {
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: text, ...origin }),
        });
        if (!res.ok) return [];
        const data = (await res.json()) as { results: SearchResult[] };
        return data.results;
      } catch {
        return [];
      }
    },
    [origin],
  );

  const runSearch = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      const data = await call<{
        results: SearchResult[];
        brand: string | null;
        normalised: string;
        google_error: string | null;
      }>("/api/search", { query: text, ...origin }, "Searching nearby…");
      if (!data) return;
      setResults(data.results);
      setHighlighted(data.results[0]?.id ?? null);
      setNote(
        [
          data.brand && data.brand.toLowerCase() !== text.trim().toLowerCase()
            ? `“${text}” → ${data.brand}`
            : null,
          data.google_error ? "Google search unavailable — WAIN data only." : null,
          !data.results.length ? `Nothing found for “${text}” within 5 km.` : null,
        ]
          .filter(Boolean)
          .join(" · ") || null,
      );
    },
    [call, origin],
  );

  // Dragging the map is a question in itself: show what food is over there.
  const areaAt = useRef<{ lat: number; lng: number } | null>(null);
  const searchArea = useCallback(
    async (area: { lat: number; lng: number; radius_m: number }) => {
      // A few metres of drift isn't a new area, and each call costs a request.
      const last = areaAt.current;
      if (
        last &&
        Math.hypot(last.lat - area.lat, last.lng - area.lng) * 111_000 < area.radius_m / 3
      ) {
        return;
      }
      areaAt.current = { lat: area.lat, lng: area.lng };
      setAreaBusy(true);
      try {
        const res = await fetch("/api/area", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(area),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { results: SearchResult[] };
        if (!data.results.length) {
          setNote("No food places found in this area.");
          return;
        }
        setResults(data.results);
        setNote(`${data.results.length} food places in this area`);
      } catch {
        // A failed area fetch just leaves the previous pins in place.
      } finally {
        setAreaBusy(false);
      }
    },
    [],
  );

  // A first pass of nearby places gives Explore pins and grounds chat before
  // the user types anything.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    runSearch("restaurants");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetPlaceState() {
    setPosts([]);
    setMostOrdered(null);
    setMessages([]);
    setDishes([]);
    setEnrich(null);
    setLiveMenu(null);
  }

  const openPlace = useCallback(async (r: SearchResult, from?: Saw | null) => {
    setActive(r);
    setSaw(from ?? null);
    setHighlighted(r.id);
    resetPlaceState();
    openToken.current = r.id;

    // Real creator posts are public but not in any API we hold, so the model
    // searches the web for them while the rest of the page loads.
    setFindingCreators(true);
    fetch("/api/creators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: r.name_en, address: r.address, city: "Abu Dhabi" }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((d: { posts: RankedPost[] } | null) => {
        if (openToken.current !== r.id || !d?.posts.length) return;
        setPosts((prev) => [
          ...prev,
          ...d.posts.filter((p) => !prev.some((q) => q.url === p.url)),
        ]);
      })
      .catch(() => {})
      .finally(() => {
        if (openToken.current === r.id) setFindingCreators(false);
      });

    // Places has no menu field, so a Google-only place gets its menu read off
    // its own pages once enrichment has told us where those pages are.
    const needsMenu = !r.seed?.menu.length;
    if (needsMenu) setFindingMenu(true);

    fetch("/api/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        r.source === "wain" ? { id: r.id } : { googlePlaceId: r.place_id },
      ),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((d: Enrichment | null) => {
        if (d?.google && openToken.current === r.id) setEnrich(d);
        if (!needsMenu) return null;
        return fetch("/api/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: d?.google?.name || r.name_en,
            city: "Abu Dhabi",
            website: d?.google?.website ?? "",
            menu_links: d?.socials?.menu_links ?? [],
          }),
        });
      })
      .then((res) => (res && res.ok ? res.json() : null))
      .then((m: { items: MenuItem[]; source: string } | null) => {
        if (m?.items.length && openToken.current === r.id) setLiveMenu(m);
      })
      .catch(() => {})
      .finally(() => {
        if (openToken.current === r.id) setFindingMenu(false);
      });

    if (r.source !== "wain") return;
    // "Who's been here" loads with the place, no extra tap.
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId: r.id, register: "auto" }),
    }).catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as {
      posts: RankedPost[];
      most_ordered: { dish: string; count: number } | null;
    };
    if (openToken.current !== r.id) return;
    setPosts((prev) => [...data.posts, ...prev]);
    setMostOrdered(data.most_ordered);
  }, []);

  // The photo route decides brand vs dish vs unclear itself, so the capture
  // runs straight into analysis with no "is this a storefront?" question.
  async function analysePhoto(image: string) {
    setOutcome(null);
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, ...origin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "request failed");
      const result = data as PhotoOutcome;
      setOutcome(result);
      setResults(result.results);
      setBranchResults(result.tier === "brand" ? result.results : []);
      // Let the last step's check fill before the screen hands over.
      await new Promise((r) => setTimeout(r, 900));
      setAnalyzing(false);
      // A brand lands straight on its nearest branch; a bare dish has no single
      // answer, so the ranked list in Explore is the answer.
      if (result.tier === "brand" && result.results[0]) {
        openPlace(result.results[0], sawFor(result, result.results[0], image));
      } else if (result.tier === "dish" && result.results.length > 0) {
        setNote(result.evidence);
        setTab("explore");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setAnalyzing(false);
    }
  }

  function onPhotoPicked(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const image = reader.result as string;
      setPhoto(image);
      analysePhoto(image);
    };
    reader.readAsDataURL(file);
  }

  async function ingestReel() {
    // The lookup is one request but three server-side phases, and a 40s wait
    // with no label reads as a hang.
    setReelHint(null);
    setReelDelivery([]);
    setReelResults([]);
    const steps = transcript.trim()
      ? ["Reading the transcript…", "Finding the place near you…"]
      : ["Reading the post…", "Searching the web for the place…", "Finding it near you…"];
    setReelStep(steps[0]);
    const timers = steps
      .slice(1)
      .map((s, i) => setTimeout(() => setReelStep(s), (i + 1) * 12000));
    const data = await call<{
      transcript: string;
      from_web: boolean;
      hint: string | null;
      delivery: string[];
      extraction: Record<string, unknown>;
      results: SearchResult[];
      match: { place: Place } | null;
    }>(
      "/api/ingest",
      { transcript, url: reelUrl, ...origin },
      transcript.trim() ? "Extracting from the reel…" : "Looking up the reel…",
    );
    timers.forEach(clearTimeout);
    setReelStep(data ? "Translating what they said…" : null);
    if (!data) return;
    setExtraction(data.extraction);
    setReelHint(data.hint);
    setReelDelivery(data.delivery ?? []);
    setReelResults(data.results);
    const loc = await call<LocalisedText>(
      "/api/localise",
      { text: data.transcript, register: "auto" },
      "Localising…",
    );
    if (loc) setLocalised(loc);
    setReelStep(null);

    if (data.match) {
      setReelOpen(false);
      openPlace(seedToResult(data.match.place, null));
      return;
    }
    // Google found the venue: keep the sheet open so the user can read what the
    // reel was about and pick the branch, rather than being thrown into Explore.
    if (data.results.length > 0) {
      setResults(data.results);
      setHighlighted(data.results[0].id);
      const guess = data.extraction.place_guess;
      setNote(typeof guess === "string" && guess ? `From the reel: ${guess}` : null);
      return;
    }
    if (data.from_web && !data.hint) {
      setReelHint(
        "Couldn't tell which place that reel is from — the post isn't indexed. Paste its caption or transcript, or send a screenshot, and I'll find the place.",
      );
    }
  }

  async function send(text: string) {
    if (!text.trim()) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");

    // With no place open, the question itself is the search: answering from
    // whatever list happened to be on screen ignores Google entirely.
    let around = results;
    if (!active) {
      const found = await searchFor(text);
      if (found.length) {
        around = found;
        setResults(found);
        setHighlighted(found[0].id);
      }
    }

    const data = await call<{ reply: string; dishes: MenuItem[]; register: Register }>(
      "/api/chat",
      {
        message: text,
        placeId: active?.source === "wain" ? active.id : undefined,
        history: messages,
        nearby: active?.source === "wain" ? undefined : active ? [active, ...results] : around,
        focusId: active?.source === "google" ? active.id : undefined,
        // A menu read off the place's own pages is grounding the server
        // cannot look up itself.
        focusMenu: active?.source === "google" ? (liveMenu?.items ?? []) : undefined,
        focusMenuSource: liveMenu?.source,
      },
      "…",
    );
    if (!data) return;
    setMessages([...next, { role: "assistant", content: data.reply }]);
    setDishes(data.dishes);
    if (data.register) setDetected(data.register);
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

  function askFromHome(text?: string) {
    setTab("ask");
    const q = text ?? input;
    if (q.trim()) send(q);
  }

  const chat = {
    messages,
    dishes,
    input,
    setInput,
    send,
    mic: toggleMic,
    listening,
    busy: !!busy,
  };

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[#0B0907] text-white">
      {tab !== "home" && (
        <header className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <span className="text-lg tracking-[0.2em] text-white">
            WAIN <span className="font-arabic tracking-normal text-[#F2A23A]">وين</span>
          </span>
          <span className="text-[11px] text-[#A89F94]">{detected}</span>
        </header>
      )}

      {(busy || error) && (
        <div className="space-y-1 px-4 py-2">
          {busy && (
            <div className="glass flex items-center gap-2 px-3 py-2 text-xs text-white/85">
              <Spinner /> {busy}
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300">{error}</div>
          )}
        </div>
      )}

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {tab === "home" && (
          <HomeScreen
            onPhotoPicked={onPhotoPicked}
            outcome={outcome}
            onOpen={(r) => openPlace(r, sawFor(outcome, r, photo))}
            onAsk={askFromHome}
            input={input}
            setInput={setInput}
            onMic={toggleMic}
            listening={listening}
            gpsStatus={gpsStatus}
            lat={lat}
            lng={lng}
            setLat={(v) => {
              manualGps.current = true;
              setGpsStatus("manual location");
              setLat(v);
            }}
            setLng={(v) => {
              manualGps.current = true;
              setGpsStatus("manual location");
              setLng(v);
            }}
            showManualGps={showManualGps}
            setShowManualGps={setShowManualGps}
            onPasteReel={() => setReelOpen(true)}
          />
        )}

        {tab === "explore" && (
          <ExploreScreen
            results={results}
            activeId={highlighted}
            onHighlight={setHighlighted}
            onOpen={openPlace}
            query={query}
            setQuery={setQuery}
            onSearch={() => runSearch(query)}
            busy={!!busy}
            origin={origin}
            note={note}
            onAreaSearch={searchArea}
            areaBusy={areaBusy}
          />
        )}

        {tab === "ask" && (
          <section className="flex min-h-0 flex-1 flex-col px-4">
            <p className="py-3 text-xs text-[#A89F94]">
              {active
                ? `Answering about ${active.name_en}.`
                : `Answering from ${results.length} places near you — open one for its menu.`}
            </p>
            <div className="flex min-h-0 flex-1 flex-col justify-end overflow-y-auto">
              <ChatDock
                messages={messages}
                dishes={dishes}
                input={input}
                setInput={setInput}
                onSend={send}
                onMic={toggleMic}
                listening={listening}
                busy={!!busy}
                placeholder="اكتب بالخليجي، Arabizi أو English…"
                prompts={["شو أطلب؟ أبي شي حار تحت خمسين", "وين أقرب مطعم مفتوح؟", "shu fi 7awali?"]}
              />
            </div>
          </section>
        )}
      </main>

      <BottomNav tab={tab} onChange={setTab} />

      {active && (
        <PlacePage
          result={active}
          enrich={enrich}
          posts={posts}
          mostOrdered={mostOrdered}
          findingCreators={findingCreators}
          liveMenu={liveMenu}
          findingMenu={findingMenu}
          saw={saw}
          otherBranches={
            branchResults.some((b) => b.id === active.id)
              ? branchResults.length - 1
              : 0
          }
          onOtherBranches={() => {
            setResults(branchResults);
            setActive(null);
            setTab("explore");
          }}
          onBack={() => setActive(null)}
          chat={chat}
        />
      )}

      {analyzing && (
        <Analyzing
          photo={photo}
          done={!!outcome}
          evidence={outcome?.evidence ?? null}
          onBack={() => setAnalyzing(false)}
        />
      )}

      {reelOpen && (
        <ReelSheet
          url={reelUrl}
          setUrl={setReelUrl}
          transcript={transcript}
          setTranscript={setTranscript}
          onIngest={ingestReel}
          fromWeb={!transcript.trim()}
          hint={reelHint}
          step={reelStep}
          extraction={extraction}
          delivery={reelDelivery}
          results={reelResults}
          onOpen={(r) => {
            setReelOpen(false);
            openPlace(r);
          }}
          localised={localised}
          busy={!!busy}
          onClose={() => setReelOpen(false)}
        />
      )}
    </div>
  );
}
