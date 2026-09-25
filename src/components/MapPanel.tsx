"use client";

import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Place } from "@/lib/types";

const icon = (active: boolean) =>
  L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:9999px;border:3px solid white;box-shadow:0 1px 6px rgba(0,0,0,.4);background:${
      active ? "#e11d48" : "#0f766e"
    }"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

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
  return (
    <MapContainer
      center={center}
      zoom={16}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter place={active} />
      {places.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
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
