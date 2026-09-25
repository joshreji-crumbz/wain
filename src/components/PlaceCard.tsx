"use client";

import type { Place } from "@/lib/types";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-[11px] text-zinc-600">
      {children}
    </span>
  );
}

export default function PlaceCard({
  place,
  distanceM,
  source,
}: {
  place: Place;
  distanceM?: number | null;
  source?: string;
}) {
  const tags = place.tags;
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-zinc-900">
            {place.names.en}
          </div>
          <div dir="rtl" className="text-lg text-zinc-700">
            {place.names.ar}
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            {place.area}
            {typeof distanceM === "number" ? ` · ${distanceM} m away` : ""} ·{" "}
            {place.hours}
          </div>
        </div>
        <a
          className="shrink-0 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white"
          href={
            place.links.maps ||
            `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=18/${place.lat}/${place.lng}`
          }
          target="_blank"
          rel="noreferrer"
        >
          Map
        </a>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.halal && <Chip>halal</Chip>}
        {tags.alcohol && <Chip>serves alcohol</Chip>}
        {tags.family_section && <Chip>family section · قسم عائلي</Chip>}
        {tags.suhoor && <Chip>open late · سحور</Chip>}
        {tags.iftar_deal && <Chip>iftar deal · عرض إفطار</Chip>}
        {tags.shisha && <Chip>shisha</Chip>}
        <Chip>up to {tags.max_group}</Chip>
        <Chip>{place.cuisine.join(", ")}</Chip>
        <Chip>{place.price_band}</Chip>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-zinc-400">
        <span>spellings:</span>
        {[place.names.en, place.names.ar, ...place.names.arabizi]
          .slice(0, 5)
          .map((n) => (
            <span key={n} className="rounded bg-zinc-100 px-1.5 py-0.5">
              {n}
            </span>
          ))}
      </div>

      {source && (
        <div className="mt-2 text-[11px] text-zinc-400">source: {source}</div>
      )}
    </div>
  );
}
