"use client";

import { useState } from "react";
import Image from "next/image";
import GoogleMapView, { type MapMarker } from "./GoogleMapView";
import { CloseIcon, SearchIcon } from "./icons";
import type { SearchResult } from "@/lib/types";
import { Spinner, dishImage, isRtl, metres } from "./ui";

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
  onAreaSearch,
  areaBusy,
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
  /** Dragging the map asks Google what food is in the new area. */
  onAreaSearch: (area: { lat: number; lng: number; radius_m: number }) => void;
  areaBusy: boolean;
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
        className="sticky top-0 z-20 flex gap-2 border-b border-white/8 bg-[#0B0907]/90 px-3 py-2 backdrop-blur-xl"
      >
        <span className="glass flex min-w-0 flex-1 items-center gap-2 rounded-full px-3">
          <SearchIcon className="h-4 w-4 shrink-0 text-[#A89F94]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            dir={isRtl(query) ? "rtl" : "ltr"}
            placeholder="كنتاكي · kentaki · الفنار · shawarma"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-white/45"
          />
        </span>
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-[#F2A23A] px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
        >
          Find
        </button>
      </form>

      {note && <p className="px-4 pt-2 text-[11px] text-[#A89F94]">{note}</p>}

      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {results.map((r) => (
          <li key={r.id}>
            <button
              onClick={() => {
                onHighlight(r.id);
                onOpen(r);
              }}
              className={`glass flex w-full items-center gap-3 p-3 text-left ${
                r.id === activeId ? "ring-1 ring-[#F2A23A]/70" : ""
              }`}
            >
              <Image
                src={dishImage(`${r.name_en} ${(r.seed?.cuisine ?? []).join(" ")}`)}
                alt=""
                width={56}
                height={56}
                className="h-14 w-14 shrink-0 rounded-xl object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-white">
                    {r.name_en}
                  </span>
                  <span className="shrink-0 text-[11px] text-[#A89F94]">
                    {metres(r.distance_m)}
                  </span>
                </span>
                {r.name_ar && (
                  <span dir="rtl" className="block truncate text-xs text-[#A89F94]">
                    {r.name_ar}
                  </span>
                )}
                <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                  {r.source === "wain" && (
                    <span className="rounded bg-[#F2A23A]/20 px-1.5 py-0.5 text-[#F2A23A]">
                      WAIN data
                    </span>
                  )}
                  {r.rating !== null && (
                    <span className="text-[#F2A23A]">★ {r.rating}</span>
                  )}
                  {r.open_now !== null && (
                    <span className={r.open_now ? "text-emerald-400" : "text-rose-400"}>
                      ● {r.open_now ? "open now" : "closed"}
                    </span>
                  )}
                  <span className="truncate text-[#A89F94]">{r.address}</span>
                </span>
              </span>
            </button>
          </li>
        ))}
        {!results.length && !busy && (
          <li className="px-1 py-6 text-center text-xs text-[#A89F94]">
            Search for a place, a brand or a dish.
          </li>
        )}
      </ul>

      {full && (
        <div className="fixed inset-0 z-50 bg-[#0B0907]">
          <GoogleMapView
            center={center}
            markers={markers}
            activeId={activeId}
            onSelect={onHighlight}
            interactive
            onAreaChanged={onAreaSearch}
            className="h-full w-full"
          />
          {areaBusy && (
            <span className="glass absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full px-3 py-1.5 text-xs text-white">
              <Spinner /> fetching this area…
            </span>
          )}
          <button
            onClick={() => setFull(false)}
            aria-label="Close map"
            className="absolute right-4 top-4 rounded-full bg-[#0B0907]/90 p-2.5 text-white shadow backdrop-blur"
          >
            <CloseIcon />
          </button>
          {highlighted && (
            <button
              onClick={() => {
                setFull(false);
                onOpen(highlighted);
              }}
              className="absolute inset-x-4 bottom-6 rounded-2xl bg-[#F2A23A] px-4 py-3 text-sm font-semibold text-black shadow"
            >
              Open {highlighted.name_en}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
