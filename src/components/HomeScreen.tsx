"use client";

import Image from "next/image";
import Analyzing from "./Analyzing";
import type { SearchResult } from "@/lib/types";
import { metres } from "./ui";

export type PhotoOutcome = {
  tier: "brand" | "dish" | "unclear";
  evidence: string;
  brand: string | null;
  dish: { dish_en: string; dish_ar: string } | null;
  question?: string;
  radius_m: number;
  results: SearchResult[];
  matches?: {
    place_id: string;
    matched_items: { name_en: string; name_ar: string; price_aed: number }[];
  }[];
};

export default function HomeScreen({
  photo,
  onPhotoPicked,
  analyzing,
  outcome,
  onOpen,
  gpsStatus,
  lat,
  lng,
  setLat,
  setLng,
  showManualGps,
  setShowManualGps,
  onPasteReel,
  onAsk,
}: {
  photo: string | null;
  onPhotoPicked: (file: File) => void;
  analyzing: boolean;
  outcome: PhotoOutcome | null;
  onOpen: (result: SearchResult) => void;
  gpsStatus: string;
  lat: string;
  lng: string;
  setLat: (v: string) => void;
  setLng: (v: string) => void;
  showManualGps: boolean;
  setShowManualGps: (v: boolean) => void;
  onPasteReel: () => void;
  onAsk: () => void;
}) {
  const heading =
    outcome?.tier === "brand"
      ? `${outcome.brand} near you`
      : outcome?.tier === "dish"
        ? `${outcome.dish?.dish_en} within ${outcome.radius_m / 1000} km`
        : null;

  return (
    <section className="space-y-3 p-4">
      {!photo && (
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
        A sign, a cup or a bag → we find that brand&apos;s nearest branches. A plate of food → we
        find who serves it within 5 km.
      </p>

      <div className="flex items-center justify-between text-[11px] text-zinc-500">
        <span>{gpsStatus}</span>
        <div className="flex gap-3">
          <button onClick={onPasteReel} className="text-amber-400 underline">
            Paste a reel
          </button>
          <button onClick={() => setShowManualGps(!showManualGps)} className="underline">
            set location
          </button>
        </div>
      </div>

      {showManualGps && (
        <div className="flex gap-2">
          <input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="w-32 rounded-lg border border-white/15 bg-transparent px-2 py-1 text-xs"
            placeholder="lat"
          />
          <input
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="w-32 rounded-lg border border-white/15 bg-transparent px-2 py-1 text-xs"
            placeholder="lng"
          />
        </div>
      )}

      {photo && (
        <Image
          src={photo}
          alt="capture"
          width={640}
          height={360}
          unoptimized
          className="max-h-44 w-full rounded-2xl border border-white/10 object-cover"
        />
      )}

      {(analyzing || outcome) && <Analyzing done={!analyzing} />}

      {outcome && !analyzing && (
        <div className="space-y-2">
          <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200">
            {outcome.evidence}
          </p>

          {outcome.tier === "unclear" ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-300">
              <p>{outcome.question}</p>
              <button onClick={onAsk} className="mt-2 text-xs text-amber-400 underline">
                Type it instead
              </button>
            </div>
          ) : (
            <>
              {heading && <div className="text-xs text-zinc-500">{heading}</div>}
              {outcome.results.map((r) => {
                const hit = outcome.matches?.find((m) => m.place_id === r.id);
                return (
                  <button
                    key={r.id}
                    onClick={() => onOpen(r)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left text-xs hover:border-amber-400/60"
                  >
                    <div className="flex justify-between font-medium text-zinc-100">
                      <span>
                        {r.name_en}
                        {r.source === "wain" && (
                          <span className="ml-2 rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                            WAIN data
                          </span>
                        )}
                      </span>
                      <span className="text-zinc-500">
                        {r.distance_m !== null ? metres(r.distance_m) : ""}
                      </span>
                    </div>
                    <div className="text-zinc-400">
                      {hit?.matched_items.length
                        ? hit.matched_items
                            .map((m) => `${m.name_en} · AED ${m.price_aed}`)
                            .join(" · ")
                        : r.address}
                    </div>
                  </button>
                );
              })}
              {!outcome.results.length && (
                <p className="text-xs text-zinc-500">Nothing within 5 km matched that.</p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
