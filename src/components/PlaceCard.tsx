"use client";

import type { Place } from "@/lib/types";

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-300">
      {children}
    </span>
  );
}

function Action({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  const disabled = !href;
  return (
    <a
      href={href || undefined}
      target="_blank"
      rel="noreferrer"
      aria-disabled={disabled}
      className={`flex flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[11px] ${
        disabled
          ? "pointer-events-none border-white/5 text-zinc-600"
          : "border-white/10 bg-white/5 text-zinc-200 hover:border-amber-400/60"
      }`}
    >
      <span className="text-base leading-none">{icon}</span>
      {label}
    </a>
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
  const menuSource = place.menu.every((m) => m.source === "official menu")
    ? "official menu"
    : "sample menu";
  const maps =
    place.links.maps ||
    `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=18/${place.lat}/${place.lng}`;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-xl font-semibold text-zinc-50">{place.names.en}</div>
      <div dir="rtl" className="text-lg text-zinc-300">
        {place.names.ar}
      </div>
      <div className="mt-1 text-sm text-zinc-400">
        {place.area}
        {typeof distanceM === "number" ? ` · ${distanceM} m away` : ""}
        <span className="text-amber-400"> · {place.hours}</span>
      </div>

      <div className="mt-3 flex gap-2">
        <Action href={maps} icon="➤" label="Directions" />
        <Action href={place.links.website} icon="🍽" label="Menu" />
        <Action href={place.links.instagram} icon="◎" label="Instagram" />
        <Action href={place.links.website} icon="↗" label="Website" />
      </div>

      {place.menu.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
            What to try
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {place.menu.slice(0, 6).map((m) => (
              <div
                key={m.name_en}
                className="min-w-[8.5rem] rounded-xl border border-white/10 bg-white/5 p-2.5"
              >
                <div className="text-xs font-medium text-zinc-100">{m.name_en}</div>
                <div dir="rtl" className="text-[11px] text-zinc-400">
                  {m.name_ar}
                </div>
                <div className="mt-1 text-xs font-semibold text-amber-400">
                  AED {m.price_aed}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {tags.halal && <Chip>halal</Chip>}
        {tags.alcohol && <Chip>serves alcohol</Chip>}
        {tags.family_section && <Chip>family section · قسم عائلي</Chip>}
        {tags.suhoor && <Chip>open late · سحور</Chip>}
        {tags.iftar_deal && <Chip>iftar deal · عرض إفطار</Chip>}
        {tags.shisha && <Chip>shisha</Chip>}
        <Chip>up to {tags.max_group}</Chip>
        <Chip>{place.cuisine.join(", ")}</Chip>
        <Chip>{place.price_band}</Chip>
        <Chip>menu: {menuSource}</Chip>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-zinc-500">
        <span>spellings:</span>
        {[place.names.en, place.names.ar, ...place.names.arabizi]
          .slice(0, 5)
          .map((n) => (
            <span key={n} className="rounded bg-white/5 px-1.5 py-0.5">
              {n}
            </span>
          ))}
      </div>

      {source && <div className="mt-2 text-[11px] text-zinc-500">source: {source}</div>}
    </div>
  );
}
