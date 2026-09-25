"use client";

import { useState } from "react";
import type { LocalisedText } from "@/lib/types";
import { isRtl } from "./ui";

export default function ReelSheet({
  url,
  setUrl,
  transcript,
  setTranscript,
  onIngest,
  extraction,
  localised,
  busy,
  onClose,
}: {
  url: string;
  setUrl: (v: string) => void;
  transcript: string;
  setTranscript: (v: string) => void;
  onIngest: () => void;
  extraction: Record<string, unknown> | null;
  localised: LocalisedText | null;
  busy: boolean;
  onClose: () => void;
}) {
  const [showOriginal, setShowOriginal] = useState(false);
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
          Paste a reel URL and its transcript. WAIN extracts the place, dish and price, then shows
          it in your register.
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
          placeholder="Reel transcript (English, Khaleeji or Arabizi)…"
          className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm"
        />
        <button
          onClick={onIngest}
          disabled={!transcript.trim() || busy}
          className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-40"
        >
          Show it in my language
        </button>

        {extraction && (
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-3 text-[11px] text-zinc-300">
            {JSON.stringify(extraction, null, 2)}
          </pre>
        )}

        {localised && (
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
