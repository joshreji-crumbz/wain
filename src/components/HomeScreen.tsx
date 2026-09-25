"use client";

import Image from "next/image";
import type { Place } from "@/lib/types";
import { metres } from "./ui";

export type DishSearch = {
  dish: { dish_en: string; dish_ar: string };
  radius_m: number;
  places: {
    place: Place;
    distance_m: number;
    reason: string;
    matched_items: { name_en: string; name_ar: string; price_aed: number }[];
  }[];
};

export default function HomeScreen({
  photo,
  onPhotoPicked,
  onIdentify,
  onFindDish,
  signText,
  dishHits,
  onOpenSeed,
  busy,
  gpsStatus,
  lat,
  lng,
  setLat,
  setLng,
  showManualGps,
  setShowManualGps,
  onPasteReel,
}: {
  photo: string | null;
  onPhotoPicked: (file: File) => void;
  onIdentify: () => void;
  onFindDish: () => void;
  signText: { ar: string; en: string } | null;
  dishHits: DishSearch | null;
  onOpenSeed: (place: Place, distanceM: number | null) => void;
  busy: boolean;
  gpsStatus: string;
  lat: string;
  lng: string;
  setLat: (v: string) => void;
  setLng: (v: string) => void;
  showManualGps: boolean;
  setShowManualGps: (v: boolean) => void;
  onPasteReel: () => void;
}) {
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
        Storefront → we read the Arabic/English sign and cross-check GPS. A plate of food → we
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
        <>
          <div className="flex gap-2">
            <button
              onClick={onIdentify}
              disabled={busy}
              className="flex-1 rounded-xl bg-amber-500 px-3 py-3 text-sm font-semibold text-black disabled:opacity-40"
            >
              It&apos;s a storefront
            </button>
            <button
              onClick={onFindDish}
              disabled={busy}
              className="flex-1 rounded-xl border border-white/15 px-3 py-3 text-sm font-medium text-zinc-200 disabled:opacity-40"
            >
              It&apos;s a dish
            </button>
          </div>
          <Image
            src={photo}
            alt="capture"
            width={640}
            height={360}
            unoptimized
            className="max-h-48 w-auto rounded-xl border border-white/10 object-cover"
          />
        </>
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
            {dishHits.dish.dish_en} · {dishHits.dish.dish_ar} — within {dishHits.radius_m / 1000} km
          </div>
          {dishHits.places.map((h) => (
            <button
              key={h.place.id}
              onClick={() => onOpenSeed(h.place, h.distance_m)}
              className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left text-xs hover:border-amber-400/60"
            >
              <div className="flex justify-between font-medium text-zinc-100">
                <span>{h.place.names.en}</span>
                <span className="text-zinc-500">{metres(h.distance_m)}</span>
              </div>
              <div className="text-zinc-400">
                {h.matched_items.length
                  ? h.matched_items.map((m) => `${m.name_en} · AED ${m.price_aed}`).join(" · ")
                  : `${h.place.cuisine.join(", ")} — matched on cuisine`}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
