"use client";

import { useState } from "react";
import type { LocalisedText, SearchResult } from "@/lib/types";
import { ChevronIcon } from "./icons";
import { Spinner, isRtl, metres } from "./ui";

/** Where an order link points, so the button can be named after the app. */
function platformOf(url: string): string {
  const h = url.match(/https?:\/\/(?:www\.)?([^/]+)/)?.[1] ?? "";
  const known = ["talabat", "deliveroo", "noon", "careem", "zomato", "smiles"].find((p) =>
    h.includes(p),
  );
  return known ? known[0].toUpperCase() + known.slice(1) : h;
}

export default function ReelSheet({
  url,
  setUrl,
  transcript,
  setTranscript,
  onIngest,
  fromWeb,
  hint,
  step,
  extraction,
  delivery,
  results,
  onOpen,
  localised,
  busy,
  onClose,
}: {
  url: string;
  setUrl: (v: string) => void;
  transcript: string;
  setTranscript: (v: string) => void;
  onIngest: () => void;
  fromWeb: boolean;
  /** Why a link couldn't be read, and what the user can send instead. */
  hint: string | null;
  /** What the lookup is doing right now, so a 40s wait isn't a dead screen. */
  step: string | null;
  extraction: Record<string, unknown> | null;
  /** Talabat/Deliveroo links the research actually printed. */
  delivery: string[];
  results: SearchResult[];
  onOpen: (r: SearchResult) => void;
  localised: LocalisedText | null;
  busy: boolean;
  onClose: () => void;
}) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const place = typeof extraction?.place_guess === "string" ? extraction.place_guess : "";
  const area = typeof extraction?.area === "string" ? extraction.area : "";
  const dish = typeof extraction?.dish === "string" ? extraction.dish : "";
  const mapsQuery = [place, area].filter(Boolean).join(" ");
  const body = localised
    ? showOriginal
      ? localised.original
      : localised.localised
    : "";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#100d0b] text-zinc-100">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold">Paste a reel</h2>
        <button onClick={onClose} className="text-sm text-zinc-400">
          ✕ Close
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <p className="text-sm text-zinc-400">
          Paste a reel link and WAIN looks it up on the web — creator, caption, place and dish —
          then finds that place near you. Add the transcript if you have it.
        </p>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.tiktok.com/…"
          className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 text-xs"
        />
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={5}
          dir={isRtl(transcript) ? "rtl" : "ltr"}
          placeholder="Optional: reel transcript (English, Khaleeji or Arabizi)…"
          className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm"
        />
        <button
          onClick={onIngest}
          disabled={(!transcript.trim() && !url.trim()) || busy}
          className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-40"
        >
          {fromWeb ? "Find this place" : "Show it in my language"}
        </button>

        {busy && step && (
          <p className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-zinc-300">
            <Spinner /> {step}
          </p>
        )}

        {place && !busy && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-sm font-semibold">{place}</p>
            <p className="mt-0.5 text-xs text-zinc-400">
              {[area, dish].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {mapsQuery && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/15 px-3 py-1 text-xs"
                >
                  Google Maps
                </a>
              )}
              {delivery.map((d) => (
                <a
                  key={d}
                  href={d}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-[#F2A23A]/40 bg-[#F2A23A]/10 px-3 py-1 text-xs text-[#F2A23A]"
                >
                  Order on {platformOf(d)}
                </a>
              ))}
            </div>
            {results.length > 0 && (
              <div className="mt-3 space-y-1">
                {results.slice(0, 4).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onOpen(r)}
                    className="flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-left text-xs"
                  >
                    <span className="truncate">
                      {r.name_en}
                      {r.distance_m !== null && (
                        <span className="text-zinc-400"> · {metres(r.distance_m)}</span>
                      )}
                    </span>
                    <ChevronIcon className="h-4 w-4 shrink-0 text-zinc-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {hint && (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
            {hint}
          </p>
        )}

        {(extraction || localised) && (
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="text-xs text-zinc-400 underline"
          >
            {showNotes ? "hide what the web said" : "what the web said"}
          </button>
        )}

        {showNotes && extraction && (
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-3 text-[11px] text-zinc-300">
            {JSON.stringify(extraction, null, 2)}
          </pre>
        )}

        {showNotes && localised && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                {showOriginal ? "original" : "localised"}
              </span>
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-zinc-400"
              >
                {showOriginal ? "show localised" : "show original"}
              </button>
            </div>
            <p dir={isRtl(body) ? "rtl" : "ltr"} className="text-sm leading-relaxed text-zinc-100">
              {body}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
              {localised.flags.halal === true && (
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-300">
                  halal
                </span>
              )}
              {localised.flags.alcohol && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-300">
                  alcohol
                </span>
              )}
              {localised.flags.pork && (
                <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-rose-300">pork</span>
              )}
              {localised.prices_aed.map((p) => (
                <span key={p} className="rounded-full bg-white/10 px-2 py-0.5 text-zinc-300">
                  {p} AED
                </span>
              ))}
            </div>
            {localised.dish_notes.length > 0 && (
              <ul className="mt-2 space-y-1 text-[11px] text-zinc-400">
                {localised.dish_notes.map((d) => (
                  <li key={d.dish}>
                    <b>{d.dish}</b> — {d.note}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
