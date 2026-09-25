"use client";

import { useEffect, useRef, useState } from "react";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  seeded: boolean;
};

const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#17130f" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#A89F94" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0B0907" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a241e" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#7c7166" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0c1a24" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

let loader: Promise<void> | null = null;

/** The Maps JS bundle is ~300 kB, so load it once per page and share it. */
function loadMaps(key: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps?.Map) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise<void>((resolve, reject) => {
    // The callback param is what signals that the constructors are ready.
    const cb = "__wainMapsReady";
    (window as unknown as Record<string, () => void>)[cb] = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&v=weekly&libraries=geometry&callback=${cb}`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Maps failed to load"));
    document.head.appendChild(script);
  });
  return loader;
}

export default function GoogleMapView({
  center,
  markers,
  activeId,
  onSelect,
  interactive,
  onMapTap,
  onAreaChanged,
  className = "",
}: {
  center: { lat: number; lng: number };
  markers: MapMarker[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  /** false keeps page scrolling over the map (gestureHandling "none"). */
  interactive: boolean;
  onMapTap?: () => void;
  /** Fires after the user drags or zooms, with the new centre and view radius. */
  onAreaChanged?: (area: { lat: number; lng: number; radius_m: number }) => void;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const pins = useRef<google.maps.Marker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  // Keeping the callback in a ref lets the listener be attached once.
  const areaChanged = useRef(onAreaChanged);
  const moved = useRef(false);
  useEffect(() => {
    areaChanged.current = onAreaChanged;
  }, [onAreaChanged]);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? "";

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    loadMaps(apiKey)
      .then(() => {
        if (cancelled || !host.current || map.current) return;
        map.current = new google.maps.Map(host.current, {
          center,
          zoom: 15,
          disableDefaultUI: true,
          gestureHandling: interactive ? "greedy" : "none",
          styles: DARK_STYLE,
          clickableIcons: false,
        });
        setReady(true);

        // Only a gesture should trigger a refetch; programmatic panTo must not.
        map.current.addListener("dragstart", () => {
          moved.current = true;
        });
        map.current.addListener("zoom_changed", () => {
          moved.current = true;
        });
        map.current.addListener("idle", () => {
          if (!moved.current || !map.current) return;
          moved.current = false;
          const c = map.current.getCenter();
          const bounds = map.current.getBounds();
          if (!c || !bounds) return;
          const ne = bounds.getNorthEast();
          const radius = google.maps.geometry?.spherical
            ? google.maps.geometry.spherical.computeDistanceBetween(c, ne)
            : 1500;
          areaChanged.current?.({
            lat: c.lat(),
            lng: c.lng(),
            radius_m: Math.round(radius),
          });
        });
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
    // The map instance is created once; later prop changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  useEffect(() => {
    map.current?.setOptions({ gestureHandling: interactive ? "greedy" : "none" });
  }, [interactive]);

  useEffect(() => {
    map.current?.panTo({ lat: center.lat, lng: center.lng });
  }, [center.lat, center.lng]);

  useEffect(() => {
    if (!map.current || !ready) return;
    pins.current.forEach((m) => m.setMap(null));
    pins.current = markers.map((m) => {
      const active = m.id === activeId;
      const pin = new google.maps.Marker({
        map: map.current,
        position: { lat: m.lat, lng: m.lng },
        title: m.label,
        zIndex: active ? 10 : 1,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: active ? 10 : 7,
          fillColor: active ? "#F2A23A" : m.seeded ? "#c07c22" : "#A89F94",
          fillOpacity: 1,
          strokeColor: "#0B0907",
          strokeWeight: 2,
        },
      });
      pin.addListener("click", () => onSelect?.(m.id));
      return pin;
    });
  }, [markers, activeId, onSelect, ready]);

  return (
    <div className={`relative ${className}`}>
      <div ref={host} className="h-full w-full" />
      {!interactive && onMapTap && !error && (
        <button
          onClick={onMapTap}
          aria-label="Open full-screen map"
          className="absolute inset-0 h-full w-full cursor-pointer bg-transparent"
        />
      )}
      {(error || !apiKey) && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#15110e] px-6 text-center text-xs text-[#A89F94]">
          {error ?? "NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY is not set"}
        </div>
      )}
    </div>
  );
}
