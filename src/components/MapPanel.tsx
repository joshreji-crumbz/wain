"use client";

import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Place } from "@/lib/types";

const icon = (active: boolean) =>
  L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:9999px;border:3px solid #100d0b;box-shadow:0 1px 6px rgba(0,0,0,.4);background:${
      active ? "#f59e0b" : "#a16207"
    }"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

/**
 * Venues inside the same mall share one entrance coordinate in the cached
 * export, so pins would stack. Fan duplicates out far enough to stay separate
 * tap targets at the initial zoom.
 */
function spread(places: Place[]): [number, number][] {
  const seen = new Map<string, number>();
  return places.map((p) => {
    const key = `${p.lat},${p.lng}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    if (n === 0) return [p.lat, p.lng];
    const angle = (n * 2 * Math.PI) / 6;
    return [p.lat + 0.0003 * Math.cos(angle), p.lng + 0.0003 * Math.sin(angle)];
  });
}

function Recenter({ place }: { place: Place | null }) {
  const map = useMap();
  useEffect(() => {
    if (place) map.flyTo([place.lat, place.lng], 17, { duration: 0.8 });
  }, [place, map]);
  return null;
}

export default function MapPanel({
  places,
  active,
  onSelect,
}: {
  places: Place[];
  active: Place | null;
  onSelect: (p: Place) => void;
}) {
  const center: [number, number] = [24.5003, 54.3868];
  const positions = spread(places);
  return (
    <MapContainer
      center={center}
      zoom={16}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <Recenter place={active} />
      {places.map((p, i) => (
        <Marker
          key={p.id}
          position={positions[i]}
          icon={icon(active?.id === p.id)}
          eventHandlers={{ click: () => onSelect(p) }}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">{p.names.en}</div>
              <div dir="rtl">{p.names.ar}</div>
              <div className="text-zinc-500">{p.area}</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
