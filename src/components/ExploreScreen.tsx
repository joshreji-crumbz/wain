"use client";

import { useState } from "react";
import GoogleMapView, { type MapMarker } from "./GoogleMapView";
import type { SearchResult } from "@/lib/types";
import { isRtl, metres } from "./ui";

export default function ExploreScreen({
  results,
  activeId,
  onHighlight,
  onOpen,
  query,
  setQuery,
  onSearch,
  busy,
  origin,
  note,
}: {
  results: SearchResult[];
  activeId: string | null;
  onHighlight: (id: string) => void;
  onOpen: (r: SearchResult) => void;
  query: string;
  setQuery: (v: string) => void;
  onSearch: () => void;
  busy: boolean;
  origin: { lat: number; lng: number };
  note: string | null;
}) {
  const [full, setFull] = useState(false);
  const highlighted = results.find((r) => r.id === activeId) ?? null;
  const center = highlighted ? { lat: highlighted.lat, lng: highlighted.lng } : origin;

  const markers: MapMarker[] = results.map((r) => ({
    id: r.id,
    lat: r.lat,
    lng: r.lng,
    label: r.name_en,
    seeded: r.source === "wain",
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <GoogleMapView
        center={center}
        markers={markers}
        activeId={activeId}
        onSelect={onHighlight}
        interactive={false}
        onMapTap={() => setFull(true)}
        className="h-[35vh] w-full shrink-0"
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearch();
        }}
        className="sticky top-0 z-20 flex gap-2 border-b border-white/10 bg-[#100d0b]/95 px-3 py-2 backdrop-blur"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          dir={isRtl(query) ? "rtl" : "ltr"}
          placeholder="كنتاكي · kentaki · الفنار · shawarma"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder:text-zinc-500"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
        >
          Find
        </button>
      </form>

      {note && <p className="px-4 pt-2 text-[11px] text-zinc-500">{note}</p>}

      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {results.map((r) => (
          <li key={r.id}>
            <button
              onClick={() => {
                onHighlight(r.id);
                onOpen(r);
              }}
              className={`w-full rounded-2xl border p-3 text-left ${
                r.id === activeId
                  ? "border-amber-400/70 bg-amber-400/10"
                  : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold text-zinc-50">
                  {r.name_en}
                </span>
                <span className="shrink-0 text-[11px] text-zinc-500">
                  {metres(r.distance_m)}
                </span>
              </div>
              {r.name_ar && (
                <div dir="rtl" className="text-xs text-zinc-400">
                  {r.name_ar}
                </div>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                {r.source === "wain" ? (
                  <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-amber-300">
                    WAIN data
                  </span>
                ) : (
                  <span className="rounded bg-white/10 px-1.5 py-0.5 text-zinc-400">Google</span>
                )}
                {r.rating !== null && (
                  <span className="text-amber-400">★ {r.rating}</span>
                )}
                {r.open_now !== null && (
                  <span className={r.open_now ? "text-emerald-400" : "text-rose-400"}>
                    {r.open_now ? "open now" : "closed"}
                  </span>
                )}
                <span className="truncate text-zinc-500">{r.address}</span>
              </div>
            </button>
          </li>
        ))}
        {!results.length && !busy && (
          <li className="px-1 py-6 text-center text-xs text-zinc-500">
            Search for a place, a brand or a dish.
          </li>
        )}
      </ul>

      {full && (
        <div className="fixed inset-0 z-50 bg-[#100d0b]">
          <GoogleMapView
            center={center}
            markers={markers}
            activeId={activeId}
            onSelect={onHighlight}
            interactive
            className="h-full w-full"
          />
          <button
            onClick={() => setFull(false)}
            className="absolute right-4 top-4 rounded-full bg-[#100d0b]/90 px-4 py-2 text-sm font-semibold text-zinc-100 shadow"
          >
            ✕ Close
          </button>
          {highlighted && (
            <button
              onClick={() => {
                setFull(false);
                onOpen(highlighted);
              }}
              className="absolute inset-x-4 bottom-6 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-black shadow"
            >
              Open {highlighted.name_en}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
